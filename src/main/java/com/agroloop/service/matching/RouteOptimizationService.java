package com.agroloop.service.matching;

import com.agroloop.model.Farmer;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.WasteSubmission;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Service that computes optimal stop sequences for collection routes
 * using nearest-neighbor Traveling Salesperson Problem (TSP) heuristic.
 */
@Service
public class RouteOptimizationService {

    public static class OptimizedStopPlan {
        private final PickupRequest pickupRequest;
        private final int stopOrder;
        private final double distanceFromPrevKm;

        public OptimizedStopPlan(PickupRequest pickupRequest, int stopOrder, double distanceFromPrevKm) {
            this.pickupRequest = pickupRequest;
            this.stopOrder = stopOrder;
            this.distanceFromPrevKm = distanceFromPrevKm;
        }

        public PickupRequest getPickupRequest() {
            return pickupRequest;
        }

        public int getStopOrder() {
            return stopOrder;
        }

        public double getDistanceFromPrevKm() {
            return distanceFromPrevKm;
        }
    }

    public static class RoutePlan {
        private final List<OptimizedStopPlan> stops;
        private final double totalDistanceKm;
        private final String navigationUrl;

        public RoutePlan(List<OptimizedStopPlan> stops, double totalDistanceKm, String navigationUrl) {
            this.stops = stops;
            this.totalDistanceKm = Math.round(totalDistanceKm * 100.0) / 100.0;
            this.navigationUrl = navigationUrl;
        }

        public List<OptimizedStopPlan> getStops() {
            return stops;
        }

        public double getTotalDistanceKm() {
            return totalDistanceKm;
        }

        public String getNavigationUrl() {
            return navigationUrl;
        }
    }

    /**
     * Orders the selected pickups into an optimized sequence starting from the farmer's base location.
     */
    public RoutePlan optimizeRoute(Farmer farmer, List<PickupRequest> pickups) {
        if (pickups == null || pickups.isEmpty()) {
            return new RoutePlan(List.of(), 0.0, "");
        }

        Double currentLat = farmer.getLatitude() != null ? farmer.getLatitude() : 10.8505;
        Double currentLng = farmer.getLongitude() != null ? farmer.getLongitude() : 76.2711;

        List<PickupRequest> unvisited = new ArrayList<>(pickups);
        List<OptimizedStopPlan> plannedStops = new ArrayList<>();
        double cumulativeDistance = 0.0;

        StringBuilder navUrl = new StringBuilder("https://www.google.com/maps/dir/");
        navUrl.append(String.format("%.6f,%.6f/", currentLat, currentLng));

        int order = 1;
        while (!unvisited.isEmpty()) {
            PickupRequest nearest = null;
            double minDistance = Double.MAX_VALUE;

            for (PickupRequest p : unvisited) {
                WasteSubmission s = p.getWasteSubmission();
                Double pLat = s != null && s.getLatitude() != null ? s.getLatitude() : currentLat;
                Double pLng = s != null && s.getLongitude() != null ? s.getLongitude() : currentLng;

                double d = GeoUtils.haversineDistanceKm(currentLat, currentLng, pLat, pLng);
                if (d < minDistance) {
                    minDistance = d;
                    nearest = p;
                }
            }

            if (nearest != null) {
                unvisited.remove(nearest);
                cumulativeDistance += minDistance;
                plannedStops.add(new OptimizedStopPlan(nearest, order++, minDistance));

                WasteSubmission s = nearest.getWasteSubmission();
                currentLat = s != null && s.getLatitude() != null ? s.getLatitude() : currentLat;
                currentLng = s != null && s.getLongitude() != null ? s.getLongitude() : currentLng;
                navUrl.append(String.format("%.6f,%.6f/", currentLat, currentLng));
            }
        }

        return new RoutePlan(plannedStops, cumulativeDistance, navUrl.toString());
    }
}
