package com.agroloop.service;

import com.agroloop.service.storage.FileStorageService;
import com.agroloop.service.storage.LocalFileStorageServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("FileStorageService Unit Tests (Phase 3 - Step 3)")
class FileStorageServiceTest {

    private final Path testUploadDir = Paths.get("target/test-uploads").toAbsolutePath().normalize();
    private FileStorageService storageService;

    @BeforeEach
    void setUp() throws IOException {
        cleanDirectory(testUploadDir);
        Files.createDirectories(testUploadDir);
        storageService = new LocalFileStorageServiceImpl(testUploadDir.toString());
    }

    @AfterEach
    void tearDown() throws IOException {
        cleanDirectory(testUploadDir);
    }

    private void cleanDirectory(Path dir) throws IOException {
        if (Files.exists(dir)) {
            try (var stream = Files.walk(dir)) {
                stream.sorted(Comparator.reverseOrder())
                        .forEach(p -> {
                            try {
                                Files.deleteIfExists(p);
                            } catch (IOException ignored) {
                            }
                        });
            }
        }
    }

    @Test
    @DisplayName("Successfully stores valid JPEG file with server-generated UUID filename")
    void testStoreValidImageFile() {
        byte[] content = "test-image-content".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "photo",
                "original-kitchen.jpg",
                "image/jpeg",
                content
        );

        String relativePath = storageService.storeFile(file, "waste");
        assertNotNull(relativePath);
        assertTrue(relativePath.startsWith("waste/"));
        assertTrue(relativePath.endsWith(".jpg"));
        assertFalse(relativePath.contains("original-kitchen.jpg"), "Server should generate UUID and not use raw client filename");

        Path physicalFile = storageService.loadFilePath(relativePath);
        assertTrue(Files.exists(physicalFile));
    }

    @Test
    @DisplayName("Returns null when file is null or empty")
    void testStoreEmptyOrNullFile() {
        assertNull(storageService.storeFile(null, "waste"));

        MockMultipartFile emptyFile = new MockMultipartFile("photo", "empty.jpg", "image/jpeg", new byte[0]);
        assertNull(storageService.storeFile(emptyFile, "waste"));
    }

    @Test
    @DisplayName("Rejects non-whitelisted MIME types")
    void testRejectInvalidMimeType() {
        MockMultipartFile pdfFile = new MockMultipartFile(
                "document",
                "receipt.pdf",
                "application/pdf",
                "dummy pdf".getBytes()
        );

        assertThrows(IllegalArgumentException.class, () ->
                storageService.storeFile(pdfFile, "waste"));
    }

    @Test
    @DisplayName("Rejects directory traversal in subdirectory parameter")
    void testRejectPathTraversalInSubdirectory() {
        MockMultipartFile file = new MockMultipartFile(
                "photo",
                "pic.png",
                "image/png",
                "data".getBytes()
        );

        assertThrows(IllegalArgumentException.class, () ->
                storageService.storeFile(file, "../outside"));
        assertThrows(IllegalArgumentException.class, () ->
                storageService.storeFile(file, "/absolute/path"));
    }

    @Test
    @DisplayName("Rejects directory traversal when loading file path")
    void testRejectPathTraversalOnLoad() {
        assertThrows(IllegalArgumentException.class, () ->
                storageService.loadFilePath("../../etc/passwd"));
    }

    @Test
    @DisplayName("Deletes existing file successfully")
    void testDeleteFile() throws IOException {
        MockMultipartFile file = new MockMultipartFile("photo", "del.png", "image/png", "img".getBytes());
        String relativePath = storageService.storeFile(file, "waste");
        Path savedPath = storageService.loadFilePath(relativePath);
        assertTrue(Files.exists(savedPath));

        storageService.deleteFile(relativePath);
        assertFalse(Files.exists(savedPath));
    }
}
