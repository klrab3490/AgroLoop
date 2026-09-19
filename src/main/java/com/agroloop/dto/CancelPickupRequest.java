package com.agroloop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Form backing object for household pickup cancellation.
 */
public class CancelPickupRequest {

    @NotBlank(message = "Cancellation reason cannot be blank")
    @Size(max = 500, message = "Cancellation reason cannot exceed 500 characters")
    private String reason;

    public CancelPickupRequest() {
    }

    public CancelPickupRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
