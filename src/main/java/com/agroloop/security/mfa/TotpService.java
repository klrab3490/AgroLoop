package com.agroloop.security.mfa;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;

/**
 * Implements RFC 6238 Time-based One-Time Password (TOTP) algorithm
 * for Multi-Factor Authentication (MFA/2FA).
 */
@Service
public class TotpService {

    private static final String HMAC_ALGO = "HmacSHA1";
    private static final int DEFAULT_TIME_STEP_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final int MODULO = 1_000_000;
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a cryptographically secure Base32-encoded secret key (160-bit / 20 bytes).
     */
    public String generateSecret() {
        byte[] buffer = new byte[20];
        secureRandom.nextBytes(buffer);
        return encodeBase32(buffer);
    }

    /**
     * Generates a standard otpauth:// URI for QR code scanners (Google Authenticator, Authy, etc.).
     */
    public String generateTotpUri(String accountName, String issuer, String secret) {
        String encodedIssuer = URLEncoder.encode(issuer, StandardCharsets.UTF_8).replace("+", "%20");
        String encodedAccount = URLEncoder.encode(accountName, StandardCharsets.UTF_8).replace("+", "%20");
        return String.format(
                "otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d",
                encodedIssuer, encodedAccount, secret, encodedIssuer, DIGITS, DEFAULT_TIME_STEP_SECONDS
        );
    }

    /**
     * Generates the current 6-digit TOTP code for a secret.
     */
    public String generateCode(String base32Secret) {
        long currentInterval = Instant.now().getEpochSecond() / DEFAULT_TIME_STEP_SECONDS;
        return generateCodeForInterval(base32Secret, currentInterval);
    }

    /**
     * Validates a user-supplied code against the secret, allowing a drift window of +/- 1 time step (90s window).
     */
    public boolean verifyCode(String base32Secret, String userCode) {
        if (base32Secret == null || userCode == null || userCode.length() != DIGITS) {
            return false;
        }

        long currentInterval = Instant.now().getEpochSecond() / DEFAULT_TIME_STEP_SECONDS;

        // Check current interval, previous interval (-30s), and next interval (+30s) for clock drift
        for (int i = -1; i <= 1; i++) {
            String expected = generateCodeForInterval(base32Secret, currentInterval + i);
            if (expected.equals(userCode.trim())) {
                return true;
            }
        }
        return false;
    }

    private String generateCodeForInterval(String base32Secret, long interval) {
        byte[] keyBytes = decodeBase32(base32Secret);
        byte[] data = ByteBuffer.allocate(8).putLong(interval).array();

        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(keyBytes, HMAC_ALGO));
            byte[] hash = mac.doFinal(data);

            // Dynamic truncation (RFC 4226)
            int offset = hash[hash.length - 1] & 0x0F;
            long truncatedHash = ((hash[offset] & 0x7F) << 24) |
                    ((hash[offset + 1] & 0xFF) << 16) |
                    ((hash[offset + 2] & 0xFF) << 8) |
                    (hash[offset + 3] & 0xFF);

            long code = truncatedHash % MODULO;
            return String.format("%0" + DIGITS + "d", code);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Failed to compute TOTP hash", e);
        }
    }

    private String encodeBase32(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;

        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                bitsLeft -= 5;
                sb.append(BASE32_ALPHABET.charAt((buffer >> bitsLeft) & 0x1F));
            }
        }

        if (bitsLeft > 0) {
            buffer <<= (5 - bitsLeft);
            sb.append(BASE32_ALPHABET.charAt(buffer & 0x1F));
        }

        return sb.toString();
    }

    private byte[] decodeBase32(String secret) {
        String clean = secret.toUpperCase().replaceAll("[^A-Z2-7]", "");
        ByteBuffer byteBuffer = ByteBuffer.allocate(clean.length() * 5 / 8);

        int buffer = 0;
        int bitsLeft = 0;

        for (char c : clean.toCharArray()) {
            int val = BASE32_ALPHABET.indexOf(c);
            if (val < 0) continue;

            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                bitsLeft -= 8;
                byteBuffer.put((byte) ((buffer >> bitsLeft) & 0xFF));
            }
        }

        byte[] result = new byte[byteBuffer.position()];
        byteBuffer.rewind();
        byteBuffer.get(result);
        return result;
    }
}
