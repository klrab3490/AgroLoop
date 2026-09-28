package com.agroloop.service;

import com.agroloop.model.CollectionRoute;
import com.agroloop.service.matching.WasteMatchResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RouteService {

    /**
     * Gets recommendation scores for unclaimed pickups using the requested polymorphic strategy.
     */
    List<WasteMatchResult> getPickupRecommendations(Long farmerId, String strategyName);

    /**
     * Creates a new optimized collection route for the farmer, ordering selected pickups by TSP heuristic.
     */
    CollectionRoute createOptimizedRoute(Long farmerId, LocalDate routeDate, List<Long> selectedPickupIds, String notes);

    /**
     * Transitions a planned route to IN_PROGRESS.
     */
    CollectionRoute startRoute(Long routeId, Long farmerId);

    /**
     * Marks an individual stop along the route as completed.
     */
    void completeStop(Long routeId, Long stopId, Long farmerId);

    /**
     * Cancels an active or planned route.
     */
    void cancelRoute(Long routeId, Long farmerId, String reason);

    /**
     * Retrieves all active (PLANNED, IN_PROGRESS) routes for a farmer.
     */
    List<CollectionRoute> getActiveRoutes(Long farmerId);

    /**
     * Retrieves full route details including sequenced stops.
     */
    Optional<CollectionRoute> getRouteDetails(Long routeId, Long farmerId);

    /**
     * Updates the farmer's GPS coordinates, service radius, and max daily capacity.
     */
    void updateFarmerLocationAndCapacity(Long farmerId, Double lat, Double lng, Double radiusKm, BigDecimal maxDailyCapacityKg);
}
