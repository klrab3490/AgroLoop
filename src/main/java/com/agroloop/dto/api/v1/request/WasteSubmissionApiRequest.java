package com.agroloop.dto.api.v1.request;

import com.agroloop.model.WasteCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record WasteSubmissionApiRequest(
        @NotNull(message = "Waste category is required")
        WasteCategory category,

        @NotNull(message = "Estimated weight is required")
        @DecimalMin(value = "0.1", message = "Estimated weight must be at least 0.1 kg")
        BigDecimal estimatedWeight,

        String mediaId,

        String addressOverride,

        String notes,

        Double latitude,

        Double longitude
) {
    public WasteSubmissionApiRequest(WasteCategory category, BigDecimal estimatedWeight, String mediaId, String addressOverride) {
        this(category, estimatedWeight, mediaId, addressOverride, null, null, null);
    }

    public WasteSubmissionApiRequest(WasteCategory category, BigDecimal estimatedWeight, String mediaId, String addressOverride, String notes) {
        this(category, estimatedWeight, mediaId, addressOverride, notes, null, null);
    }
}
