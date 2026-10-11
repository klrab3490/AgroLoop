package com.agroloop.security;

import com.agroloop.security.mfa.TotpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TotpServiceTest {

    private TotpService totpService;

    @BeforeEach
    void setUp() {
        totpService = new TotpService();
    }

    @Test
    void generateSecret_generatesValidBase32String() {
        String secret = totpService.generateSecret();
        assertNotNull(secret);
        assertTrue(secret.length() >= 16);
        assertTrue(secret.matches("^[A-Z2-7]+$"));
    }

    @Test
    void generateTotpUri_formatsStandardOtpauthUri() {
        String secret = totpService.generateSecret();
        String uri = totpService.generateTotpUri("rahul@agroloop.com", "AgroLoop", secret);

        assertTrue(uri.startsWith("otpauth://totp/AgroLoop:rahul%40agroloop.com?secret="));
        assertTrue(uri.contains("&issuer=AgroLoop"));
        assertTrue(uri.contains("&algorithm=SHA1"));
        assertTrue(uri.contains("&digits=6"));
    }

    @Test
    void generateCodeAndVerifyCode_validatesCurrentCode() {
        String secret = totpService.generateSecret();
        String currentCode = totpService.generateCode(secret);

        assertEquals(6, currentCode.length());
        assertTrue(totpService.verifyCode(secret, currentCode));
    }

    @Test
    void verifyCode_invalidCode_returnsFalse() {
        String secret = totpService.generateSecret();
        assertFalse(totpService.verifyCode(secret, "000000"));
        assertFalse(totpService.verifyCode(secret, "12345")); // wrong length
    }
}
