package com.agroloop.dto.api.v1.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateFarmerLocationApiRequest(
        @NotNull(message = "Latitude is required")
        Double latitude,

        @NotNull(message = "Longitude is required")
        Double longitude,

        @DecimalMin(value = "0.1", message = "Service radius must be at least 0.1 km")
        Double serviceRadiusKm,

        @DecimalMin(value = "1.0", message = "Max daily capacity must be at least 1.0 kg")
        BigDecimal maxDailyCapacityKg
) {
}
