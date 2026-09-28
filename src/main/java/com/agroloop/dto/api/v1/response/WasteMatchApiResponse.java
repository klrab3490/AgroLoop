package com.agroloop.dto.api.v1.response;

import com.agroloop.service.matching.WasteMatchResult;

public record WasteMatchApiResponse(
        Long pickupId,
        String category,
        String householdName,
        String pickupAddress,
        Double estimatedWeightKg,
        Double distanceKm,
        Double matchScore,
        String matchReason,
        boolean withinServiceRadius,
        boolean withinCapacity
) {
    public static WasteMatchApiResponse from(WasteMatchResult result) {
        if (result == null) return null;
        var pickup = result.getPickupRequest();
        var sub = pickup != null ? pickup.getWasteSubmission() : null;

        return new WasteMatchApiResponse(
                pickup != null ? pickup.getId() : null,
                sub != null && sub.getCategory() != null ? sub.getCategory().name() : null,
                sub != null && sub.getHousehold() != null ? sub.getHousehold().getName() : null,
                sub != null ? sub.getPickupAddress() : null,
                result.getEstimatedWeight() != null ? result.getEstimatedWeight().doubleValue() : 0.0,
                result.getDistanceKm(),
                result.getMatchScore(),
                result.getMatchReason(),
                result.isWithinServiceRadius(),
                result.isWithinCapacity()
        );
    }
}
