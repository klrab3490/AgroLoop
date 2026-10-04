package com.agroloop.dto.api.v1.request;

import com.agroloop.model.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleApiRequest(
        @NotNull(message = "Role is required")
        Role role,

        String address,
        String farmName,
        String farmAddress,
        String notes
) {}
