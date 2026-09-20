package com.agroloop.service;

import com.agroloop.model.PickupHandshake;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Objects;

/**
 * Authoritative cryptographic canonicalizer and signature verifier for pickup handshakes.
 * Guarantees consistent deterministic payload string serialization, HMAC-SHA256 signing,
 * and constant-time signature verification.
 */
@Component
public class PickupHandshakeCanonicalizer {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private final byte[] secretKeyBytes;

    public PickupHandshakeCanonicalizer(
            @Value("${agroloop.handshake.hmac-secret:agroloop-authoritative-server-secret-key-32bytes}") String secretKey
    ) {
        this.secretKeyBytes = Objects.requireNonNull(secretKey, "HMAC secret key cannot be null")
                .getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Builds canonical message:
     * v1|pickupId|householdId|submissionId|issuedAt|expiresAt|nonce|passCode
     */
    public String canonicalize(
            Long pickupId,
            Long householdId,
            Long submissionId,
            long issuedAtEpochMilli,
            long expiresAtEpochMilli,
            String nonce,
            String passCode
    ) {
        return "v1|"
                + (pickupId != null ? pickupId : "") + "|"
                + (householdId != null ? householdId : "") + "|"
                + (submissionId != null ? submissionId : "") + "|"
                + issuedAtEpochMilli + "|"
                + expiresAtEpochMilli + "|"
                + (nonce != null ? nonce : "") + "|"
                + (passCode != null ? passCode : "");
    }

    public String canonicalize(PickupHandshake handshake, String passCode) {
        Long submissionId = null;
        if (handshake.getPickup() != null && handshake.getPickup().getWasteSubmission() != null) {
            submissionId = handshake.getPickup().getWasteSubmission().getId();
        }
        return canonicalize(
                handshake.getPickup().getId(),
                handshake.getHousehold().getId(),
                submissionId,
                handshake.getIssuedAt().toEpochMilli(),
                handshake.getExpiresAt().toEpochMilli(),
                handshake.getNonce(),
                passCode
        );
    }

    /**
     * Computes HMAC-SHA256 hex signature over the canonical payload.
     */
    public String sign(String canonicalPayload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(this.secretKeyBytes, HMAC_ALGORITHM));
            byte[] rawHmac = mac.doFinal(canonicalPayload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(rawHmac);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate HMAC-SHA256 signature", e);
        }
    }

    /**
     * Constant-time comparison to prevent timing side-channel attacks.
     */
    public boolean verify(String canonicalPayload, String suppliedSignature) {
        if (suppliedSignature == null || suppliedSignature.isBlank()) {
            return false;
        }
        String expectedSignature = sign(canonicalPayload);
        return MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                suppliedSignature.trim().getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Hashes human passcode with SHA-256 for secure storage in the database.
     */
    public String hashPassCode(String normalizedPassCode) {
        if (normalizedPassCode == null) return "";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(normalizedPassCode.trim().toUpperCase().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    /**
     * Constant-time comparison of pass code hashes.
     */
    public boolean verifyPassCode(String normalizedInputCode, String storedHash) {
        if (normalizedInputCode == null || storedHash == null) {
            return false;
        }
        String inputHash = hashPassCode(normalizedInputCode);
        return MessageDigest.isEqual(
                inputHash.getBytes(StandardCharsets.UTF_8),
                storedHash.trim().getBytes(StandardCharsets.UTF_8)
        );
    }
}
