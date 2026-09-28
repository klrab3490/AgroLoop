package com.agroloop.dto.api.v1.response;

public record ReputationSummaryApiResponse(
        Long userId,
        String userName,
        String userRole,
        Double averageRating,
        long reviewCount,
        long fiveStarCount,
        long fourStarCount,
        long threeStarCount,
        long twoStarCount,
        long oneStarCount,
        String trustBadge
) {
    public static String computeTrustBadge(Double averageRating, long reviewCount) {
        if (reviewCount == 0 || averageRating == null) {
            return "NEWCOMER";
        }
        if (averageRating >= 4.8 && reviewCount >= 10) {
            return "ELITE_PARTNER";
        }
        if (averageRating >= 4.5 && reviewCount >= 5) {
            return "TOP_RATED";
        }
        if (averageRating >= 4.0 && reviewCount >= 3) {
            return "VERIFIED_COMMUNITY_PARTNER";
        }
        if (averageRating >= 3.0) {
            return "ACTIVE_MEMBER";
        }
        return "UNDER_OBSERVATION";
    }
}
