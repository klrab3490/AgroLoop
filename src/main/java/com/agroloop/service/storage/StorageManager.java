package com.agroloop.service.storage;

import com.agroloop.dto.api.v1.response.StorageDiagnosticsResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

/**
 * Primary Storage Facade managing polymorphic dispatch across Cloud Storage SPI providers
 * (Local, S3, MinIO) based on deployment configuration.
 */
@Service
@Primary
public class StorageManager implements CloudStorageService {

    private static final Logger logger = LoggerFactory.getLogger(StorageManager.class);

    private final CloudStorageService localFileStorageService;
    private final CloudStorageService s3MinioStorageService;
    private final StorageProperties properties;

    public StorageManager(
            @Qualifier("localFileStorageService") CloudStorageService localFileStorageService,
            @Qualifier("s3MinioStorageService") CloudStorageService s3MinioStorageService,
            StorageProperties properties
    ) {
        this.localFileStorageService = localFileStorageService;
        this.s3MinioStorageService = s3MinioStorageService;
        this.properties = properties;
        logger.info("Initialized StorageManager with active provider: {}", properties.getProvider());
    }

    private CloudStorageService getActiveProvider() {
        if (properties.getProvider() == StorageProvider.S3 || properties.getProvider() == StorageProvider.MINIO) {
            return s3MinioStorageService;
        }
        return localFileStorageService;
    }

    @Override
    public StorageProvider getProvider() {
        return properties.getProvider();
    }

    @Override
    public String storeFile(MultipartFile file, String subDirectory) {
        return getActiveProvider().storeFile(file, subDirectory);
    }

    @Override
    public Path loadFilePath(String relativePath) {
        return getActiveProvider().loadFilePath(relativePath);
    }

    @Override
    public void deleteFile(String relativePath) {
        getActiveProvider().deleteFile(relativePath);
    }

    @Override
    public String generatePresignedUploadUrl(String storageKey, String contentType, long expirationSeconds) {
        return getActiveProvider().generatePresignedUploadUrl(storageKey, contentType, expirationSeconds);
    }

    @Override
    public String generatePresignedDownloadUrl(String storageKey, long expirationSeconds) {
        return getActiveProvider().generatePresignedDownloadUrl(storageKey, expirationSeconds);
    }

    @Override
    public boolean isHealthy() {
        return getActiveProvider().isHealthy();
    }

    public StorageDiagnosticsResponse getDiagnostics() {
        long start = System.currentTimeMillis();
        boolean healthy = isHealthy();
        long latency = System.currentTimeMillis() - start;

        StorageProvider prov = getProvider();
        String location = (prov == StorageProvider.LOCAL)
                ? properties.getUploadDir()
                : properties.getS3().getEndpoint() + "/" + properties.getS3().getBucket();

        return new StorageDiagnosticsResponse(
                prov,
                prov.getDisplayName(),
                healthy,
                location,
                properties.getS3().getBucket() != null,
                latency
        );
    }
}
