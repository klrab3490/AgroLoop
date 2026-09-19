package com.agroloop.model;

/**
 * Lifecycle state transitions for waste collection pickup requests.
 * Enforces the progression:
 * REQUESTED -> ASSIGNED -> SCHEDULED -> COLLECTED -> VERIFIED
 * with cancellation and decline/re-queue pathways.
 */
public enum PickupStatus {

    /**
     * Freshly created pickup request awaiting a farmer to accept/claim it.
     */
    REQUESTED("Requested", "Awaiting a local farmer to claim pickup"),

    /**
     * A farmer has claimed the pickup request.
     */
    ASSIGNED("Assigned", "Claimed by a farmer partner"),

    /**
     * The farmer has scheduled a collection appointment time slot.
     */
    SCHEDULED("Scheduled", "Collection appointment scheduled"),

    /**
     * Organic waste has been physically retrieved from the household location.
     */
    COLLECTED("Collected", "Waste physically collected by farmer"),

    /**
     * Post-collection inspection has been completed and verified (weight & quality grade).
     */
    VERIFIED("Verified", "Post-collection inspection verified"),

    /**
     * Cancelled by household prior to physical collection.
     */
    CANCELLED("Cancelled", "Cancelled prior to collection");

    private final String displayName;
    private final String description;

    PickupStatus(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Returns true if the pickup request is available to be claimed by a farmer.
     */
    public boolean canBeClaimed() {
        return this == REQUESTED;
    }

    /**
     * Returns true if the household is still eligible to cancel the pickup request.
     * Cancellation is allowed only before physical collection takes place.
     */
    public boolean isEligibleForCancellation() {
        return this == REQUESTED || this == ASSIGNED || this == SCHEDULED;
    }

    /**
     * Returns true if the pickup request has reached an immutable terminal state.
     */
    public boolean isTerminal() {
        return this == VERIFIED || this == CANCELLED;
    }
}
