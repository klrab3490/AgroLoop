package com.agroloop.service.matching;

/**
 * Utility for spherical distance calculations using the Haversine formula.
 */
public final class GeoUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;

    private GeoUtils() {
        // Utility class
    }

    /**
     * Calculates the great-circle distance between two GPS coordinates in kilometers.
     */
    public static double haversineDistanceKm(
            Double lat1, Double lon1,
            Double lat2, Double lon2
    ) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return 0.0;
        }

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double originLat = Math.toRadians(lat1);
        double destLat = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(originLat) * Math.cos(destLat);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round((EARTH_RADIUS_KM * c) * 100.0) / 100.0;
    }
}
