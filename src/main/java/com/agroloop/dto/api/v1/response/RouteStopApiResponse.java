package com.agroloop.dto.api.v1.response;

import com.agroloop.model.RouteStop;

import java.time.LocalDateTime;

public record RouteStopApiResponse(
        Long id,
        Long pickupId,
        int stopOrder,
        String status,
        Double estimatedDistanceFromPrevKm,
        LocalDateTime completedAt,
        String notes,
        String category,
        String pickupAddress,
        Double estimatedWeight
) {
    public static RouteStopApiResponse from(RouteStop stop) {
        if (stop == null) return null;
        var pickup = stop.getPickupRequest();
        var sub = pickup != null ? pickup.getWasteSubmission() : null;

        return new RouteStopApiResponse(
                stop.getId(),
                pickup != null ? pickup.getId() : null,
                stop.getStopOrder(),
                stop.getStatus().name(),
                stop.getEstimatedDistanceFromPrevKm(),
                stop.getCompletedAt(),
                stop.getNotes(),
                sub != null && sub.getCategory() != null ? sub.getCategory().name() : null,
                sub != null ? sub.getPickupAddress() : null,
                sub != null && sub.getEstimatedWeight() != null ? sub.getEstimatedWeight().doubleValue() : 0.0
        );
    }
}
