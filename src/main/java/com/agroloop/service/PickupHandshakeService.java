package com.agroloop.service;

import com.agroloop.dto.api.v1.request.VerifyPickupHandshakeApiRequest;
import com.agroloop.dto.api.v1.response.CompactQrPayload;
import com.agroloop.dto.api.v1.response.PickupHandshakePassResponse;
import com.agroloop.dto.api.v1.response.PickupHandshakeResultApiResponse;
import com.agroloop.exception.HandshakeAlreadyConsumedException;
import com.agroloop.exception.InvalidHandshakeException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.*;
import com.agroloop.repository.PickupHandshakeRepository;
import com.agroloop.repository.PickupRequestRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class PickupHandshakeService {

    private final PickupRequestRepository pickupRequestRepository;
    private final PickupHandshakeRepository pickupHandshakeRepository;
    private final PickupHandshakeCanonicalizer canonicalizer;
    private final SecureRandom secureRandom = new SecureRandom();

    public PickupHandshakeService(
            PickupRequestRepository pickupRequestRepository,
            PickupHandshakeRepository pickupHandshakeRepository,
            PickupHandshakeCanonicalizer canonicalizer
    ) {
        this.pickupRequestRepository = pickupRequestRepository;
        this.pickupHandshakeRepository = pickupHandshakeRepository;
        this.canonicalizer = canonicalizer;
    }

    /**
     * Issues a cryptographically signed physical handshake pass for an active pickup.
     * Transactionally invalidates any prior unconsumed pass for this pickup.
     */
    @Transactional
    public PickupHandshakePassResponse issueHandshakePass(Long pickupId, Long householdUserId) {
        PickupRequest pickup = pickupRequestRepository.findById(pickupId)
                .orElseThrow(() -> new ResourceNotFoundException("Pickup request not found: " + pickupId));

        Household household = pickup.getWasteSubmission().getHousehold();
        if (!household.getId().equals(householdUserId)) {
            throw new AccessDeniedException("Household does not own this pickup request");
        }

        if (pickup.getStatus() != PickupStatus.ASSIGNED && pickup.getStatus() != PickupStatus.SCHEDULED) {
            throw new IllegalStateException("Handshake pass can only be issued for ASSIGNED or SCHEDULED pickups. Current status: " + pickup.getStatus());
        }

        Instant now = Instant.now();
        // Invalidate any existing ISSUED passes transactionally
        pickupHandshakeRepository.invalidateActivePassesForPickup(pickupId, now);

        String nonce = UUID.randomUUID().toString();
        String passCode = generateRandomPassCode();
        String passCodeHash = canonicalizer.hashPassCode(passCode);
        Instant expiresAt = now.plus(Duration.ofMinutes(30));

        Long submissionId = pickup.getWasteSubmission().getId();
        String canonicalPayload = canonicalizer.canonicalize(
                pickupId,
                household.getId(),
                submissionId,
                now.toEpochMilli(),
                expiresAt.toEpochMilli(),
                nonce,
                passCode
        );
        String signature = canonicalizer.sign(canonicalPayload);

        PickupHandshake handshake = new PickupHandshake(
                pickup,
                household,
                nonce,
                passCodeHash,
                now,
                expiresAt,
                signature
        );
        pickupHandshakeRepository.save(handshake);

        return PickupHandshakePassResponse.of(
                pickupId,
                household.getId(),
                submissionId,
                now,
                expiresAt,
                nonce,
                passCode,
                signature
        );
    }

    /**
     * Authoritatively verifies and consumes an on-site physical handshake within a single database transaction.
     * Enforces strict farmer assignment, tripartite IDOR agreement, replay protection, and rate limiting.
     */
    @Transactional(noRollbackFor = InvalidHandshakeException.class)
    public PickupHandshakeResultApiResponse verifyAndConsumeHandshake(
            Long pickupId,
            Long farmerUserId,
            VerifyPickupHandshakeApiRequest request
    ) {
        Objects.requireNonNull(request, "Handshake verification request cannot be null");
        Objects.requireNonNull(request.method(), "Verification method cannot be null");

        PickupRequest pickup = pickupRequestRepository.findById(pickupId)
                .orElseThrow(() -> new ResourceNotFoundException("Pickup request not found: " + pickupId));

        Farmer assignedFarmer = pickup.getAssignedFarmer();
        if (assignedFarmer == null || !assignedFarmer.getId().equals(farmerUserId)) {
            throw new AccessDeniedException("Farmer is not authorized or assigned to verify this pickup request");
        }

        if (pickup.getStatus() != PickupStatus.ASSIGNED && pickup.getStatus() != PickupStatus.SCHEDULED) {
            throw new IllegalStateException("Pickup cannot be verified in current status: " + pickup.getStatus());
        }

        PickupHandshake handshake;

        if (request.method() == HandshakeVerificationMethod.QR_SCAN) {
            CompactQrPayload payload = request.payload();
            if (payload == null || payload.n() == null || payload.n().isBlank()) {
                throw new InvalidHandshakeException("QR payload with nonce is required for QR_SCAN verification");
            }

            // Tripartite IDOR check: endpoint path ID == signed payload pickup ID
            if (payload.p() == null || !payload.p().equals(pickupId)) {
                throw new InvalidHandshakeException("Payload pickup ID does not match endpoint pickup ID");
            }

            // Nonce-based row lookup with pessimistic lock
            handshake = pickupHandshakeRepository.findByNonceForUpdate(payload.n())
                    .orElseThrow(() -> new InvalidHandshakeException("Invalid handshake credential"));

            // Tripartite IDOR check: database handshake pickup ID == endpoint path ID
            if (!handshake.getPickup().getId().equals(pickupId)) {
                throw new InvalidHandshakeException("Handshake record belongs to different pickup");
            }

            // Status checks
            if (handshake.getStatus() == PickupHandshakeStatus.CONSUMED) {
                throw new HandshakeAlreadyConsumedException("Handshake pass has already been consumed");
            }
            if (handshake.getStatus() == PickupHandshakeStatus.INVALIDATED) {
                throw new InvalidHandshakeException("Handshake pass is invalid or has been replaced");
            }
            if (handshake.getStatus() == PickupHandshakeStatus.EXPIRED) {
                throw new InvalidHandshakeException("Handshake pass has expired");
            }

            // Expiry check with explicit state transition
            if (Instant.now().isAfter(handshake.getExpiresAt())) {
                handshake.markExpired();
                throw new InvalidHandshakeException("Handshake pass has expired");
            }

            // Signature verification using canonical server representation
            String canonicalPayload = canonicalizer.canonicalize(handshake, payload.c());
            if (!canonicalizer.verify(canonicalPayload, payload.sig())) {
                throw new InvalidHandshakeException("Invalid cryptographic handshake signature");
            }

            if (!canonicalizer.verifyPassCode(payload.c(), handshake.getPassCodeHash())) {
                throw new InvalidHandshakeException("Pass code mismatch on QR credential");
            }

            handshake.markConsumed(assignedFarmer, HandshakeVerificationMethod.QR_SCAN);

        } else if (request.method() == HandshakeVerificationMethod.MANUAL_PASSCODE) {
            String passCode = request.passCode();
            if (passCode == null || passCode.isBlank()) {
                throw new InvalidHandshakeException("Pass code is required for MANUAL_PASSCODE verification");
            }

            String normalized = passCode.trim().toUpperCase();

            // Lock current active ISSUED handshake by pickupId
            handshake = pickupHandshakeRepository.findFirstByPickupIdAndStatusOrderByIssuedAtDesc(
                    pickupId,
                    PickupHandshakeStatus.ISSUED
            ).orElseThrow(() -> new InvalidHandshakeException("Invalid or non-existent active handshake pass"));

            // Expiry check with explicit state transition
            if (Instant.now().isAfter(handshake.getExpiresAt())) {
                handshake.markExpired();
                pickupHandshakeRepository.saveAndFlush(handshake);
                throw new InvalidHandshakeException("Handshake pass has expired");
            }

            // Constant-time pass code verification with brute-force rate-limiting
            boolean matches = canonicalizer.verifyPassCode(normalized, handshake.getPassCodeHash());
            if (!matches) {
                handshake.incrementFailedAttempts();
                pickupHandshakeRepository.saveAndFlush(handshake);
                throw new InvalidHandshakeException("Invalid handshake pass code");
            }

            handshake.markConsumed(assignedFarmer, HandshakeVerificationMethod.MANUAL_PASSCODE);

        } else {
            throw new InvalidHandshakeException("Unsupported verification method: " + request.method());
        }

        pickup.setLatestHandshakeId(handshake.getId());

        return PickupHandshakeResultApiResponse.of(
                handshake.getId(),
                pickupId,
                handshake.getHousehold().getId(),
                assignedFarmer.getId(),
                handshake.getVerificationMethod(),
                handshake.getConsumedAt()
        );
    }

    /**
     * Evaluates whether a pickup request has a verified on-site handshake.
     */
    @Transactional(readOnly = true)
    public boolean isHandshakeVerified(PickupRequest pickup) {
        if (pickup == null || pickup.getLatestHandshakeId() == null) {
            return false;
        }
        return pickupHandshakeRepository.findById(pickup.getLatestHandshakeId())
                .map(h -> h.getStatus() == PickupHandshakeStatus.CONSUMED)
                .orElse(false);
    }

    /**
     * Gets the latest handshake for a pickup request if one exists.
     */
    @Transactional(readOnly = true)
    public Optional<PickupHandshake> getLatestHandshake(Long pickupId) {
        return pickupHandshakeRepository.findFirstByPickupIdOrderByIssuedAtDesc(pickupId);
    }

    private String generateRandomPassCode() {
        int part1 = 1000 + secureRandom.nextInt(9000);
        int part2 = 1000 + secureRandom.nextInt(9000);
        return "ECO-" + part1 + "-" + part2;
    }
}
