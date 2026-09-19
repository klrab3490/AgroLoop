package com.agroloop.model;

/**
 * Lifecycle states for marketplace orders.
 * Cancellation and refund workflows are reserved for Phase 7 Admin Governance.
 */
public enum OrderStatus {

    PLACED("Placed", "Order has been confirmed and tokens have been debited."),
    COMPLETED("Completed", "Order produce has been delivered or fulfilled.");

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
