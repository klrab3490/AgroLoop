package com.agroloop.dto.api.v1.request;

import com.agroloop.model.QualityGrade;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record VerifyWasteApiRequest(
        @NotNull(message = "Verified weight is required")
        @DecimalMin(value = "0.01", message = "Verified weight must be greater than zero")
        BigDecimal verifiedWeight,

        @NotNull(message = "Quality grade is required (GRADE_A, GRADE_B, GRADE_C, REJECTED)")
        QualityGrade qualityGrade,

        String mediaId,

        @Size(max = 500, message = "Notes cannot exceed 500 characters")
        String notes
) {}
