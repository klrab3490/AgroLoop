package com.agroloop.model;

/**
 * Lifecycle state transitions for organic waste submissions.
 * Follows the flow: SUBMITTED -> CLAIMED -> COLLECTED -> VERIFIED (or REJECTED).
 */
public enum SubmissionStatus {

    /**
     * Newly submitted by a household, waiting to be claimed by a nearby farmer partner.
     */
    SUBMITTED("Submitted", "Awaiting collection claim by a local farmer"),

    /**
     * Claimed by an authorized farmer partner for an upcoming pickup run.
     */
    CLAIMED("Claimed", "Claimed by a farmer partner for scheduled collection"),

    /**
     * Organic waste has been physically retrieved from the household pickup address.
     */
    COLLECTED("Collected", "Waste collected and en route to composting facility"),

    /**
     * Waste has been inspected, weighed, and approved for reward token minting.
     */
    VERIFIED("Verified", "Quality verified and EcoTokens minted"),

    /**
     * Submission rejected due to contamination, non-compostable contents, or cancellation.
     */
    REJECTED("Rejected", "Rejected during inspection or cancelled");

    private final String displayName;
    private final String description;

    SubmissionStatus(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public boolean canBeClaimed() {
        return this == SUBMITTED;
    }

    public boolean isTerminal() {
        return this == VERIFIED || this == REJECTED;
    }
}
