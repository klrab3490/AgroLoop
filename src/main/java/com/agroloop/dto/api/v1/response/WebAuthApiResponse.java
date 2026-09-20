package com.agroloop.dto.api.v1.response;

public record WebAuthApiResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserApiResponse user
) {
    public WebAuthApiResponse(UserApiResponse user, String accessToken, long expiresIn) {
        this(accessToken, "Bearer", expiresIn, user);
    }

    public static WebAuthApiResponse of(String accessToken, long expiresIn, UserApiResponse user) {
        return new WebAuthApiResponse(accessToken, "Bearer", expiresIn, user);
    }
}
