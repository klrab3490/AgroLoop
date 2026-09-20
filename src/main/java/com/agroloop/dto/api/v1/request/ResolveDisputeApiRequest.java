package com.agroloop.dto.api.v1.request;

import com.agroloop.model.DisputeResolution;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResolveDisputeApiRequest(
        @NotNull(message = "Resolution is required (APPROVED_REFUND or DISMISSED)")
        DisputeResolution resolution,

        @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
        String adminNotes
) {}
