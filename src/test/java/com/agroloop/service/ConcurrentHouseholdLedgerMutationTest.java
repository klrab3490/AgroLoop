package com.agroloop.service;

import com.agroloop.dto.SolvencyMetricsDto;
import com.agroloop.model.Admin;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Household;
import com.agroloop.model.TransactionDirection;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.HouseholdRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Concurrent Household Ledger Mutation & Reconciliation Integration Tests")
class ConcurrentHouseholdLedgerMutationTest {

    @Autowired
    private AdminGovernanceService adminGovernanceService;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private EcoTokenTransactionRepository ecoTokenTransactionRepository;

    private Household household;
    private Admin admin;

    @BeforeEach
    void setUp() {
        tearDown();

        admin = adminRepository.save(new Admin("Admin George", "george.admin@agroloop.com", "hash"));

        household = new Household("Eva Green", "eva.green@example.com", "hash", "770 Pinewood");
        household.addTokens(new BigDecimal("100.00"));
        household = householdRepository.save(household);
    }

    @AfterEach
    void tearDown() {
        ecoTokenTransactionRepository.deleteAll();

        householdRepository.findAll().stream()
                .filter(h -> !"household@agroloop.com".equals(h.getEmail()))
                .forEach(householdRepository::delete);

        adminRepository.findAll().stream()
                .filter(a -> !"admin@agroloop.com".equals(a.getEmail()))
                .forEach(adminRepository::delete);
    }

    @Test
    @DisplayName("Concurrent Credits & Debits preserve Tier-1 running balance in id ASC and Tier-2 solvency")
    void testConcurrentLedgerMutationsAndReconciliation() throws InterruptedException {
        int creditTasks = 10;
        int debitTasks = 5;
        int totalTasks = creditTasks + debitTasks;

        ExecutorService executor = Executors.newFixedThreadPool(totalTasks);
        CountDownLatch readyLatch = new CountDownLatch(totalTasks);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        List<Throwable> exceptions = Collections.synchronizedList(new ArrayList<>());

        // Submit 10 credit tasks (+10.00 each)
        for (int i = 0; i < creditTasks; i++) {
            final int index = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    adminGovernanceService.adjustTokens(
                            household.getId(),
                            new BigDecimal("10.00"),
                            TransactionDirection.CREDIT,
                            "Concurrent credit #" + index,
                            admin.getEmail()
                    );
                    successCount.incrementAndGet();
                } catch (Throwable t) {
                    exceptions.add(t);
                }
            });
        }

        // Submit 5 debit tasks (-10.00 each)
        for (int i = 0; i < debitTasks; i++) {
            final int index = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    adminGovernanceService.adjustTokens(
                            household.getId(),
                            new BigDecimal("10.00"),
                            TransactionDirection.DEBIT,
                            "Concurrent debit #" + index,
                            admin.getEmail()
                    );
                    successCount.incrementAndGet();
                } catch (Throwable t) {
                    exceptions.add(t);
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));

        assertEquals(totalTasks, successCount.get(), "All adjustment tasks should complete successfully: " + exceptions);

        // Expected balance: 100.00 + (10 * 10.00) - (5 * 10.00) = 150.00
        Household reloaded = householdRepository.findById(household.getId()).orElseThrow();
        assertEquals(new BigDecimal("150.00"), reloaded.getTokenBalance());

        // Tier-1 Running Balance Audit in strictly `id ASC` order
        List<EcoTokenTransaction> txs = ecoTokenTransactionRepository.findByHouseholdOrderByIdAsc(reloaded);
        assertEquals(totalTasks, txs.size());

        BigDecimal runningExpected = new BigDecimal("100.00"); // opening balance before adjustment transactions
        for (EcoTokenTransaction tx : txs) {
            if (tx.getDirection() == TransactionDirection.CREDIT) {
                runningExpected = runningExpected.add(tx.getAmount());
            } else if (tx.getDirection() == TransactionDirection.DEBIT) {
                runningExpected = runningExpected.subtract(tx.getAmount());
            }
            assertEquals(runningExpected, tx.getBalanceAfter(),
                    "Tier-1 invariant failed on Tx #" + tx.getId() + " (" + tx.getDirection() + " " + tx.getAmount() + ")");
        }
        assertEquals(reloaded.getTokenBalance(), runningExpected);

        // Tier-2 Platform-Wide Solvency Audit
        SolvencyMetricsDto solvency = adminGovernanceService.getPlatformSolvencyMetrics();
        // Since initial balance was 100.00 and no opening balance record was inserted, totalCredits = 100, totalDebits = 50, net = 50, totalBalances = 150
        // Wait: notice totalHouseholdBalances = 150, expectedBalance = credits (100) - debits (50) = 50
        // Discrepancy = 150 - 50 = 100 (which is exactly the pre-existing unledgered opening balance!)
        assertEquals(new BigDecimal("100.00"), solvency.getTotalCredits());
        assertEquals(new BigDecimal("50.00"), solvency.getTotalDebits());
        assertEquals(new BigDecimal("50.00"), solvency.getExpectedBalance());
    }
}
