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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Domain entity representing an optimized collection route planned and dispatched by a Farmer.
 * Encapsulates the multi-stop pickup sequence, total travel distance, load weight, and lifecycle.
 */
@Entity
@Table(name = "collection_routes")
public class CollectionRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    @Column(name = "route_date", nullable = false)
    private LocalDate routeDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RouteStatus status;

    @Column(name = "total_distance_km", nullable = false)
    private Double totalDistanceKm = 0.0;

    @Column(name = "total_estimated_weight", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalEstimatedWeight = BigDecimal.ZERO;

    @Column(length = 1000)
    private String notes;

    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("stopOrder ASC")
    private List<RouteStop> stops = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected CollectionRoute() {
        // Required by JPA.
    }

    public CollectionRoute(Farmer farmer, LocalDate routeDate, String notes) {
        this.farmer = Objects.requireNonNull(farmer, "Farmer cannot be null");
        this.routeDate = Objects.requireNonNull(routeDate, "Route date cannot be null");
        this.notes = notes != null ? notes.trim() : null;
        this.status = RouteStatus.PLANNED;
        this.totalDistanceKm = 0.0;
        this.totalEstimatedWeight = BigDecimal.ZERO;
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

    // --- Domain Lifecycle Methods ---

    public RouteStop addStop(PickupRequest pickupRequest, int stopOrder, double estimatedDistanceFromPrevKm) {
        Objects.requireNonNull(pickupRequest, "Pickup request cannot be null");
        if (this.status != RouteStatus.PLANNED) {
            throw new IllegalStateException("Stops can only be added to a PLANNED route. Current status: " + this.status);
        }

        RouteStop stop = new RouteStop(this, pickupRequest, stopOrder, estimatedDistanceFromPrevKm);
        this.stops.add(stop);

        // Recalculate totals
        this.totalDistanceKm += estimatedDistanceFromPrevKm;
        if (pickupRequest.getWasteSubmission() != null && pickupRequest.getWasteSubmission().getEstimatedWeight() != null) {
            this.totalEstimatedWeight = this.totalEstimatedWeight.add(pickupRequest.getWasteSubmission().getEstimatedWeight());
        }

        return stop;
    }

    public void startRoute() {
        if (this.status != RouteStatus.PLANNED) {
            throw new IllegalStateException("Only PLANNED routes can be started. Current status: " + this.status);
        }
        if (this.stops.isEmpty()) {
            throw new IllegalStateException("Cannot start an empty route with zero collection stops");
        }
        this.status = RouteStatus.IN_PROGRESS;
    }

    public void completeRoute() {
        if (this.status != RouteStatus.IN_PROGRESS) {
            throw new IllegalStateException("Only IN_PROGRESS routes can be completed. Current status: " + this.status);
        }
        this.status = RouteStatus.COMPLETED;
    }

    public void cancelRoute(String reason) {
        if (this.status == RouteStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a route that has already been COMPLETED");
        }
        this.status = RouteStatus.CANCELLED;
        if (reason != null && !reason.isBlank()) {
            this.notes = (this.notes == null ? "" : this.notes + " | ") + "Cancelled: " + reason.trim();
        }
    }

    public boolean areAllStopsCompleted() {
        return !stops.isEmpty() && stops.stream().allMatch(s -> s.getStatus() == RouteStopStatus.COMPLETED || s.getStatus() == RouteStopStatus.SKIPPED);
    }

    // --- Getters ---

    public Long getId() {
        return id;
    }

    public Farmer getFarmer() {
        return farmer;
    }

    public LocalDate getRouteDate() {
        return routeDate;
    }

    public RouteStatus getStatus() {
        return status;
    }

    public Double getTotalDistanceKm() {
        return totalDistanceKm;
    }

    public BigDecimal getTotalEstimatedWeight() {
        return totalEstimatedWeight;
    }

    public String getNotes() {
        return notes;
    }

    public List<RouteStop> getStops() {
        return stops;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
