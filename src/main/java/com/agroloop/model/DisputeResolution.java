package com.agroloop.model;

/**
 * Outcome of an administrative adjudication on a disputed order.
 */
public enum DisputeResolution {
    APPROVED_REFUND("Approved Refund", "Dispute upheld by administrator, inventory restocked and tokens refunded."),
    DISMISSED("Dismissed", "Dispute rejected by administrator; order remains active.");

    private final String displayName;
    private final String description;

    DisputeResolution(String displayName, String description) {
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
