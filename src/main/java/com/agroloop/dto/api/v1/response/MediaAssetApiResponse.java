package com.agroloop.dto.api.v1.response;

import com.agroloop.model.MediaAsset;
import java.time.LocalDateTime;

public record MediaAssetApiResponse(
    String mediaId,
    String purpose,
    String contentType,
    Long sizeBytes,
    String status,
    LocalDateTime expiresAt,
    LocalDateTime createdAt
) {
    public static MediaAssetApiResponse from(MediaAsset asset) {
        if (asset == null) {
            return null;
        }
        return new MediaAssetApiResponse(
            asset.getMediaId(),
            asset.getPurpose() != null ? asset.getPurpose().name() : null,
            asset.getContentType(),
            asset.getSizeBytes(),
            asset.getStatus() != null ? asset.getStatus().name() : null,
            asset.getExpiresAt(),
            asset.getCreatedAt()
        );
    }
}
