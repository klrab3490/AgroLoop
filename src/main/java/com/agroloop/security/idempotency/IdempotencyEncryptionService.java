package com.agroloop.security.idempotency;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IdempotencyEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96 bits
    private static final int GCM_TAG_LENGTH = 128; // 128 bits
    private final SecureRandom secureRandom = new SecureRandom();

    private final String currentKeyId;
    private final Map<String, SecretKey> keyRing = new ConcurrentHashMap<>();

    public IdempotencyEncryptionService(
            @Value("${agroloop.idempotency.encryption.active-key-id:k2026_01}") String currentKeyId,
            @Value("${agroloop.idempotency.encryption.secret:}") String externalSecretHex
    ) {
        this.currentKeyId = currentKeyId;

        byte[] keyBytes = new byte[32]; // 256 bits
        if (externalSecretHex != null && externalSecretHex.length() == 64) {
            for (int i = 0; i < 32; i++) {
                keyBytes[i] = (byte) Integer.parseInt(externalSecretHex.substring(i * 2, i * 2 + 2), 16);
            }
        } else {
            // Development fallback: generate random 256-bit key
            secureRandom.nextBytes(keyBytes);
        }

        SecretKey secretKey = new SecretKeySpec(keyBytes, "AES");
        keyRing.put(currentKeyId, secretKey);
    }

    public String getCurrentKeyId() {
        return currentKeyId;
    }

    public EncryptedPayload encrypt(String plaintext) {
        if (plaintext == null) {
            return new EncryptedPayload(null, currentKeyId);
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            SecretKey key = keyRing.get(currentKeyId);
            if (key == null) {
                throw new IllegalStateException("Active encryption key not found: " + currentKeyId);
            }

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, parameterSpec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            String encodedIv = Base64.getEncoder().encodeToString(iv);
            String encodedCiphertext = Base64.getEncoder().encodeToString(ciphertext);
            String wireFormat = encodedIv + ":" + encodedCiphertext;

            return new EncryptedPayload(wireFormat, currentKeyId);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("AES-GCM encryption failed", e);
        }
    }

    public String decrypt(String encryptedWirePayload, String keyId) {
        if (encryptedWirePayload == null) {
            return null;
        }

        try {
            String[] parts = encryptedWirePayload.split(":", 2);
            if (parts.length != 2) {
                throw new IllegalArgumentException("Malformed encrypted payload wire format");
            }

            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertextWithTag = Base64.getDecoder().decode(parts[1]);

            SecretKey key = keyRing.get(keyId != null ? keyId : currentKeyId);
            if (key == null) {
                throw new IllegalStateException("Decryption key not found in keyRing: " + keyId);
            }

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, parameterSpec);

            byte[] plaintextBytes = cipher.doFinal(ciphertextWithTag);
            return new String(plaintextBytes, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("AES-GCM decryption failed (tampered payload or invalid key)", e);
        }
    }

    public record EncryptedPayload(String wirePayload, String keyId) {}
}
