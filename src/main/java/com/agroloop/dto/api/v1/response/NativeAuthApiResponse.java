package com.agroloop.dto.api.v1.response;

public record NativeAuthApiResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String refreshToken,
        UserApiResponse user
) {
    public NativeAuthApiResponse(UserApiResponse user, String accessToken, String refreshToken, long expiresIn) {
        this(accessToken, "Bearer", expiresIn, refreshToken, user);
    }

    public static NativeAuthApiResponse of(String accessToken, String refreshToken, long expiresIn, UserApiResponse user) {
        return new NativeAuthApiResponse(accessToken, "Bearer", expiresIn, refreshToken, user);
    }
}
