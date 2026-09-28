package com.agroloop.service.matching;

import com.agroloop.model.Farmer;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.WasteSubmission;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Default composite matching strategy balancing proximity (40%), payload capacity (35%),
 * and submission age/urgency (25%) to prevent older submissions from starving.
 */
@Component("compositeWasteMatcher")
@Primary
public class CompositeWasteMatcher implements WasteMatcher {

    public static final String STRATEGY_NAME = "COMPOSITE";

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

        LocalDateTime now = LocalDateTime.now();
        List<WasteMatchResult> results = new ArrayList<>();

        for (PickupRequest pickup : availablePickups) {
            WasteSubmission submission = pickup.getWasteSubmission();
            Double subLat = submission != null && submission.getLatitude() != null ? submission.getLatitude() : farmerLat;
            Double subLng = submission != null && submission.getLongitude() != null ? submission.getLongitude() : farmerLng;

            double distanceKm = GeoUtils.haversineDistanceKm(farmerLat, farmerLng, subLat, subLng);
            boolean withinRadius = distanceKm <= radiusKm;

            BigDecimal weight = submission != null ? submission.getEstimatedWeight() : BigDecimal.ZERO;
            boolean withinCap = remainingCapacity.compareTo(weight) >= 0;

            // 1. Proximity Score (0 to 40)
            double proximityScore = withinRadius
                    ? 40.0 * (1.0 - (distanceKm / radiusKm))
                    : Math.max(0.0, 20.0 - (distanceKm - radiusKm));

            // 2. Capacity Score (0 to 35)
            double capacityScore;
            if (withinCap && remainingCapacity.compareTo(BigDecimal.ZERO) > 0) {
                double fillRatio = weight.divide(remainingCapacity, 4, RoundingMode.HALF_UP).doubleValue();
                capacityScore = Math.min(35.0, fillRatio * 30.0 + 5.0);
            } else {
                capacityScore = 5.0;
            }

            // 3. Urgency / Wait Time Score (0 to 25)
            long hoursWaiting = 0;
            if (pickup.getCreatedAt() != null) {
                hoursWaiting = Math.max(0, Duration.between(pickup.getCreatedAt(), now).toHours());
            }
            // Max urgency score reached after 48 hours waiting
            double urgencyScore = Math.min(25.0, (hoursWaiting / 48.0) * 25.0);

            double totalScore = proximityScore + capacityScore + urgencyScore;

            String reason = String.format("%.1f km | %.1f kg | waiting %dh", distanceKm, weight.doubleValue(), hoursWaiting);
            results.add(new WasteMatchResult(pickup, distanceKm, totalScore, reason, withinRadius, withinCap));
        }

        // Sort descending by total composite score
        results.sort(Comparator.comparingDouble(WasteMatchResult::getMatchScore).reversed());
        return results;
    }
}
