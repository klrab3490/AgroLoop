package com.agroloop.model;

/**
 * Categorization of system and lifecycle real-time notifications in AgroLoop.
 */
public enum NotificationType {
    PICKUP_CLAIMED("Pickup Claimed", "A farmer has claimed your waste collection request"),
    PICKUP_SCHEDULED("Pickup Scheduled", "A collection appointment time slot has been confirmed"),
    PICKUP_COLLECTED("Waste Collected", "Organic waste has been physically retrieved"),
    TOKENS_MINTED("EcoTokens Rewarded", "New EcoTokens have been credited to your balance"),
    ORDER_PLACED("Order Received", "A buyer placed an order for your produce"),
    ORDER_STATUS_CHANGED("Order Status Updated", "An order has transitioned to a new state"),
    NEW_REVIEW("New Trust Review", "You received a new peer rating and feedback"),
    NEW_NEARBY_WASTE("Nearby Waste Available", "New waste submission available in your service radius"),
    SYSTEM_ALERT("System Notice", "Administrative or platform broadcast");

    private final String displayName;
    private final String description;

    NotificationType(String displayName, String description) {
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
