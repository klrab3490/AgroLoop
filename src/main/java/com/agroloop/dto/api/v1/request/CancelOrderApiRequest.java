package com.agroloop.dto.api.v1.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelOrderApiRequest(
        @NotBlank(message = "Cancellation reason is required")
        @Size(max = 500, message = "Reason cannot exceed 500 characters")
        String reason
) {}
