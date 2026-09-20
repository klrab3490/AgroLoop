package com.agroloop.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Domain entity managing the lifecycle and state transitions of a waste collection pickup.
 * Encapsulates the state machine:
 * REQUESTED -> ASSIGNED -> SCHEDULED -> COLLECTED -> VERIFIED
 * with farmer decline (re-queue to REQUESTED) and household cancellation.
 */
@Entity
@Table(name = "pickup_requests")
public class PickupRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "waste_submission_id", nullable = false, unique = true)
    private WasteSubmission wasteSubmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id")
    private Farmer assignedFarmer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PickupStatus status;

    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;

    @Column(name = "collected_at")
    private LocalDateTime collectedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "decline_reason", length = 500)
    private String declineReason;

    @Column(name = "declined_at")
    private LocalDateTime declinedAt;

    @Version
    private Long version;

    @OneToOne(mappedBy = "pickupRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private WasteVerification verification;

    @Column(name = "latest_handshake_id")
    private Long latestHandshakeId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PickupRequest() {
        // Required by JPA.
    }

    public PickupRequest(WasteSubmission wasteSubmission) {
        this.wasteSubmission = Objects.requireNonNull(wasteSubmission, "Waste submission cannot be null");
        this.status = PickupStatus.REQUESTED;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- State Machine Transition Methods ---

    /**
     * Farmer claims this pickup request. Only valid when status is REQUESTED.
     */
    public void accept(Farmer farmer) {
        if (this.status != PickupStatus.REQUESTED) {
            throw new IllegalStateException("Only REQUESTED pickups can be accepted. Current status: " + this.status);
        }
        this.assignedFarmer = Objects.requireNonNull(farmer, "Farmer cannot be null");
        this.status = PickupStatus.ASSIGNED;
        this.declineReason = null;
        this.declinedAt = null;

        if (this.wasteSubmission != null && this.wasteSubmission.getStatus() == SubmissionStatus.SUBMITTED) {
            this.wasteSubmission.markClaimed();
        }
    }

    /**
     * Schedules a collection appointment time slot.
     * Allowed only when status is ASSIGNED (or re-scheduling when SCHEDULED).
     * Enforces strictly future date/time directly in domain logic.
     */
    public void schedule(LocalDateTime slot) {
        if (this.status != PickupStatus.ASSIGNED && this.status != PickupStatus.SCHEDULED) {
            throw new IllegalStateException("Only ASSIGNED or SCHEDULED pickups can be scheduled. Current status: " + this.status);
        }
        if (this.assignedFarmer == null) {
            throw new IllegalStateException("Cannot schedule pickup without an assigned farmer");
        }
        Objects.requireNonNull(slot, "Scheduled time cannot be null");
        if (!slot.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Scheduled pickup time must be strictly in the future");
        }

        this.scheduledTime = slot;
        this.status = PickupStatus.SCHEDULED;
    }

    /**
     * Farmer physically collects the waste from household location.
     * Allowed only when status is SCHEDULED.
     */
    public void markCollected() {
        if (this.status != PickupStatus.SCHEDULED) {
            throw new IllegalStateException("Only SCHEDULED pickups can be collected. Current status: " + this.status);
        }
        this.status = PickupStatus.COLLECTED;
        this.collectedAt = LocalDateTime.now();

        if (this.wasteSubmission != null && this.wasteSubmission.getStatus() == SubmissionStatus.CLAIMED) {
            this.wasteSubmission.markCollected();
        }
    }

    /**
     * Records physical post-collection inspection and quality grading.
     * Allowed only when status is COLLECTED.
     * Strictly verifies that the inspection was performed by the currently assigned farmer.
     */
    public void recordVerification(WasteVerification verification) {
        if (this.status != PickupStatus.COLLECTED) {
            throw new IllegalStateException("Only COLLECTED pickups can be verified. Current status: " + this.status);
        }
        Objects.requireNonNull(verification, "Waste verification cannot be null");

        if (verification.getPickupRequest() != null && !this.equals(verification.getPickupRequest())) {
            throw new IllegalArgumentException("Verification belongs to a different pickup request");
        }

        if (this.assignedFarmer == null || !this.assignedFarmer.equals(verification.getVerifiedByFarmer())) {
            throw new IllegalStateException("Verification must be performed by the currently assigned farmer");
        }

        this.verification = verification;
        this.status = PickupStatus.VERIFIED;

        if (this.wasteSubmission != null && this.wasteSubmission.getStatus() == SubmissionStatus.COLLECTED) {
            this.wasteSubmission.markVerified();
        }
    }

    /**
     * Cancels the pickup request. Allowed only before physical collection (REQUESTED, ASSIGNED, SCHEDULED).
     */
    public void cancel(String reason) {
        if (!this.status.isEligibleForCancellation()) {
            throw new IllegalStateException("Pickup cannot be cancelled in status: " + this.status);
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Cancellation reason cannot be blank");
        }

        this.status = PickupStatus.CANCELLED;
        this.cancelledAt = LocalDateTime.now();
        this.cancellationReason = reason.trim();

        if (this.wasteSubmission != null && !this.wasteSubmission.getStatus().isTerminal()) {
            this.wasteSubmission.markCancelled(this.cancellationReason);
        }
    }

    /**
     * Farmer declines or relinquishes the assignment.
     * Allowed only in ASSIGNED or SCHEDULED status.
     * Resets status to REQUESTED, unassigns the farmer, clears scheduled time, and records decline reason and timestamp for audit.
     */
    public void decline(String reason) {
        if (this.status != PickupStatus.ASSIGNED && this.status != PickupStatus.SCHEDULED) {
            throw new IllegalStateException("Only ASSIGNED or SCHEDULED pickups can be declined. Current status: " + this.status);
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Decline reason cannot be blank");
        }

        this.status = PickupStatus.REQUESTED;
        this.assignedFarmer = null;
        this.scheduledTime = null;
        this.declineReason = reason.trim();
        this.declinedAt = LocalDateTime.now();

        if (this.wasteSubmission != null && this.wasteSubmission.getStatus() == SubmissionStatus.CLAIMED) {
            this.wasteSubmission.revertToSubmitted();
        }
    }

    // --- Query Methods ---

    public boolean isEligibleForCancellation() {
        return this.status.isEligibleForCancellation();
    }

    public boolean isTerminal() {
        return this.status.isTerminal();
    }

    // --- Getters ---

    public Long getId() {
        return id;
    }

    public WasteSubmission getWasteSubmission() {
        return wasteSubmission;
    }

    public Farmer getAssignedFarmer() {
        return assignedFarmer;
    }

    public PickupStatus getStatus() {
        return status;
    }

    public LocalDateTime getScheduledTime() {
        return scheduledTime;
    }

    public LocalDateTime getCollectedAt() {
        return collectedAt;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public String getDeclineReason() {
        return declineReason;
    }

    public LocalDateTime getDeclinedAt() {
        return declinedAt;
    }

    public Long getVersion() {
        return version;
    }

    public WasteVerification getVerification() {
        return verification;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Long getLatestHandshakeId() {
        return latestHandshakeId;
    }

    public void setLatestHandshakeId(Long latestHandshakeId) {
        this.latestHandshakeId = latestHandshakeId;
    }
}
