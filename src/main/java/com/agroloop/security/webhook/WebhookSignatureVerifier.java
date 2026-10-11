package com.agroloop.security.webhook;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Validates inbound webhook signatures:
 * 1. HMAC-SHA256 calculation.
 * 2. Constant-time comparison to prevent timing attacks.
 * 3. Timestamp replay prevention to defend against replay attacks.
 */
@Component
public class WebhookSignatureVerifier {

    private static final String HMAC_SHA256_ALGORITHM = "HmacSHA256";
    private static final long DEFAULT_TOLERANCE_SECONDS = 300; // 5 minutes

    /**
     * Verifies raw HMAC-SHA256 signature against payload using constant-time comparison.
     */
    public boolean verifySignature(byte[] payload, String secret, String expectedSignatureHex) {
        if (payload == null || secret == null || expectedSignatureHex == null) {
            return false;
        }

        try {
            String computedHex = computeHmacSha256Hex(payload, secret);
            byte[] computedBytes = computedHex.getBytes(StandardCharsets.UTF_8);
            byte[] expectedBytes = expectedSignatureHex.trim().toLowerCase().getBytes(StandardCharsets.UTF_8);

            // Constant-time comparison
            return MessageDigest.isEqual(computedBytes, expectedBytes);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Verifies a timestamped webhook payload in standard header format (t=1614555555,v1=abcdef...).
     */
    public boolean verifyTimestampedHeader(
            byte[] payload,
            String secret,
            String signatureHeader,
            long toleranceSeconds
    ) {
        if (payload == null || secret == null || signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }

        String timestampStr = null;
        String signatureHex = null;

        String[] parts = signatureHeader.split(",");
        for (String part : parts) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length == 2) {
                if ("t".equalsIgnoreCase(kv[0])) {
                    timestampStr = kv[1];
                } else if ("v1".equalsIgnoreCase(kv[0]) || "sig".equalsIgnoreCase(kv[0])) {
                    signatureHex = kv[1];
                }
            }
        }

        if (timestampStr == null || signatureHex == null) {
            return false;
        }

        try {
            long timestamp = Long.parseLong(timestampStr);
            long now = Instant.now().getEpochSecond();
            long tolerance = toleranceSeconds > 0 ? toleranceSeconds : DEFAULT_TOLERANCE_SECONDS;

            // Reject expired or futuristic requests (replay attack defense)
            if (Math.abs(now - timestamp) > tolerance) {
                return false;
            }

            // Signed payload = timestamp + "." + payload
            byte[] timestampBytes = (timestampStr + ".").getBytes(StandardCharsets.UTF_8);
            byte[] signedPayload = new byte[timestampBytes.length + payload.length];
            System.arraycopy(timestampBytes, 0, signedPayload, 0, timestampBytes.length);
            System.arraycopy(payload, 0, signedPayload, timestampBytes.length, payload.length);

            return verifySignature(signedPayload, secret, signatureHex);
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Computes HMAC-SHA256 hex string.
     */
    public String computeHmacSha256Hex(byte[] data, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256_ALGORITHM);
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data);
            return HexFormat.of().formatHex(hmacBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Failed to calculate HMAC-SHA256", e);
        }
    }
}
