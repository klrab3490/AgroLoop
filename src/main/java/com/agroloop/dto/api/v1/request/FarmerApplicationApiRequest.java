package com.agroloop.dto.api.v1.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FarmerApplicationApiRequest(
        @NotBlank(message = "Farm name is required")
        @Size(min = 2, max = 150, message = "Farm name must be between 2 and 150 characters")
        String farmName,

        @NotBlank(message = "Farm address is required")
        @Size(min = 5, max = 500, message = "Farm address must be between 5 and 500 characters")
        String farmAddress,

        @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
        String notes
) {}
