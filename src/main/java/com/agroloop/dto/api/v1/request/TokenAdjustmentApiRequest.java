package com.agroloop.dto.api.v1.request;

import com.agroloop.model.TransactionDirection;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record TokenAdjustmentApiRequest(
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        @NotNull(message = "Direction is required (CREDIT or DEBIT)")
        TransactionDirection direction,

        @NotBlank(message = "Reason is required")
        @Size(max = 255, message = "Reason cannot exceed 255 characters")
        String reason
) {}
