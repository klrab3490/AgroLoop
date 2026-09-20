package com.agroloop.security;

import com.agroloop.exception.IdempotencyConflictException;
import com.agroloop.model.Household;
import com.agroloop.model.IdempotencyKey;
import com.agroloop.model.User;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.IdempotencyKeyRepository;
import com.agroloop.security.idempotency.IdempotencyScope;
import com.agroloop.security.idempotency.IdempotencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("IdempotencyIntegrationTest — Idempotency Engine Caching, Conflict & AES-GCM Encryption")
class IdempotencyIntegrationTest {

    @Autowired
    private IdempotencyService idempotencyService;

    @Autowired
    private IdempotencyKeyRepository idempotencyKeyRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;

    @BeforeEach
    void setUp() {
        idempotencyKeyRepository.deleteAll();
        householdRepository.findByEmail("idempotency@agroloop.com").ifPresent(householdRepository::delete);

        Household household = new Household(
                "Idempotency Test User",
                "idempotency@agroloop.com",
                passwordEncoder.encode("Pass123!"),
                "101 Strict Transaction Road"
        );
        testUser = householdRepository.save(household);
    }

    @Test
    @DisplayName("Identical request key and payload returns cached response without re-invoking business operation")
    void testCachedResponseReplay() {
        String key = UUID.randomUUID().toString();
        IdempotencyScope scope = new IdempotencyScope.UserScope(testUser.getId());
        Map<String, String> payload = Map.of("orderId", "12345", "amount", "100.00");

        AtomicInteger executionCount = new AtomicInteger(0);

        // First call
        Map<?, ?> result1 = idempotencyService.executeIdempotent(
                scope,
                key,
                "/api/v1/orders",
                payload,
                Map.class,
                () -> {
                    executionCount.incrementAndGet();
                    return Map.of("status", "SUCCESS", "trackingId", "trk_abc");
                }
        );

        assertEquals(1, executionCount.get());
        assertEquals("SUCCESS", result1.get("status"));

        // Second call with same key and payload
        Map<?, ?> result2 = idempotencyService.executeIdempotent(
                scope,
                key,
                "/api/v1/orders",
                payload,
                Map.class,
                () -> {
                    executionCount.incrementAndGet();
                    return Map.of("status", "SUCCESS", "trackingId", "trk_DIFFERENT");
                }
        );

        assertEquals(1, executionCount.get(), "Operation must NOT be executed second time");
        assertEquals("trk_abc", result2.get("trackingId"), "Must return cached payload from first execution");
    }

    @Test
    @DisplayName("Reusing idempotency key with different request payload throws IdempotencyConflictException (409)")
    void testReusedKeyDifferentPayloadFails() {
        String key = UUID.randomUUID().toString();
        IdempotencyScope scope = new IdempotencyScope.UserScope(testUser.getId());

        Map<String, String> payload1 = Map.of("action", "FIRST");
        Map<String, String> payload2 = Map.of("action", "SECOND");

        idempotencyService.executeIdempotent(
                scope,
                key,
                "/api/v1/orders",
                payload1,
                Map.class,
                () -> Map.of("result", "OK")
        );

        assertThrows(IdempotencyConflictException.class, () ->
                idempotencyService.executeIdempotent(
                        scope,
                        key,
                        "/api/v1/orders",
                        payload2,
                        Map.class,
                        () -> Map.of("result", "SHOULD_FAIL")
                )
        );
    }

    @Test
    @DisplayName("RefreshScope idempotency encrypts response body at rest with AES-GCM and decrypts on replay")
    void testRefreshScopeEncryptedAtRest() {
        String key = UUID.randomUUID().toString();
        String fakeToken = "raw_refresh_token_1234567890abcdef";
        IdempotencyScope scope = new IdempotencyScope.RefreshScope(fakeToken);

        Map<String, String> refreshPayload = Map.of("token", fakeToken);

        // Execute operation
        Map<?, ?> result1 = idempotencyService.executeIdempotent(
                scope,
                key,
                "/api/v1/auth/refresh",
                refreshPayload,
                Map.class,
                () -> Map.of("newRefreshToken", "brand_new_secret_credential_token")
        );

        assertEquals("brand_new_secret_credential_token", result1.get("newRefreshToken"));

        // Verify database persistence: response_body must NOT contain plaintext credential!
        IdempotencyKey storedRecord = idempotencyKeyRepository.findByScopeKeyAndEndpointAndIdempotencyKey(scope.getScopeKey(), "/api/v1/auth/refresh", key)
                .orElseThrow();

        assertTrue(storedRecord.isResponseBodyEncrypted(), "Refresh scope response must be flagged as encrypted");
        assertFalse(storedRecord.getResponseBody().contains("brand_new_secret_credential_token"),
                "Raw credentials must NOT exist in plaintext in the database!");
        assertNotNull(storedRecord.getEncryptionKeyId(), "Encryption key ID must be recorded");

        // Replay request: decrypts cleanly
        Map<?, ?> result2 = idempotencyService.executeIdempotent(
                scope,
                key,
                "/api/v1/auth/refresh",
                refreshPayload,
                Map.class,
                () -> Map.of("should", "not_run")
        );

        assertEquals("brand_new_secret_credential_token", result2.get("newRefreshToken"));
    }
}
