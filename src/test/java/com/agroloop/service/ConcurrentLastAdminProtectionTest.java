package com.agroloop.service;

import com.agroloop.model.Admin;
import com.agroloop.model.Role;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

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
@DisplayName("Concurrent Last-Admin Protection Integration Tests")
class ConcurrentLastAdminProtectionTest {

    @Autowired
    private AdminGovernanceService adminGovernanceService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AdminRepository adminRepository;

    private Admin adminA;
    private Admin adminB;

    @BeforeEach
    void setUp() {
        tearDown();

        // Temporarily disable seeded default admin so exactly Admin A and Admin B are active
        Admin defaultAdmin = adminRepository.findByEmail("admin@agroloop.com").orElse(null);
        if (defaultAdmin != null) {
            defaultAdmin.disable();
            adminRepository.save(defaultAdmin);
        }

        adminA = adminRepository.save(new Admin("Admin A", "admin.a@agroloop.com", "hash"));
        adminB = adminRepository.save(new Admin("Admin B", "admin.b@agroloop.com", "hash"));
    }

    @AfterEach
    void tearDown() {
        adminRepository.findAll().stream()
                .filter(a -> !"admin@agroloop.com".equals(a.getEmail()))
                .forEach(adminRepository::delete);

        Admin defaultAdmin = adminRepository.findByEmail("admin@agroloop.com").orElse(null);
        if (defaultAdmin != null && !defaultAdmin.isEnabled()) {
            defaultAdmin.enable();
            adminRepository.save(defaultAdmin);
        }
    }

    @Test
    @DisplayName("Mutual concurrent disable requests serialize safely and preserve at least 1 active administrator")
    void testMutualConcurrentDisablePreservesLastAdmin() throws InterruptedException {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger lastAdminRejectionCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        // Thread 1: Admin A attempts to disable Admin B
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                adminGovernanceService.disableUser(adminB.getId(), adminA.getEmail());
                successCount.incrementAndGet();
            } catch (IllegalStateException ex) {
                if (ex.getMessage().contains("Cannot disable the last active administrator")) {
                    lastAdminRejectionCount.incrementAndGet();
                } else {
                    unexpectedErrors.add(ex);
                }
            } catch (Throwable t) {
                unexpectedErrors.add(t);
            }
        });

        // Thread 2: Admin B attempts to disable Admin A
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                adminGovernanceService.disableUser(adminA.getId(), adminB.getEmail());
                successCount.incrementAndGet();
            } catch (IllegalStateException ex) {
                if (ex.getMessage().contains("Cannot disable the last active administrator")) {
                    lastAdminRejectionCount.incrementAndGet();
                } else {
                    unexpectedErrors.add(ex);
                }
            } catch (Throwable t) {
                unexpectedErrors.add(t);
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));

        assertEquals(0, unexpectedErrors.size(), "No unexpected errors allowed: " + unexpectedErrors);
        assertEquals(1, successCount.get(), "Exactly one admin disable must succeed");
        assertEquals(1, lastAdminRejectionCount.get(), "The competing request must fail with last-admin guard");

        // There should be exactly 1 active custom admin
        long activeCount = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_ADMIN && u.isEnabled())
                .filter(u -> u.getId().equals(adminA.getId()) || u.getId().equals(adminB.getId()))
                .count();

        assertEquals(1, activeCount, "Exactly one of Admin A or Admin B must remain active");
    }
}
