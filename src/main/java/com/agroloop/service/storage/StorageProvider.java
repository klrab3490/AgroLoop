package com.agroloop.service.storage;

public enum StorageProvider {
    LOCAL("Local Filesystem", "Direct disk storage with UUID hashing and path traversal guards"),
    S3("Amazon Web Services S3", "AWS Simple Storage Service cloud object bucket"),
    MINIO("MinIO Object Storage", "Self-hosted S3-compatible cloud object store");

    private final String displayName;
    private final String description;

    StorageProvider(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }
}
