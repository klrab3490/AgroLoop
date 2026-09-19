package com.agroloop.model;

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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Domain entity representing an organic waste batch submitted by a Household.
 * Encapsulates submission details, estimated weight in kg, photographic evidence path,
 * pickup address, and lifecycle transitions.
 */
@Entity
@Table(name = "waste_submissions")
public class WasteSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WasteCategory category;

    @Column(name = "estimated_weight", nullable = false, precision = 10, scale = 2)
    private BigDecimal estimatedWeight;

    @Column(name = "pickup_address", nullable = false, length = 500)
    private String pickupAddress;

    @Column(name = "image_path", length = 500)
    private String imagePath;

    @Column(length = 1000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SubmissionStatus status;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected WasteSubmission() {
        // Required by JPA.
    }

    public WasteSubmission(
            Household household,
            WasteCategory category,
            BigDecimal estimatedWeight,
            String pickupAddress,
            String imagePath,
            String notes
    ) {
        this.household = Objects.requireNonNull(household, "Household cannot be null");
        this.category = Objects.requireNonNull(category, "Waste category cannot be null");
        this.estimatedWeight = validateWeight(estimatedWeight);
        this.pickupAddress = requireText(pickupAddress, "Pickup address");
        this.imagePath = sanitizePath(imagePath);
        this.notes = notes != null ? notes.trim() : null;
        this.status = SubmissionStatus.SUBMITTED;
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

    /**
     * Transitions submission state to CLAIMED when a farmer schedules a pickup.
     */
    public void markClaimed() {
        if (this.status != SubmissionStatus.SUBMITTED) {
            throw new IllegalStateException("Only SUBMITTED waste can be claimed. Current status: " + this.status);
        }
        this.status = SubmissionStatus.CLAIMED;
    }

    /**
     * Transitions submission state to COLLECTED when physical pickup completes.
     */
    public void markCollected() {
        if (this.status != SubmissionStatus.CLAIMED) {
            throw new IllegalStateException("Only CLAIMED waste can be marked as collected. Current status: " + this.status);
        }
        this.status = SubmissionStatus.COLLECTED;
    }

    /**
     * Transitions submission state to VERIFIED upon inspection and approval.
     */
    public void markVerified() {
        if (this.status != SubmissionStatus.COLLECTED) {
            throw new IllegalStateException("Only COLLECTED waste can be verified. Current status: " + this.status);
        }
        this.status = SubmissionStatus.VERIFIED;
    }

    /**
     * Rejects the submission with an explanatory reason.
     */
    public void markRejected(String reason) {
        if (this.status.isTerminal()) {
            throw new IllegalStateException("Cannot reject a submission that is already in terminal state: " + this.status);
        }
        this.status = SubmissionStatus.REJECTED;
        this.rejectionReason = requireText(reason, "Rejection reason");
    }

    // --- Getters ---

    public Long getId() {
        return id;
    }

    public Household getHousehold() {
        return household;
    }

    public WasteCategory getCategory() {
        return category;
    }

    public BigDecimal getEstimatedWeight() {
        return estimatedWeight;
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public String getImagePath() {
        return imagePath;
    }

    public String getNotes() {
        return notes;
    }

    public SubmissionStatus getStatus() {
        return status;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    // --- Internal Validation Helpers ---

    private static BigDecimal validateWeight(BigDecimal weight) {
        if (weight == null || weight.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Estimated weight must be greater than zero kg");
        }
        return weight;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " cannot be blank");
        }
        return value.trim();
    }

    private static String sanitizePath(String path) {
        if (path == null || path.isBlank()) {
            return null;
        }
        return path.trim();
    }
}
