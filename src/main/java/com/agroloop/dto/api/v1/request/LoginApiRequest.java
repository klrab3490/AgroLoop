package com.agroloop.dto.api.v1.request;

import com.agroloop.model.ClientType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginApiRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Password is required")
        String password,

        String deviceName,

        @NotNull(message = "clientType is required (MOBILE, DESKTOP, or WEB)")
        ClientType clientType
) {}
