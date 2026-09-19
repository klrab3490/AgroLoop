package com.agroloop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Form backing DTO for completing marketplace order checkout.
 * Pricing is strictly omitted to prevent client-side price manipulation;
 * authoritative totals are computed server-side directly from the database.
 */
public class CheckoutRequest {

    @NotBlank(message = "Delivery address is required")
    @Size(max = 500, message = "Delivery address cannot exceed 500 characters")
    private String deliveryAddress;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    private String notes;

    public CheckoutRequest() {
    }

    public CheckoutRequest(String deliveryAddress, String notes) {
        this.deliveryAddress = deliveryAddress;
        this.notes = notes;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
