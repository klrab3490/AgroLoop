package com.agroloop.model;

/**
 * Lifecycle states for marketplace orders.
 */
public enum OrderStatus {

    PLACED("Placed", "Order has been confirmed and tokens have been debited."),
    COMPLETED("Completed", "Order produce has been delivered or fulfilled."),
    DISPUTED("Disputed", "Order is contested and pending administrative adjudication."),
    CANCELLED("Cancelled", "Order was cancelled and tokens refunded.");

    private final String displayName;
    private final String description;

    OrderStatus(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }
}
