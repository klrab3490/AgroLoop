package com.agroloop.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Domain entity representing a Household's request to convert their account
 * into a verified Farmer partner, requiring administrative approval.
 */
@Entity
@Table(name = "farmer_applications")
public class FarmerApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "farm_name", nullable = false, length = 150)
    private String farmName;

    @Column(name = "farm_address", nullable = false, length = 500)
    private String farmAddress;

    @Column(length = 1000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FarmerApplicationStatus status;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    protected FarmerApplication() {
        // Required by JPA
    }

    public FarmerApplication(
            User user,
            String farmName,
            String farmAddress,
            String notes
    ) {
        this.user = Objects.requireNonNull(user, "User cannot be null");
        this.farmName = requireText(farmName, "Farm Name");
        this.farmAddress = requireText(farmAddress, "Farm Address");
        this.notes = notes != null ? notes.trim() : null;
        this.status = FarmerApplicationStatus.PENDING;
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
     * Domain business method: Approves the application.
     */
    public void approve() {
        if (this.status != FarmerApplicationStatus.PENDING) {
            throw new IllegalStateException("Only PENDING applications can be approved. Current status: " + this.status);
        }
        this.status = FarmerApplicationStatus.APPROVED;
        this.reviewedAt = LocalDateTime.now();
        this.rejectionReason = null;
    }

    /**
     * Domain business method: Rejects the application with an administrative reason.
     */
    public void reject(String reason) {
        if (this.status != FarmerApplicationStatus.PENDING) {
            throw new IllegalStateException("Only PENDING applications can be rejected. Current status: " + this.status);
        }
        this.status = FarmerApplicationStatus.REJECTED;
        this.reviewedAt = LocalDateTime.now();
        this.rejectionReason = requireText(reason, "Rejection reason");
    }

    // --- Getters ---

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getFarmName() {
        return farmName;
    }

    public String getFarmAddress() {
        return farmAddress;
    }

    public String getNotes() {
        return notes;
    }

    public FarmerApplicationStatus getStatus() {
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

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " must not be null or blank.");
        }
        return value.trim();
    }
}
