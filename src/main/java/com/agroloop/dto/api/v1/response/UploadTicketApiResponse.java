package com.agroloop.dto.api.v1.response;

import java.time.LocalDateTime;

public record UploadTicketApiResponse(
    String mediaId,
    String uploadUrl,
    LocalDateTime expiresAt,
    long maxSizeBytes
) {}
