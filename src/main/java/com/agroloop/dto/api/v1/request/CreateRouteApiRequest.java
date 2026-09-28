package com.agroloop.dto.api.v1.request;

import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDate;
import java.util.List;

public record CreateRouteApiRequest(
        @NotEmpty(message = "At least one pickup request must be selected")
        List<Long> pickupIds,
        LocalDate routeDate,
        String notes
) {
}
