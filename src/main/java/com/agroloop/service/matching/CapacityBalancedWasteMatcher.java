package com.agroloop.service.matching;

import com.agroloop.model.Farmer;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.WasteSubmission;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Capacity-balanced matching strategy prioritizing batches that optimize the farmer's
 * vehicle payload without exceeding max daily collection capacity.
 */
@Component("capacityBalancedWasteMatcher")
public class CapacityBalancedWasteMatcher implements WasteMatcher {

    public static final String STRATEGY_NAME = "CAPACITY";

    @Override
    public String getStrategyName() {
        return STRATEGY_NAME;
    }

    @Override
    public List<WasteMatchResult> match(
            Farmer farmer,
            List<PickupRequest> availablePickups,
            BigDecimal currentRouteLoadKg
    ) {
        if (farmer == null || availablePickups == null || availablePickups.isEmpty()) {
            return List.of();
        }

        Double farmerLat = farmer.getLatitude() != null ? farmer.getLatitude() : 10.8505;
        Double farmerLng = farmer.getLongitude() != null ? farmer.getLongitude() : 76.2711;
        Double radiusKm = farmer.getServiceRadiusKm() != null ? farmer.getServiceRadiusKm() : 25.0;

        BigDecimal maxCapacity = farmer.getMaxDailyCapacityKg() != null ? farmer.getMaxDailyCapacityKg() : new BigDecimal("200.00");
        BigDecimal currentLoad = currentRouteLoadKg != null ? currentRouteLoadKg : BigDecimal.ZERO;
        BigDecimal remainingCapacity = maxCapacity.subtract(currentLoad).max(BigDecimal.ZERO);

        List<WasteMatchResult> results = new ArrayList<>();

        for (PickupRequest pickup : availablePickups) {
            WasteSubmission submission = pickup.getWasteSubmission();
            Double subLat = submission != null && submission.getLatitude() != null ? submission.getLatitude() : farmerLat;
            Double subLng = submission != null && submission.getLongitude() != null ? submission.getLongitude() : farmerLng;

            double distanceKm = GeoUtils.haversineDistanceKm(farmerLat, farmerLng, subLat, subLng);
            boolean withinRadius = distanceKm <= radiusKm;

            BigDecimal weight = submission != null ? submission.getEstimatedWeight() : BigDecimal.ZERO;
            boolean withinCap = remainingCapacity.compareTo(weight) >= 0;

            // Score: higher score for batches that efficiently use available capacity without overflowing
            double score;
            if (withinCap && remainingCapacity.compareTo(BigDecimal.ZERO) > 0) {
                // Ratio of weight to remaining capacity (sweet spot is substantial batches)
                double fillRatio = weight.divide(remainingCapacity, 4, RoundingMode.HALF_UP).doubleValue();
                score = Math.min(100.0, fillRatio * 80.0 + 20.0);
            } else {
                score = 15.0; // Overflow or zero capacity
            }

            if (!withinRadius) {
                score *= 0.6; // distance penalty
            }

            String reason = String.format("Weight: %.1f kg (Remaining Capacity: %.1f kg)", weight.doubleValue(), remainingCapacity.doubleValue());
            results.add(new WasteMatchResult(pickup, distanceKm, score, reason, withinRadius, withinCap));
        }

        // Sort by matchScore descending
        results.sort(Comparator.comparingDouble(WasteMatchResult::getMatchScore).reversed());
        return results;
    }
}
