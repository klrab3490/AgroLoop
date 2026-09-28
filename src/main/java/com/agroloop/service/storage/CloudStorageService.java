package com.agroloop.service.storage;

/**
 * Extended Storage Provider Interface (SPI) contract for object and file storage.
 * Supports local filesystem, AWS S3, and MinIO object storage backends.
 */
public interface CloudStorageService extends FileStorageService {

    StorageProvider getProvider();

    String generatePresignedUploadUrl(String storageKey, String contentType, long expirationSeconds);

    String generatePresignedDownloadUrl(String storageKey, long expirationSeconds);

    boolean isHealthy();
}
