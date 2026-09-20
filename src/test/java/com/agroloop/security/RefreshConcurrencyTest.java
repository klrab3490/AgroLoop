package com.agroloop.security;

import com.agroloop.exception.RevokedTokenException;
import com.agroloop.exception.TokenFamilyRevokedException;
import com.agroloop.model.ClientType;
import com.agroloop.model.Household;
import com.agroloop.model.User;
import com.agroloop.repository.AuthSessionRepository;
import com.agroloop.repository.HouseholdRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("RefreshConcurrencyTest — Multi-Threaded Pessimistic Locking & Replay Invalidation")
class RefreshConcurrencyTest {

    @Autowired
    private TokenService tokenService;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;

    @BeforeEach
    void setUp() {
        authSessionRepository.deleteAll();
        householdRepository.findByEmail("concurrency@agroloop.com").ifPresent(householdRepository::delete);

        Household household = new Household(
                "Concurrency Test User",
                "concurrency@agroloop.com",
                passwordEncoder.encode("Pass123!"),
                "789 Parallel Lane"
        );
        testUser = householdRepository.save(household);
    }

    @Test
    @DisplayName("Concurrent refresh attempts on the same refresh token serialize cleanly and prevent double rotation")
    void testConcurrentRefreshSerialization() throws Exception {
        TokenService.TokenPair initialSession = tokenService.createInitialSession(testUser, "Test Device", ClientType.MOBILE);
        String rawRefreshToken = initialSession.refreshToken();

        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CyclicBarrier barrier = new CyclicBarrier(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger revokedOrBreachCount = new AtomicInteger(0);

        Callable<Void> task = () -> {
            try {
                barrier.await(5, TimeUnit.SECONDS);
                tokenService.rotateSession(rawRefreshToken);
                successCount.incrementAndGet();
            } catch (RevokedTokenException | TokenFamilyRevokedException e) {
                revokedOrBreachCount.incrementAndGet();
            } catch (Exception e) {
                // other exceptions
            }
            return null;
        };

        Future<?>[] futures = new Future<?>[threadCount];
        for (int i = 0; i < threadCount; i++) {
            futures[i] = executor.submit(task);
        }

        for (Future<?> future : futures) {
            future.get(10, TimeUnit.SECONDS);
        }
        executor.shutdown();

        // Exactly one concurrent request should succeed, and all others should be rejected as revoked / replay
        assertEquals(1, successCount.get(), "Exactly ONE thread must succeed in rotating the refresh token");
        assertEquals(threadCount - 1, revokedOrBreachCount.get(), "All other concurrent attempts must be rejected");
    }
}
