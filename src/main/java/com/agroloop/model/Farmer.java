package com.agroloop.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "farmers")
public class Farmer extends User {

    @Column(name = "farm_name", nullable = false, length = 150)
    private String farmName;

    @Column(name = "farm_address", nullable = false, length = 500)
    private String farmAddress;

    @Column(length = 1000)
    private String notes;

    @Column(name = "latitude")
    private Double latitude = 10.8505; // Default Kerala baseline coordinate

    @Column(name = "longitude")
    private Double longitude = 76.2711;

    @Column(name = "service_radius_km")
    private Double serviceRadiusKm = 25.0;

    @Column(name = "max_daily_capacity_kg", precision = 10, scale = 2)
    private java.math.BigDecimal maxDailyCapacityKg = new java.math.BigDecimal("200.00");

    @Column(name = "average_rating")
    private Double averageRating = 0.0;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    protected Farmer() {
        // Required by JPA.
    }

    public Farmer(
            String name,
            String email,
            String passwordHash,
            String farmName,
            String farmAddress,
            String notes
    ) {
        super(name, email, passwordHash, Role.ROLE_FARMER);

        this.farmName = requireText(farmName, "Farm name");
        this.farmAddress = requireText(farmAddress, "Farm address");
        this.notes = notes;
        this.latitude = 10.8505;
        this.longitude = 76.2711;
        this.serviceRadiusKm = 25.0;
        this.maxDailyCapacityKg = new java.math.BigDecimal("200.00");
    }

    public User getUser() {
        return this;
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

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public Double getServiceRadiusKm() {
        return serviceRadiusKm;
    }

    public java.math.BigDecimal getMaxDailyCapacityKg() {
        return maxDailyCapacityKg;
    }

    public void updateFarmDetails(
            String farmName,
            String farmAddress,
            String notes
    ) {
        this.farmName = requireText(farmName, "Farm name");
        this.farmAddress = requireText(farmAddress, "Farm address");
        this.notes = notes;
    }

    public void updateLocationAndCapacity(
            Double latitude,
            Double longitude,
            Double serviceRadiusKm,
            java.math.BigDecimal maxDailyCapacityKg
    ) {
        if (latitude != null) {
            this.latitude = latitude;
        }
        if (longitude != null) {
            this.longitude = longitude;
        }
        if (serviceRadiusKm != null && serviceRadiusKm > 0) {
            this.serviceRadiusKm = serviceRadiusKm;
        }
        if (maxDailyCapacityKg != null && maxDailyCapacityKg.compareTo(java.math.BigDecimal.ZERO) > 0) {
            this.maxDailyCapacityKg = maxDailyCapacityKg;
        }
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
