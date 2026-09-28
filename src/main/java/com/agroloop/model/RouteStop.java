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
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Domain entity representing an individual pickup stop on an optimized collection route.
 */
@Entity
@Table(name = "route_stops")
public class RouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id", nullable = false)
    private CollectionRoute route;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pickup_id", nullable = false)
    private PickupRequest pickupRequest;

    @Column(name = "stop_order", nullable = false)
    private int stopOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RouteStopStatus status;

    @Column(name = "estimated_distance_from_prev_km", nullable = false)
    private Double estimatedDistanceFromPrevKm = 0.0;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(length = 500)
    private String notes;

    protected RouteStop() {
        // Required by JPA.
    }

    public RouteStop(
            CollectionRoute route,
            PickupRequest pickupRequest,
            int stopOrder,
            Double estimatedDistanceFromPrevKm
    ) {
        this.route = Objects.requireNonNull(route, "Route cannot be null");
        this.pickupRequest = Objects.requireNonNull(pickupRequest, "Pickup request cannot be null");
        this.stopOrder = stopOrder;
        this.estimatedDistanceFromPrevKm = estimatedDistanceFromPrevKm != null ? estimatedDistanceFromPrevKm : 0.0;
        this.status = RouteStopStatus.PENDING;
    }

    public void markCompleted() {
        if (this.status == RouteStopStatus.COMPLETED) {
            return;
        }
        this.status = RouteStopStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void markSkipped(String reason) {
        this.status = RouteStopStatus.SKIPPED;
        this.notes = reason != null ? reason.trim() : "Skipped by driver";
    }

    // --- Getters ---

    public Long getId() {
        return id;
    }

    public CollectionRoute getRoute() {
        return route;
    }

    public PickupRequest getPickupRequest() {
        return pickupRequest;
    }

    public int getStopOrder() {
        return stopOrder;
    }

    public RouteStopStatus getStatus() {
        return status;
    }

    public Double getEstimatedDistanceFromPrevKm() {
        return estimatedDistanceFromPrevKm;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public String getNotes() {
        return notes;
    }
}
