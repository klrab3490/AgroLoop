package com.agroloop.security;

import com.agroloop.security.validation.FileSecurityValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class FileSecurityValidatorTest {

    private FileSecurityValidator validator;

    @BeforeEach
    void setUp() {
        validator = new FileSecurityValidator();
    }

    @Test
    void sanitizeFilename_stripsPathTraversalAndPreservesExtension() {
        String sanitized = validator.sanitizeFilename("../../uploads/user_avatar.png");
        assertEquals("user_avatar.png", sanitized);
    }

    @Test
    void sanitizeFilename_rejectsNullByteInjection() {
        assertThrows(IllegalArgumentException.class, () ->
                validator.sanitizeFilename("avatar.png\0.exe")
        );
    }

    @Test
    void sanitizeFilename_rejectsExecutableDoubleExtension() {
        assertThrows(SecurityException.class, () ->
                validator.sanitizeFilename("exploit.php.png")
        );
    }

    @Test
    void inspectMagicBytes_identifiesValidPng() {
        byte[] pngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        FileSecurityValidator.DetectedFileType type = validator.inspectMagicBytes(pngHeader);
        assertEquals(FileSecurityValidator.DetectedFileType.PNG, type);
    }

    @Test
    void inspectMagicBytes_identifiesValidJpeg() {
        byte[] jpegHeader = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0};
        FileSecurityValidator.DetectedFileType type = validator.inspectMagicBytes(jpegHeader);
        assertEquals(FileSecurityValidator.DetectedFileType.JPEG, type);
    }

    @Test
    void validateStreamContent_detectsSpoofedMimeType() {
        // Pretending to be JPEG, but magic bytes are ASCII text ("ECHO hello")
        byte[] fakeData = "ECHO not an image at all!".getBytes();
        ByteArrayInputStream is = new ByteArrayInputStream(fakeData);

        assertThrows(SecurityException.class, () ->
                validator.validateStreamContent(is, "image/jpeg", 1024)
        );
    }
}
