package com.agroloop.security;

import com.agroloop.security.webhook.WebhookSignatureVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class WebhookSignatureVerifierTest {

    private WebhookSignatureVerifier verifier;
    private static final String SECRET = "whsec_test_secret_key_12345";
    private static final byte[] PAYLOAD = "{\"event\":\"order.paid\",\"amount\":4500}".getBytes(StandardCharsets.UTF_8);

    @BeforeEach
    void setUp() {
        verifier = new WebhookSignatureVerifier();
    }

    @Test
    void verifySignature_validPayloadAndSecret_returnsTrue() {
        String validSig = verifier.computeHmacSha256Hex(PAYLOAD, SECRET);
        boolean result = verifier.verifySignature(PAYLOAD, SECRET, validSig);
        assertTrue(result);
    }

    @Test
    void verifySignature_tamperedPayload_returnsFalse() {
        String validSig = verifier.computeHmacSha256Hex(PAYLOAD, SECRET);
        byte[] tamperedPayload = "{\"event\":\"order.paid\",\"amount\":999999}".getBytes(StandardCharsets.UTF_8);
        boolean result = verifier.verifySignature(tamperedPayload, SECRET, validSig);
        assertFalse(result);
    }

    @Test
    void verifyTimestampedHeader_withinTolerance_returnsTrue() {
        long now = Instant.now().getEpochSecond();
        String headerPayload = now + "." + new String(PAYLOAD, StandardCharsets.UTF_8);
        String sig = verifier.computeHmacSha256Hex(headerPayload.getBytes(StandardCharsets.UTF_8), SECRET);

        String header = "t=" + now + ",v1=" + sig;
        boolean result = verifier.verifyTimestampedHeader(PAYLOAD, SECRET, header, 300);
        assertTrue(result);
    }

    @Test
    void verifyTimestampedHeader_staleTimestampExceedingTolerance_returnsFalse() {
        long staleTime = Instant.now().getEpochSecond() - 600; // 10 mins ago
        String headerPayload = staleTime + "." + new String(PAYLOAD, StandardCharsets.UTF_8);
        String sig = verifier.computeHmacSha256Hex(headerPayload.getBytes(StandardCharsets.UTF_8), SECRET);

        String header = "t=" + staleTime + ",v1=" + sig;
        boolean result = verifier.verifyTimestampedHeader(PAYLOAD, SECRET, header, 300);
        assertFalse(result); // Replay attack defense
    }
}
