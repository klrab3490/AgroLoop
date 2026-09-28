package com.agroloop.service.matching;

import com.agroloop.model.PickupRequest;

import java.math.BigDecimal;

/**
 * Result of evaluating a pickup request against a farmer using a polymorphic WasteMatcher strategy.
 */
public class WasteMatchResult {

    private final PickupRequest pickupRequest;
    private final double distanceKm;
    private final double matchScore; // 0 to 100
    private final String matchReason;
    private final boolean withinServiceRadius;
    private final boolean withinCapacity;

    public WasteMatchResult(
            PickupRequest pickupRequest,
            double distanceKm,
            double matchScore,
            String matchReason,
            boolean withinServiceRadius,
            boolean withinCapacity
    ) {
        this.pickupRequest = pickupRequest;
        this.distanceKm = distanceKm;
        this.matchScore = Math.max(0.0, Math.min(100.0, Math.round(matchScore * 10.0) / 10.0));
        this.matchReason = matchReason;
        this.withinServiceRadius = withinServiceRadius;
        this.withinCapacity = withinCapacity;
    }

    public PickupRequest getPickupRequest() {
        return pickupRequest;
    }

    public double getDistanceKm() {
        return distanceKm;
    }

    public double getMatchScore() {
        return matchScore;
    }

    public String getMatchReason() {
        return matchReason;
    }

    public boolean isWithinServiceRadius() {
        return withinServiceRadius;
    }

    public boolean isWithinCapacity() {
        return withinCapacity;
    }

    public BigDecimal getEstimatedWeight() {
        if (pickupRequest != null && pickupRequest.getWasteSubmission() != null) {
            return pickupRequest.getWasteSubmission().getEstimatedWeight();
        }
        return BigDecimal.ZERO;
    }
}
