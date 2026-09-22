package com.agroloop.dto;

/**
 * Encapsulates pre-configured development/demo credentials for evaluation environments.
 * Strictly populated into the presentation model only when demoMode == true.
 * Never rendered or serialized in production mode.
 */
public record DemoCredentials(
        String adminEmail,
        String adminPassword,
        String householdEmail,
        String householdPassword,
        String farmerEmail,
        String farmerPassword,
        String pgAdminEmail,
        String pgAdminPassword,
        String pgAdminUrl,
        String restApiUrl
) {
    public static DemoCredentials createDefault(String serverBaseUrl) {
        String base = (serverBaseUrl != null && !serverBaseUrl.isBlank()) ? serverBaseUrl : "http://localhost:8080";
        return new DemoCredentials(
                "admin@agroloop.com",
                "admin123",
                "household@agroloop.com",
                "household123",
                "farmer@agroloop.com",
                "farmer123",
                "admin@agroloop.local",
                "admin",
                "http://localhost:5055",
                base + "/api/v1/admin"
        );
    }
}
