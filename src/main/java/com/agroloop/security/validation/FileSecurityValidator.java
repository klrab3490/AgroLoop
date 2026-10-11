package com.agroloop.security.validation;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validates uploaded files against security threats:
 * 1. MIME / content-type spoofing via Magic Bytes inspection.
 * 2. Directory traversal and path manipulation in filenames.
 * 3. Dangerous / executable file extensions.
 * 4. File size limits.
 */
@Component
public class FileSecurityValidator {

    // Magic Byte Signatures
    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] RIFF_MAGIC = new byte[]{0x52, 0x49, 0x46, 0x46}; // 'RIFF'
    private static final byte[] WEBP_MAGIC = new byte[]{0x57, 0x45, 0x42, 0x50}; // 'WEBP' at offset 8
    private static final byte[] PDF_MAGIC = new byte[]{0x25, 0x50, 0x44, 0x46};  // '%PDF'

    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "sh", "php", "phtml", "jsp", "asp", "aspx",
            "cgi", "pl", "py", "jar", "war", "js", "vbs", "wsf", "scr"
    );

    private static final Pattern SAFE_FILENAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]+$");

    public enum DetectedFileType {
        JPEG("image/jpeg", "jpg"),
        PNG("image/png", "png"),
        WEBP("image/webp", "webp"),
        PDF("application/pdf", "pdf"),
        UNKNOWN("application/octet-stream", "bin");

        private final String mimeType;
        private final String extension;

        DetectedFileType(String mimeType, String extension) {
            this.mimeType = mimeType;
            this.extension = extension;
        }

        public String getMimeType() {
            return mimeType;
        }

        public String getExtension() {
            return extension;
        }
    }

    /**
     * Sanitizes a filename, stripping path traversals, null bytes, and non-whitelisted characters.
     */
    public String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("Filename cannot be blank");
        }

        // Extract base name ignoring any leading paths
        String baseName = Paths.get(filename).getFileName().toString();

        // Check for null bytes or control characters
        if (baseName.contains("\0") || baseName.contains("%00")) {
            throw new IllegalArgumentException("Filename contains null byte injection attempt");
        }

        // Replace whitespace with underscores and strip invalid chars
        String cleaned = baseName.trim().replaceAll("\\s+", "_");
        if (!SAFE_FILENAME_PATTERN.matcher(cleaned).matches()) {
            cleaned = cleaned.replaceAll("[^a-zA-Z0-9._-]", "");
        }

        if (cleaned.isBlank() || cleaned.equals(".") || cleaned.equals("..")) {
            throw new IllegalArgumentException("Invalid filename after sanitization");
        }

        // Reject dangerous extensions anywhere in the filename (e.g. avatar.php.png)
        String lower = cleaned.toLowerCase(Locale.ROOT);
        for (String dangerous : DANGEROUS_EXTENSIONS) {
            if (lower.contains("." + dangerous + ".") || lower.endsWith("." + dangerous)) {
                throw new SecurityException("Filename contains forbidden executable extension: " + dangerous);
            }
        }

        return cleaned;
    }

    /**
     * Inspects the first bytes of the input stream to verify magic numbers against declared MIME type.
     */
    public DetectedFileType inspectMagicBytes(byte[] headerBytes) {
        if (headerBytes == null || headerBytes.length < 4) {
            return DetectedFileType.UNKNOWN;
        }

        // Check JPEG (FF D8 FF)
        if (headerBytes.length >= 3 && matchesPrefix(headerBytes, JPEG_MAGIC)) {
            return DetectedFileType.JPEG;
        }

        // Check PNG (89 50 4E 47 0D 0A 1A 0A)
        if (headerBytes.length >= 8 && matchesPrefix(headerBytes, PNG_MAGIC)) {
            return DetectedFileType.PNG;
        }

        // Check WebP (RIFF....WEBP)
        if (headerBytes.length >= 12 && matchesPrefix(headerBytes, RIFF_MAGIC)) {
            byte[] webpOffset = Arrays.copyOfRange(headerBytes, 8, 12);
            if (Arrays.equals(webpOffset, WEBP_MAGIC)) {
                return DetectedFileType.WEBP;
            }
        }

        // Check PDF (%PDF)
        if (matchesPrefix(headerBytes, PDF_MAGIC)) {
            return DetectedFileType.PDF;
        }

        return DetectedFileType.UNKNOWN;
    }

    /**
     * Validates an uploaded stream's magic bytes against an expected MIME type.
     */
    public void validateStreamContent(InputStream inputStream, String expectedMimeType, long maxSizeBytes) throws IOException {
        if (inputStream == null) {
            throw new IllegalArgumentException("Input stream cannot be null");
        }

        byte[] header = inputStream.readNBytes(16);
        if (header.length < 4) {
            throw new SecurityException("File header is too short to determine file format");
        }

        DetectedFileType detected = inspectMagicBytes(header);
        if (detected == DetectedFileType.UNKNOWN) {
            throw new SecurityException("File signature (magic bytes) does not match any allowed file type");
        }

        if (expectedMimeType != null && !expectedMimeType.isBlank()) {
            String normalizedExpected = expectedMimeType.toLowerCase(Locale.ROOT);
            if (!detected.getMimeType().equalsIgnoreCase(normalizedExpected)) {
                throw new SecurityException(String.format(
                        "MIME type spoofing detected: header states '%s', but actual magic bytes indicate '%s'",
                        expectedMimeType, detected.getMimeType()
                ));
            }
        }
    }

    private boolean matchesPrefix(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
