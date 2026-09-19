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
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Domain entity capturing post-collection physical inspection and quality grading.
 * Encapsulates verified weight, contamination grading (QualityGrade), and auditing farmer.
 */
@Entity
@Table(name = "waste_verifications")
public class WasteVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pickup_request_id", nullable = false, unique = true)
    private PickupRequest pickupRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer verifiedByFarmer;

    @Column(name = "verified_weight", nullable = false, precision = 10, scale = 2)
    private BigDecimal verifiedWeight;

    @Enumerated(EnumType.STRING)
    @Column(name = "quality_grade", nullable = false, length = 30)
    private QualityGrade qualityGrade;

    @Column(name = "verification_notes", length = 1000)
    private String verificationNotes;

    @Column(name = "verified_at", nullable = false)
    private LocalDateTime verifiedAt;

    protected WasteVerification() {
        // Required by JPA.
    }

    public WasteVerification(
            PickupRequest pickupRequest,
            Farmer verifiedByFarmer,
            BigDecimal verifiedWeight,
            QualityGrade qualityGrade,
            String verificationNotes
    ) {
        this.pickupRequest = Objects.requireNonNull(pickupRequest, "Pickup request cannot be null");
        this.verifiedByFarmer = Objects.requireNonNull(verifiedByFarmer, "Verifying farmer cannot be null");
        this.verifiedWeight = validateWeight(verifiedWeight);
        this.qualityGrade = Objects.requireNonNull(qualityGrade, "Quality grade cannot be null");
        this.verificationNotes = verificationNotes != null ? verificationNotes.trim() : null;
        this.verifiedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.verifiedAt == null) {
            this.verifiedAt = LocalDateTime.now();
        }
    }

    // --- Domain Queries ---

    public boolean isAcceptable() {
        return this.qualityGrade.isAcceptable();
    }

    // --- Getters ---

    public Long getId() {
        return id;
    }

    public PickupRequest getPickupRequest() {
        return pickupRequest;
    }

    public Farmer getVerifiedByFarmer() {
        return verifiedByFarmer;
    }

    public BigDecimal getVerifiedWeight() {
        return verifiedWeight;
    }

    public QualityGrade getQualityGrade() {
        return qualityGrade;
    }

    public String getVerificationNotes() {
        return verificationNotes;
    }

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    // --- Validation Helper ---

    private static BigDecimal validateWeight(BigDecimal weight) {
        if (weight == null || weight.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Verified weight must be greater than zero kg");
        }
        return weight;
    }
}
