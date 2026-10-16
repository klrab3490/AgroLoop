package com.agroloop.model;

/**
 * Domain enumeration for structured refund reasons.
 */
public enum RefundReason {
    HOUSEHOLD_CANCELLATION("Household Cancellation"),
    FARMER_CANCELLATION("Supplier Cancellation"),
    ADMIN_CANCELLATION("Administrative Cancellation"),
    DISPUTE_APPROVED("Dispute Approved Refund");

    private final String displayName;

    RefundReason(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
