package com.agroloop.service.matching;

import com.agroloop.model.Farmer;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.WasteSubmission;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Proximity-based matching strategy prioritizing pickups nearest to the farm.
 * Pickups within the farmer's configured service radius receive highest scores.
 */
@Component("distanceBasedWasteMatcher")
public class DistanceBasedWasteMatcher implements WasteMatcher {

    public static final String STRATEGY_NAME = "DISTANCE";

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

            // Score: 100 for 0 km down to 0 at service radius, penalty for exceeding radius
            double score = withinRadius ? Math.max(10.0, 100.0 * (1.0 - (distanceKm / radiusKm))) : Math.max(0.0, 50.0 - (distanceKm - radiusKm));
            if (!withinCap) {
                score *= 0.7; // slight penalty if capacity would be exceeded
            }

            String reason = String.format("Distance: %.1f km (Service Radius: %.0f km)", distanceKm, radiusKm);
            results.add(new WasteMatchResult(pickup, distanceKm, score, reason, withinRadius, withinCap));
        }

        results.sort(Comparator.comparingDouble(WasteMatchResult::getDistanceKm));
        return results;
    }
}
