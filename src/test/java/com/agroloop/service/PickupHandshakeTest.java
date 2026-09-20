package com.agroloop.service;

import com.agroloop.dto.api.v1.request.VerifyPickupHandshakeApiRequest;
import com.agroloop.dto.api.v1.response.CompactQrPayload;
import com.agroloop.dto.api.v1.response.PickupHandshakePassResponse;
import com.agroloop.dto.api.v1.response.PickupHandshakeResultApiResponse;
import com.agroloop.exception.HandshakeAlreadyConsumedException;
import com.agroloop.exception.InvalidHandshakeException;
import com.agroloop.model.*;
import com.agroloop.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.test.annotation.DirtiesContext;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PickupHandshakeTest {

    @Autowired
    private PickupHandshakeService handshakeService;

    @Autowired
    private PickupHandshakeRepository handshakeRepository;

    @Autowired
    private PickupRequestRepository pickupRequestRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private PickupHandshakeCanonicalizer canonicalizer;

    private Household testHousehold;
    private Farmer testFarmer;
    private Farmer unauthorizedFarmer;
    private PickupRequest activePickup;
    private WasteSubmission wasteSubmission;

    @BeforeEach
    void setUp() {
        handshakeRepository.deleteAll();
        pickupRequestRepository.deleteAll();
        wasteSubmissionRepository.deleteAll();

        String unique = String.valueOf(System.currentTimeMillis());

        testHousehold = new Household("Handshake Household " + unique, "hh_" + unique + "@agroloop.com", "pass123", "123 Eco Way");
        testHousehold = householdRepository.save(testHousehold);

        testFarmer = new Farmer("Farmer John " + unique, "farmer_" + unique + "@agroloop.com", "pass123", "Farmstead Alpha", "123 Farm Rd", "10 Organic Acres");
        testFarmer = farmerRepository.save(testFarmer);

        unauthorizedFarmer = new Farmer("Farmer Mallory " + unique, "mallory_" + unique + "@agroloop.com", "pass123", "Farmstead Beta", "456 Farm Rd", "5 Acres");
        unauthorizedFarmer = farmerRepository.save(unauthorizedFarmer);

        wasteSubmission = new WasteSubmission(
                testHousehold,
                WasteCategory.FOOD_SCRAPS,
                new BigDecimal("12.50"),
                "123 Eco Way",
                "uploads/test.jpg",
                "Kitchen organics"
        );
        wasteSubmission = wasteSubmissionRepository.save(wasteSubmission);

        activePickup = new PickupRequest(wasteSubmission);
        activePickup.accept(testFarmer);
        activePickup.schedule(LocalDateTime.now().plusDays(2));
        activePickup = pickupRequestRepository.save(activePickup);
    }

    @Test
    @DisplayName("Should successfully issue signed pass with deterministic canonical HMAC signature and compact payload")
    void testIssueHandshakePassSuccess() {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());

        assertThat(pass).isNotNull();
        assertThat(pass.pickupId()).isEqualTo(activePickup.getId());
        assertThat(pass.householdId()).isEqualTo(testHousehold.getId());
        assertThat(pass.nonce()).isNotBlank();
        assertThat(pass.passCode()).startsWith("ECO-");
        assertThat(pass.signature()).hasSize(64);

        // Verify compact QR payload representation
        CompactQrPayload compact = pass.compactQr();
        assertThat(compact).isNotNull();
        assertThat(compact.t()).isEqualTo("AGROLOOP_PICKUP_HANDSHAKE");
        assertThat(compact.p()).isEqualTo(activePickup.getId());
        assertThat(compact.h()).isEqualTo(testHousehold.getId());
        assertThat(compact.n()).isEqualTo(pass.nonce());
        assertThat(compact.c()).isEqualTo(pass.passCode());
        assertThat(compact.sig()).isEqualTo(pass.signature());

        // Verify database persistence
        PickupHandshake saved = handshakeRepository.findByNonce(pass.nonce()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(PickupHandshakeStatus.ISSUED);
        assertThat(saved.getFailedAttempts()).isZero();
        assertThat(saved.getPassCodeHash()).isEqualTo(canonicalizer.hashPassCode(pass.passCode()));
    }

    @Test
    @DisplayName("Should reject pass issuance for pickups in REQUESTED or COLLECTED lifecycle states")
    void testRejectPassIssuanceForInvalidStatus() {
        WasteSubmission unassignedSub = wasteSubmissionRepository.save(new WasteSubmission(
                testHousehold, WasteCategory.GARDEN_WASTE, new BigDecimal("5.0"), "123 Eco Way", "uploads/leaves.jpg", "Leaves"
        ));
        PickupRequest unassignedPickup = pickupRequestRepository.save(new PickupRequest(unassignedSub));

        assertThatThrownBy(() -> handshakeService.issueHandshakePass(unassignedPickup.getId(), testHousehold.getId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Handshake pass can only be issued for ASSIGNED or SCHEDULED pickups");
    }

    @Test
    @DisplayName("Issuing a replacement pass should transactionally invalidate prior unconsumed passes")
    void testReplacementPassInvalidatesPriorPasses() {
        PickupHandshakePassResponse firstPass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());
        PickupHandshakePassResponse secondPass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());

        assertThat(firstPass.nonce()).isNotEqualTo(secondPass.nonce());

        PickupHandshake firstEntity = handshakeRepository.findByNonce(firstPass.nonce()).orElseThrow();
        PickupHandshake secondEntity = handshakeRepository.findByNonce(secondPass.nonce()).orElseThrow();

        assertThat(firstEntity.getStatus()).isEqualTo(PickupHandshakeStatus.INVALIDATED);
        assertThat(firstEntity.getInvalidatedAt()).isNotNull();
        assertThat(secondEntity.getStatus()).isEqualTo(PickupHandshakeStatus.ISSUED);
    }

    @Test
    @DisplayName("QR Verification: successfully consumes active pass and records atomic audit state")
    void testQrVerificationSuccess() {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());

        VerifyPickupHandshakeApiRequest req = VerifyPickupHandshakeApiRequest.forQr(pass.compactQr());
        PickupHandshakeResultApiResponse result = handshakeService.verifyAndConsumeHandshake(activePickup.getId(), testFarmer.getId(), req);

        assertThat(result.verified()).isTrue();
        assertThat(result.pickupId()).isEqualTo(activePickup.getId());
        assertThat(result.farmerId()).isEqualTo(testFarmer.getId());
        assertThat(result.method()).isEqualTo(HandshakeVerificationMethod.QR_SCAN);
        assertThat(result.verifiedAt()).isNotNull();

        PickupHandshake consumed = handshakeRepository.findByNonce(pass.nonce()).orElseThrow();
        assertThat(consumed.getStatus()).isEqualTo(PickupHandshakeStatus.CONSUMED);
        assertThat(consumed.getConsumedAt()).isNotNull();
        assertThat(consumed.getFarmer().getId()).isEqualTo(testFarmer.getId());
    }

    @Test
    @DisplayName("QR Verification: rejects duplicate verification attempt with HandshakeAlreadyConsumedException")
    void testQrVerificationReplayProtection() {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());
        VerifyPickupHandshakeApiRequest req = VerifyPickupHandshakeApiRequest.forQr(pass.compactQr());

        handshakeService.verifyAndConsumeHandshake(activePickup.getId(), testFarmer.getId(), req);

        assertThatThrownBy(() -> handshakeService.verifyAndConsumeHandshake(activePickup.getId(), testFarmer.getId(), req))
                .isInstanceOf(HandshakeAlreadyConsumedException.class)
                .hasMessageContaining("Handshake pass has already been consumed");
    }

    @Test
    @DisplayName("QR Verification: rejects mismatched tripartite IDOR pickup IDs")
    void testQrVerificationTripartiteIdorRejection() {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());

        CompactQrPayload forgedPayload = new CompactQrPayload(
                pass.compactQr().t(),
                pass.compactQr().v(),
                99999L, // Tampered pickup ID
                pass.compactQr().h(),
                pass.compactQr().s(),
                pass.compactQr().iat(),
                pass.compactQr().exp(),
                pass.compactQr().n(),
                pass.compactQr().c(),
                pass.compactQr().sig()
        );

        assertThatThrownBy(() -> handshakeService.verifyAndConsumeHandshake(activePickup.getId(), testFarmer.getId(), VerifyPickupHandshakeApiRequest.forQr(forgedPayload)))
                .isInstanceOf(InvalidHandshakeException.class)
                .hasMessageContaining("Payload pickup ID does not match endpoint pickup ID");
    }

    @Test
    @DisplayName("QR Verification: rejects tampered HMAC cryptographic signature")
    void testQrVerificationTamperedSignatureRejection() {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());

        CompactQrPayload tamperedPayload = new CompactQrPayload(
                pass.compactQr().t(),
                pass.compactQr().v(),
                pass.compactQr().p(),
                pass.compactQr().h(),
                pass.compactQr().s(),
                pass.compactQr().iat(),
                pass.compactQr().exp(),
                pass.compactQr().n(),
                pass.compactQr().c(),
                "bad0000000000000000000000000000000000000000000000000000000000bad" // Invalid signature
        );

        assertThatThrownBy(() -> handshakeService.verifyAndConsumeHandshake(activePickup.getId(), testFarmer.getId(), VerifyPickupHandshakeApiRequest.forQr(tamperedPayload)))
                .isInstanceOf(InvalidHandshakeException.class)
                .hasMessageContaining("Invalid cryptographic handshake signature");
    }

    @Test
    @DisplayName("Manual Passcode: successfully verifies and consumes active pass")
    void testManualPassCodeVerificationSuccess() {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());

        VerifyPickupHandshakeApiRequest req = VerifyPickupHandshakeApiRequest.forPassCode(pass.passCode().toLowerCase()); // Case-insensitive
        PickupHandshakeResultApiResponse result = handshakeService.verifyAndConsumeHandshake(activePickup.getId(), testFarmer.getId(), req);

        assertThat(result.verified()).isTrue();
        assertThat(result.method()).isEqualTo(HandshakeVerificationMethod.MANUAL_PASSCODE);

        PickupHandshake consumed = handshakeRepository.findByNonce(pass.nonce()).orElseThrow();
        assertThat(consumed.getStatus()).isEqualTo(PickupHandshakeStatus.CONSUMED);
    }

    @Test
    @DisplayName("Manual Passcode: rate limits failed attempts and transitions to INVALIDATED after 5 failures")
    void testManualPassCodeBruteForceRateLimiting() {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());

        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> handshakeService.verifyAndConsumeHandshake(
                    activePickup.getId(), testFarmer.getId(), VerifyPickupHandshakeApiRequest.forPassCode("ECO-0000-0000")
            )).isInstanceOf(InvalidHandshakeException.class)
                    .hasMessageContaining("Invalid handshake pass code");
        }

        PickupHandshake active = handshakeRepository.findByNonce(pass.nonce()).orElseThrow();
        assertThat(active.getFailedAttempts()).isEqualTo(4);
        assertThat(active.getStatus()).isEqualTo(PickupHandshakeStatus.ISSUED);

        // 5th attempt invalidates
        assertThatThrownBy(() -> handshakeService.verifyAndConsumeHandshake(
                activePickup.getId(), testFarmer.getId(), VerifyPickupHandshakeApiRequest.forPassCode("ECO-0000-0000")
        )).isInstanceOf(InvalidHandshakeException.class);

        PickupHandshake locked = handshakeRepository.findByNonce(pass.nonce()).orElseThrow();
        assertThat(locked.getStatus()).isEqualTo(PickupHandshakeStatus.INVALIDATED);
    }

    @Test
    @DisplayName("Strict Farmer Authorization: rejects unauthorized farmer attempting verification")
    void testUnauthorizedFarmerRejection() {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());

        assertThatThrownBy(() -> handshakeService.verifyAndConsumeHandshake(
                activePickup.getId(), unauthorizedFarmer.getId(), VerifyPickupHandshakeApiRequest.forQr(pass.compactQr())
        )).isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Farmer is not authorized or assigned to verify this pickup request");
    }

    @Test
    @DisplayName("Multi-threaded Concurrency: exactly 1 thread consumes pass and concurrent thread throws domain exception")
    void testConcurrentVerificationRaceCondition() throws Exception {
        PickupHandshakePassResponse pass = handshakeService.issueHandshakePass(activePickup.getId(), testHousehold.getId());
        VerifyPickupHandshakeApiRequest req = VerifyPickupHandshakeApiRequest.forQr(pass.compactQr());

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startBarrier = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger consumedConflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startBarrier.await();
                    handshakeService.verifyAndConsumeHandshake(activePickup.getId(), testFarmer.getId(), req);
                    successCount.incrementAndGet();
                } catch (HandshakeAlreadyConsumedException | InvalidHandshakeException e) {
                    consumedConflictCount.incrementAndGet();
                } catch (Exception e) {
                    // Transaction collision / optimistic or pessimistic lock exception
                    consumedConflictCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Trigger simultaneous execution
        startBarrier.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(consumedConflictCount.get()).isEqualTo(1);

        // Verify exactly one CONSUMED record exists
        PickupHandshake finalState = handshakeRepository.findByNonce(pass.nonce()).orElseThrow();
        assertThat(finalState.getStatus()).isEqualTo(PickupHandshakeStatus.CONSUMED);
    }
}
