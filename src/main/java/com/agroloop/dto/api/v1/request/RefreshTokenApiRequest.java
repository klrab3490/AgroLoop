package com.agroloop.dto.api.v1.request;

import com.agroloop.model.ClientType;

public record RefreshTokenApiRequest(
        String refreshToken,
        String deviceName,
        ClientType clientType
) {}
