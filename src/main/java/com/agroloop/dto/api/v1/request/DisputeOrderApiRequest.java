package com.agroloop.dto.api.v1.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DisputeOrderApiRequest(
        @NotBlank(message = "Dispute reason is required")
        @Size(max = 500, message = "Dispute reason cannot exceed 500 characters")
        String disputeReason
) {}
