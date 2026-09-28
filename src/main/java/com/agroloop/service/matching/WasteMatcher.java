package com.agroloop.service.matching;

import com.agroloop.model.Farmer;
import com.agroloop.model.PickupRequest;

import java.math.BigDecimal;
import java.util.List;

/**
 * Polymorphic strategy interface for matching available organic waste pickup requests
 * to appropriate farmers based on geography, capacity, and dispatch criteria.
 */
public interface WasteMatcher {

    /**
     * Unique identifier for this matching strategy (e.g. "DISTANCE", "CAPACITY", "COMPOSITE").
     */
    String getStrategyName();

    /**
     * Evaluates and ranks candidate pickup requests for a specific farmer.
     *
     * @param farmer the evaluating farmer
     * @param availablePickups the pool of unassigned pickup requests
     * @param currentRouteLoadKg the current cumulative load already committed to today's route
     * @return sorted list of match results in descending order of recommendation score
     */
    List<WasteMatchResult> match(Farmer farmer, List<PickupRequest> availablePickups, BigDecimal currentRouteLoadKg);
}
