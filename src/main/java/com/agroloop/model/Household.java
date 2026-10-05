package com.agroloop.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "households")
public class Household extends User {

    @Column(name = "token_balance", nullable = false, precision = 19, scale = 2)
    private BigDecimal tokenBalance;

    @Column(length = 500)
    private String address;

    @Column(name = "average_rating")
    private Double averageRating = 0.0;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    protected Household() {
        // Required by JPA.
    }

    public Household(
            String name,
            String email,
            String passwordHash,
            String address
    ) {
        super(name, email, passwordHash, Role.ROLE_HOUSEHOLD);

        this.tokenBalance = BigDecimal.ZERO;
        this.address = address;
    }

    public User getUser() {
        return this;
    }

    public BigDecimal getTokenBalance() {
        return tokenBalance;
    }

    public String getAddress() {
        return address;
    }

    public void changeAddress(String address) {
        this.address = address;
    }

    public void addTokens(BigDecimal amount) {
        validatePositiveAmount(amount);

        this.tokenBalance = this.tokenBalance.add(amount);
    }

    public void spendTokens(BigDecimal amount) {
        validatePositiveAmount(amount);

        if (this.tokenBalance.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient token balance");
        }

        this.tokenBalance = this.tokenBalance.subtract(amount);
    }

    private void validatePositiveAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Token amount must be greater than zero"
            );
        }
    }

    /**
     * Domain business method: Submits organic waste originating from this Household,
     * defaulting to the household's registered address if no custom pickup address is provided.
     */
    public WasteSubmission submitWaste(
            WasteCategory category,
            BigDecimal estimatedWeight,
            String customPickupAddress,
            String imagePath,
            String notes
    ) {
        return submitWaste(category, estimatedWeight, customPickupAddress, imagePath, notes, null, null);
    }

    public WasteSubmission submitWaste(
            WasteCategory category,
            BigDecimal estimatedWeight,
            String customPickupAddress,
            String imagePath,
            String notes,
            Double latitude,
            Double longitude
    ) {
        String resolvedAddress = (customPickupAddress != null && !customPickupAddress.isBlank())
                ? customPickupAddress.trim()
                : this.address;

        Double resolvedLat = (latitude != null) ? latitude : 10.8505;
        Double resolvedLng = (longitude != null) ? longitude : 76.2711;

        return new WasteSubmission(
                this,
                category,
                estimatedWeight,
                resolvedAddress,
                imagePath,
                notes,
                resolvedLat,
                resolvedLng
        );
    }


    public Double getAverageRating() {
        return averageRating != null ? averageRating : 0.0;
    }

    public Integer getReviewCount() {
        return reviewCount != null ? reviewCount : 0;
    }

    public void updateReputation(Double averageRating, Integer reviewCount) {
        this.averageRating = averageRating != null ? averageRating : 0.0;
        this.reviewCount = reviewCount != null ? reviewCount : 0;
    }
}
