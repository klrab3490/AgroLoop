package com.agroloop.service.storage;

import com.agroloop.dto.api.v1.response.StorageDiagnosticsResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("StorageManager Unit Tests (Phase 12 Cloud Storage SPI)")
class StorageManagerTest {

    @TempDir
    Path tempDir;

    private StorageProperties properties;
    private CloudStorageService mockLocalStorageService;
    private CloudStorageService mockS3StorageService;

    @BeforeEach
    void setUp() {
        properties = new StorageProperties();
        mockLocalStorageService = Mockito.mock(CloudStorageService.class);
        mockS3StorageService = Mockito.mock(CloudStorageService.class);

        when(mockLocalStorageService.getProvider()).thenReturn(StorageProvider.LOCAL);
        when(mockS3StorageService.getProvider()).thenReturn(StorageProvider.S3);
    }

    @Test
    @DisplayName("Dispatches operations to LOCAL provider when configured")
    void testDispatchesToLocalProvider() {
        properties.setProvider(StorageProvider.LOCAL);
        properties.setUploadDir(tempDir.toString());

        StorageManager storageManager = new StorageManager(
                mockLocalStorageService,
                mockS3StorageService,
                properties
        );

        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", "hello".getBytes());
        when(mockLocalStorageService.storeFile(eq(file), eq("products"))).thenReturn("products/test-123.jpg");

        String stored = storageManager.storeFile(file, "products");
        assertEquals("products/test-123.jpg", stored);
        verify(mockLocalStorageService, times(1)).storeFile(file, "products");
        verify(mockS3StorageService, never()).storeFile(any(), any());
    }

    @Test
    @DisplayName("Dispatches operations to S3 provider when configured")
    void testDispatchesToS3Provider() {
        properties.setProvider(StorageProvider.S3);
        properties.getS3().setBucket("agroloop-assets");
        properties.getS3().setRegion("us-east-1");

        StorageManager storageManager = new StorageManager(
                mockLocalStorageService,
                mockS3StorageService,
                properties
        );

        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", "bytes".getBytes());
        when(mockS3StorageService.storeFile(eq(file), eq("waste"))).thenReturn("waste/remote-uuid.png");

        String stored = storageManager.storeFile(file, "waste");
        assertEquals("waste/remote-uuid.png", stored);
        verify(mockS3StorageService, times(1)).storeFile(file, "waste");
        verify(mockLocalStorageService, never()).storeFile(any(), any());
    }

    @Test
    @DisplayName("Returns diagnostic report with healthy status for LOCAL provider")
    void testGetDiagnostics_LocalHealthy() {
        properties.setProvider(StorageProvider.LOCAL);
        properties.setUploadDir(tempDir.toString());

        when(mockLocalStorageService.isHealthy()).thenReturn(true);

        StorageManager storageManager = new StorageManager(
                mockLocalStorageService,
                mockS3StorageService,
                properties
        );

        StorageDiagnosticsResponse diagnostics = storageManager.getDiagnostics();
        assertNotNull(diagnostics);
        assertEquals(StorageProvider.LOCAL, diagnostics.activeProvider());
        assertTrue(diagnostics.healthy());
        assertEquals(tempDir.toString(), diagnostics.targetLocation());
        assertTrue(diagnostics.latencyMs() >= 0);
    }

    @Test
    @DisplayName("Returns pre-signed upload URL from active cloud provider")
    void testGeneratePresignedUploadUrl() {
        properties.setProvider(StorageProvider.S3);
        properties.getS3().setBucket("agroloop-prod");

        when(mockS3StorageService.generatePresignedUploadUrl("waste/test.jpg", "image/jpeg", 900))
                .thenReturn("https://agroloop-prod.s3.amazonaws.com/waste/test.jpg?X-Amz-Signature=abc");

        StorageManager storageManager = new StorageManager(
                mockLocalStorageService,
                mockS3StorageService,
                properties
        );

        String url = storageManager.generatePresignedUploadUrl("waste/test.jpg", "image/jpeg", 900);
        assertNotNull(url);
        assertTrue(url.contains("agroloop-prod.s3.amazonaws.com"));
        verify(mockS3StorageService, times(1)).generatePresignedUploadUrl("waste/test.jpg", "image/jpeg", 900);
    }

    @Test
    @DisplayName("Delegates loadFilePath and deleteFile to active provider")
    void testLoadFilePathAndDelete() {
        properties.setProvider(StorageProvider.LOCAL);
        properties.setUploadDir(tempDir.toString());

        Path expectedPath = tempDir.resolve("products/pic.jpg");
        when(mockLocalStorageService.loadFilePath("products/pic.jpg")).thenReturn(expectedPath);

        StorageManager storageManager = new StorageManager(
                mockLocalStorageService,
                mockS3StorageService,
                properties
        );

        Path res = storageManager.loadFilePath("products/pic.jpg");
        assertEquals(expectedPath, res);

        storageManager.deleteFile("products/pic.jpg");
        verify(mockLocalStorageService, times(1)).loadFilePath("products/pic.jpg");
        verify(mockLocalStorageService, times(1)).deleteFile("products/pic.jpg");
    }
}
