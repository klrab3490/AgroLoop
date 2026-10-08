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
        Double estimatedWeight,
        Double latitude,
        Double longitude,
        String userName,
        String userEmail,
        String householdName,
        String householdEmail
) {
    public RouteStopApiResponse(
            Long id,
            Long pickupId,
            int stopOrder,
            String status,
            Double estimatedDistanceFromPrevKm,
            LocalDateTime completedAt,
            String notes,
            String category,
            String pickupAddress,
            Double estimatedWeight,
            Double latitude,
            Double longitude
    ) {
        this(id, pickupId, stopOrder, status, estimatedDistanceFromPrevKm, completedAt, notes,
                category, pickupAddress, estimatedWeight, latitude, longitude, null, null, null, null);
    }

    public static RouteStopApiResponse from(RouteStop stop) {
        if (stop == null) return null;
        var pickup = stop.getPickupRequest();
        var sub = pickup != null ? pickup.getWasteSubmission() : null;
        var household = sub != null ? sub.getHousehold() : null;
        String name = household != null ? household.getName() : null;
        String email = household != null ? household.getEmail() : null;

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
                sub != null && sub.getEstimatedWeight() != null ? sub.getEstimatedWeight().doubleValue() : 0.0,
                sub != null ? sub.getLatitude() : null,
                sub != null ? sub.getLongitude() : null,
                name,
                email,
                name,
                email
        );
    }
}
