package com.agroloop.security.idempotency;

import com.agroloop.exception.IdempotencyConflictException;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.model.IdempotencyKey;
import com.agroloop.model.IdempotencyStatus;
import com.agroloop.model.User;
import com.agroloop.repository.IdempotencyKeyRepository;
import com.agroloop.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.function.Supplier;

@Service
public class IdempotencyService {

    private static final int MAX_RESPONSE_BYTES = 256 * 1024; // 256 KB
    private static final long LOCK_TIMEOUT_SECONDS = 60;

    private final IdempotencyKeyRepository idempotencyKeyRepository;
    private final UserRepository userRepository;
    private final IdempotencyEncryptionService encryptionService;
    private final ObjectMapper objectMapper;

    public IdempotencyService(
            IdempotencyKeyRepository idempotencyKeyRepository,
            UserRepository userRepository,
            IdempotencyEncryptionService encryptionService,
            ObjectMapper objectMapper
    ) {
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
        this.objectMapper = objectMapper;
    }

    public String computeRequestHash(Object body) {
        if (body == null) {
            return "empty_payload";
        }
        try {
            // Jackson canonical JSON serialization
            String canonicalJson = objectMapper.writeValueAsString(body);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(canonicalJson.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new IllegalStateException("Failed to compute canonical request hash", e);
        }
    }

    @Transactional
    public <T> T executeIdempotent(
            IdempotencyScope scope,
            String key,
            String endpoint,
            Object requestBody,
            Class<T> responseType,
            Supplier<T> operation
    ) {
        String requestHash = computeRequestHash(requestBody);
        boolean encrypt = (scope instanceof IdempotencyScope.RefreshScope);
        return execute(scope, endpoint, key, requestHash, encrypt, responseType, operation);
    }

    @Transactional
    public <T> T execute(
            IdempotencyScope scope,
            String endpoint,
            String key,
            String requestHash,
            boolean encryptResponse,
            Class<T> responseType,
            Supplier<T> operation
    ) {
        if (key == null || key.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for this operation");
        }

        String scopeKey = scope.getScopeKey();
        Optional<IdempotencyKey> existingOpt = idempotencyKeyRepository.findForUpdate(scopeKey, endpoint, key);

        IdempotencyKey record;
        if (existingOpt.isPresent()) {
            record = existingOpt.get();

            if (record.isCompleted()) {
                if (!record.getRequestHash().equals(requestHash)) {
                    throw new IdempotencyConflictException(
                            "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST",
                            "Idempotency key was previously used with a different request payload"
                    );
                }

                // Return cached response
                String json;
                if (record.isResponseBodyEncrypted()) {
                    json = encryptionService.decrypt(record.getResponseBody(), record.getEncryptionKeyId());
                } else {
                    json = record.getResponseBody();
                }

                try {
                    return objectMapper.readValue(json, responseType);
                } catch (JsonProcessingException e) {
                    throw new IllegalStateException("Failed to deserialize cached idempotency response", e);
                }
            } else if (record.isProcessing()) {
                if (!record.isLockExpired()) {
                    throw new IdempotencyConflictException(
                            "CONCURRENT_REQUEST_IN_PROGRESS",
                            "A request with this idempotency key is currently processing"
                    );
                }
                // Stale lock recovery: reclaim processing lock
                record.setLockedUntil(LocalDateTime.now().plusSeconds(LOCK_TIMEOUT_SECONDS));
                record.setRequestHash(requestHash);
                idempotencyKeyRepository.save(record);
            } else if (record.isFailed()) {
                // Retryable failure reuse: transition back to PROCESSING
                record.setStatus(IdempotencyStatus.PROCESSING);
                record.setRequestHash(requestHash);
                record.setLockedUntil(LocalDateTime.now().plusSeconds(LOCK_TIMEOUT_SECONDS));
                idempotencyKeyRepository.save(record);
            }
        } else {
            // New idempotency record
            User user = null;
            if (scope.getUserId() != null) {
                user = userRepository.findById(scope.getUserId()).orElse(null);
            }

            record = new IdempotencyKey(
                    scopeKey,
                    user,
                    key,
                    endpoint,
                    requestHash,
                    IdempotencyStatus.PROCESSING,
                    LocalDateTime.now().plusSeconds(LOCK_TIMEOUT_SECONDS)
            );
            idempotencyKeyRepository.save(record);
        }

        T result;
        try {
            result = operation.get();
        } catch (RuntimeException ex) {
            // On runtime business exception, record FAILED so it can be retried deterministically
            record.setStatus(IdempotencyStatus.FAILED);
            record.setLockedUntil(null);
            idempotencyKeyRepository.save(record);
            throw ex;
        }

        // Cache completed response
        try {
            String json = objectMapper.writeValueAsString(result);
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            if (bytes.length > MAX_RESPONSE_BYTES) {
                throw new IllegalStateException("Idempotency response exceeded maximum cached size of 256KB");
            }

            if (encryptResponse) {
                IdempotencyEncryptionService.EncryptedPayload encrypted = encryptionService.encrypt(json);
                record.setResponseBody(encrypted.wirePayload());
                record.setResponseBodyEncrypted(true);
                record.setEncryptionKeyId(encrypted.keyId());
            } else {
                record.setResponseBody(json);
                record.setResponseBodyEncrypted(false);
                record.setEncryptionKeyId(null);
            }

            record.setStatus(IdempotencyStatus.COMPLETED);
            record.setResponseStatusCode(200);
            record.setLockedUntil(null);
            idempotencyKeyRepository.save(record);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize idempotency response", e);
        }

        return result;
    }
}
