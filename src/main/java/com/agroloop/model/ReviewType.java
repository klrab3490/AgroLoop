package com.agroloop.model;

/**
 * Categorization of peer reviews in the circular economy lifecycle.
 */
public enum ReviewType {
    PICKUP_EXPERIENCE("Pickup Experience", "Evaluation of waste collection handling, timing, and sorting"),
    COMPOST_QUALITY("Compost Quality", "Evaluation of circular marketplace compost, fertilizer, or produce"),
    GENERAL("Community Peer Review", "General community trust and collaboration feedback");

    private final String displayName;
    private final String description;

    ReviewType(String displayName, String description) {
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
