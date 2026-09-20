package com.agroloop.dto.api.v1.request;

import com.agroloop.model.MediaPurpose;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UploadTicketApiRequest(
        @NotNull(message = "Media purpose is required")
        MediaPurpose purpose,

        @NotBlank(message = "Content type is required")
        String contentType,

        @NotNull(message = "File size in bytes is required")
        @Min(value = 1, message = "File size must be at least 1 byte")
        @Max(value = 10 * 1024 * 1024, message = "File size cannot exceed 10 MB")
        Long sizeBytes,

        String checksum
) {}
