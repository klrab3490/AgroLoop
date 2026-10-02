package com.agroloop.dto.api.v1.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConvertUserToFarmerApiRequest(
        @NotBlank(message = "Farm name is required")
        @Size(max = 150, message = "Farm name cannot exceed 150 characters")
        String farmName,

        @NotBlank(message = "Farm address is required")
        @Size(max = 500, message = "Farm address cannot exceed 500 characters")
        String farmAddress,

        @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
        String notes
) {}
