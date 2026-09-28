package com.agroloop.dto.api.v1.response;

import com.agroloop.service.storage.StorageProvider;

public record StorageDiagnosticsResponse(
        StorageProvider activeProvider,
        String providerDisplayName,
        boolean healthy,
        String targetLocation,
        boolean s3Configured,
        long latencyMs
) {
}
