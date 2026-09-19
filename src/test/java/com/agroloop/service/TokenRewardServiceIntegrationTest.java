package com.agroloop.service;

import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.WasteSubmissionRepository;
import com.agroloop.repository.WasteVerificationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.test.annotation.DirtiesContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("TokenRewardService Concurrent Integration Tests (Database-Backed)")
class TokenRewardServiceIntegrationTest {

    @Autowired
    private TokenRewardService tokenRewardService;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private PickupRequestRepository pickupRequestRepository;

    @Autowired
    private WasteVerificationRepository wasteVerificationRepository;

    @Autowired
    private EcoTokenTransactionRepository transactionRepository;

    private Household household;
    private Farmer farmer;
    private WasteSubmission wasteSubmission;
    private PickupRequest pickupRequest;
    private WasteVerification verification;

    @BeforeEach
    void setUp() {
        cleanup();

        household = householdRepository.save(new Household("Concurrent Alice", "concurrent.alice@example.com", "hash", "123 Eco Way"));
        farmer = farmerRepository.save(new Farmer("Concurrent Bob", "concurrent.bob@example.com", "hash", "Agro Farm", "456 Valley Rd", "Compost"));

        wasteSubmission = wasteSubmissionRepository.save(household.submitWaste(WasteCategory.COFFEE_GROUNDS, new BigDecimal("5.00"), "123 Eco Way", null, "Clean coffee"));

        pickupRequest = new PickupRequest(wasteSubmission);
        pickupRequest.accept(farmer);
        pickupRequest.schedule(LocalDateTime.now().plusDays(1));
        pickupRequest.markCollected();
        pickupRequest = pickupRequestRepository.save(pickupRequest);

        verification = new WasteVerification(pickupRequest, farmer, new BigDecimal("5.00"), QualityGrade.GRADE_A, "Clean batch");
        pickupRequest.recordVerification(verification);
        verification = wasteVerificationRepository.save(verification);
        pickupRequestRepository.save(pickupRequest);
    }

    @AfterEach
    void tearDown() {
        cleanup();
    }

    private void cleanup() {
        transactionRepository.deleteAll();
        wasteVerificationRepository.deleteAll();
        pickupRequestRepository.deleteAll();
        wasteSubmissionRepository.deleteAll();

        householdRepository.findAll().stream()
                .filter(h -> !"household@agroloop.com".equals(h.getEmail()))
                .forEach(householdRepository::delete);

        farmerRepository.findAll().stream()
                .filter(f -> !"farmer@agroloop.com".equals(f.getEmail()))
                .forEach(farmerRepository::delete);
    }

    @Test
    @DisplayName("Concurrent reward minting: Two parallel threads mint for the same verification, asserting exactly one ledger row and one balance credit")
    void concurrentRewardMinting_threadSafetyAndIdempotency() throws Exception {
        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        List<EcoTokenTransaction> results = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // wait for synchronized simultaneous start
                    EcoTokenTransaction tx = tokenRewardService.mintRewardForVerification(verification);
                    results.add(tx);
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // trigger both threads simultaneously
        boolean completed = finishLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(true, completed, "Both threads should complete within timeout");
        assertEquals(0, errors.size(), "No threads should have failed with unhandled exceptions: " + errors);
        assertEquals(2, results.size(), "Both calls should return a valid EcoTokenTransaction");

        // Assert database-level idempotency and ledger integrity
        List<EcoTokenTransaction> persistedTransactions = transactionRepository.findByHouseholdIdOrderByCreatedAtDesc(household.getId());
        assertEquals(1, persistedTransactions.size(), "Exactly one EcoTokenTransaction must be persisted in database");

        EcoTokenTransaction persisted = persistedTransactions.get(0);
        assertEquals(new BigDecimal("9.00"), persisted.getAmount());
        assertEquals(new BigDecimal("9.00"), persisted.getBalanceAfter());

        // Assert household balance was credited exactly once (9.00, not double-credited 18.00)
        Household refreshedHousehold = householdRepository.findById(household.getId()).orElseThrow();
        assertEquals(new BigDecimal("9.00"), refreshedHousehold.getTokenBalance(), "Household wallet balance must be credited exactly once");
    }

    @Test
    @DisplayName("Concurrent reward minting with distinct verifications: Household pessimistic write lock prevents lost-update balance anomalies")
    void concurrentRewardMinting_twoDistinctVerifications_pessimisticLockPreventsLostUpdates() throws Exception {
        // Set up a second distinct waste submission and verification for the same household
        WasteSubmission submission2 = wasteSubmissionRepository.save(
                household.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("5.00"), "123 Eco Way", null, "Fresh food scraps")
        );
        PickupRequest pickupRequest2 = new PickupRequest(submission2);
        pickupRequest2.accept(farmer);
        pickupRequest2.schedule(LocalDateTime.now().plusDays(1));
        pickupRequest2.markCollected();
        pickupRequest2 = pickupRequestRepository.save(pickupRequest2);

        WasteVerification verification2 = new WasteVerification(pickupRequest2, farmer, new BigDecimal("5.00"), QualityGrade.GRADE_A, "Clean veggies");
        pickupRequest2.recordVerification(verification2);
        verification2 = wasteVerificationRepository.save(verification2);
        pickupRequestRepository.save(pickupRequest2);

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        List<EcoTokenTransaction> results = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        WasteVerification finalVerification2 = verification2;

        executor.submit(() -> {
            try {
                startLatch.await();
                EcoTokenTransaction tx1 = tokenRewardService.mintRewardForVerification(verification);
                results.add(tx1);
            } catch (Throwable t) {
                errors.add(t);
            } finally {
                finishLatch.countDown();
            }
        });

        executor.submit(() -> {
            try {
                startLatch.await();
                EcoTokenTransaction tx2 = tokenRewardService.mintRewardForVerification(finalVerification2);
                results.add(tx2);
            } catch (Throwable t) {
                errors.add(t);
            } finally {
                finishLatch.countDown();
            }
        });

        startLatch.countDown(); // start both threads simultaneously
        boolean completed = finishLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(true, completed, "Both threads should complete within timeout");
        assertEquals(0, errors.size(), "No exceptions should occur during concurrent minting: " + errors);
        assertEquals(2, results.size(), "Both verifications should yield successful transactions");

        // Verification 1: 5.00kg * 1.5 (Coffee) * 1.2 (Grade A) = 9.00 tokens
        // Verification 2: 5.00kg * 1.0 (Vegetable) * 1.2 (Grade A) = 6.00 tokens
        // Sum = 15.00 tokens

        List<EcoTokenTransaction> persistedTransactions = transactionRepository.findByHouseholdIdOrderByCreatedAtDesc(household.getId());
        assertEquals(2, persistedTransactions.size(), "Both distinct transactions must be persisted in ledger");

        // Assert household balance has no lost update: must equal sum of both rewards (15.00)
        Household refreshedHousehold = householdRepository.findById(household.getId()).orElseThrow();
        assertEquals(new BigDecimal("15.00"), refreshedHousehold.getTokenBalance(),
                "Household balance must reflect both rewards without lost-update race condition");
    }
}
