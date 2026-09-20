package com.agroloop.dto.api.v1.request;

import com.agroloop.model.WasteCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record WasteSubmissionApiRequest(
        @NotNull(message = "Waste category is required")
        WasteCategory category,

        @NotNull(message = "Estimated weight is required")
        @DecimalMin(value = "0.1", message = "Estimated weight must be at least 0.1 kg")
        BigDecimal estimatedWeight,

        @NotBlank(message = "mediaId is required")
        String mediaId,

        String addressOverride
) {}
