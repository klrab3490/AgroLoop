package com.agroloop.service;

import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.CollectionRoute;
import com.agroloop.model.Farmer;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.PickupStatus;
import com.agroloop.model.RouteStatus;
import com.agroloop.model.RouteStop;
import com.agroloop.repository.CollectionRouteRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.RouteStopRepository;
import com.agroloop.service.matching.RouteOptimizationService;
import com.agroloop.service.matching.WasteMatchResult;
import com.agroloop.service.matching.WasteMatcher;
import com.agroloop.service.matching.WasteMatcherRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class RouteServiceImpl implements RouteService {

    private final FarmerRepository farmerRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final CollectionRouteRepository collectionRouteRepository;
    private final RouteStopRepository routeStopRepository;
    private final PickupService pickupService;
    private final WasteMatcherRegistry wasteMatcherRegistry;
    private final RouteOptimizationService routeOptimizationService;

    public RouteServiceImpl(
            FarmerRepository farmerRepository,
            PickupRequestRepository pickupRequestRepository,
            CollectionRouteRepository collectionRouteRepository,
            RouteStopRepository routeStopRepository,
            PickupService pickupService,
            WasteMatcherRegistry wasteMatcherRegistry,
            RouteOptimizationService routeOptimizationService
    ) {
        this.farmerRepository = farmerRepository;
        this.pickupRequestRepository = pickupRequestRepository;
        this.collectionRouteRepository = collectionRouteRepository;
        this.routeStopRepository = routeStopRepository;
        this.pickupService = pickupService;
        this.wasteMatcherRegistry = wasteMatcherRegistry;
        this.routeOptimizationService = routeOptimizationService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WasteMatchResult> getPickupRecommendations(Long farmerId, String strategyName) {
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with ID: " + farmerId));

        List<PickupRequest> available = pickupRequestRepository.findByStatusOrderByCreatedAtDesc(PickupStatus.REQUESTED);

        // Calculate load currently planned for today
        List<CollectionRoute> activeRoutes = collectionRouteRepository.findByFarmerIdAndStatusIn(
                farmerId, List.of(RouteStatus.PLANNED, RouteStatus.IN_PROGRESS));
        BigDecimal currentLoad = activeRoutes.stream()
                .map(CollectionRoute::getTotalEstimatedWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        WasteMatcher matcher = wasteMatcherRegistry.getMatcher(strategyName);
        return matcher.match(farmer, available, currentLoad);
    }

    @Override
    public CollectionRoute createOptimizedRoute(Long farmerId, LocalDate routeDate, List<Long> selectedPickupIds, String notes) {
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with ID: " + farmerId));

        if (selectedPickupIds == null || selectedPickupIds.isEmpty()) {
            throw new IllegalArgumentException("At least one pickup request must be selected to create a route.");
        }

        LocalDate targetDate = routeDate != null ? routeDate : LocalDate.now();

        // 1. Fetch and claim pickups if they are currently unassigned (REQUESTED)
        List<PickupRequest> pickups = new ArrayList<>();
        for (Long pickupId : selectedPickupIds) {
            PickupRequest pickup = pickupRequestRepository.findById(pickupId)
                    .orElseThrow(() -> new ResourceNotFoundException("Pickup not found with ID: " + pickupId));

            if (pickup.getStatus() == PickupStatus.REQUESTED) {
                // Claim for this farmer
                pickupService.claimPickup(pickupId, farmerId);
                // Refresh pickup state
                pickup = pickupRequestRepository.findById(pickupId).orElse(pickup);
            } else if (!farmerId.equals(pickup.getAssignedFarmer() != null ? pickup.getAssignedFarmer().getId() : null)) {
                throw new IllegalStateException("Pickup #" + pickupId + " is already assigned to another farmer.");
            }
            pickups.add(pickup);
        }

        // 2. Run TSP nearest-neighbor optimization
        RouteOptimizationService.RoutePlan plan = routeOptimizationService.optimizeRoute(farmer, pickups);

        // 3. Create or reuse existing PLANNED route entity
        List<CollectionRoute> existingPlannedRoutes = collectionRouteRepository.findByFarmerIdAndRouteDate(farmerId, targetDate)
                .stream()
                .filter(r -> r.getStatus() == RouteStatus.PLANNED)
                .toList();

        CollectionRoute route;
        if (!existingPlannedRoutes.isEmpty()) {
            route = existingPlannedRoutes.get(0);
            route.clearStops();
            if (notes != null && !notes.isBlank()) {
                route.updateNotes(notes);
            }
        } else {
            route = new CollectionRoute(farmer, targetDate, notes);
        }

        for (RouteOptimizationService.OptimizedStopPlan stopPlan : plan.getStops()) {
            PickupRequest p = stopPlan.getPickupRequest();
            route.addStop(p, stopPlan.getStopOrder(), stopPlan.getDistanceFromPrevKm());

            if (p.getStatus() == PickupStatus.ASSIGNED) {
                LocalDateTime baseTime = targetDate.isAfter(LocalDate.now())
                        ? targetDate.atTime(9, 0)
                        : LocalDateTime.now().plusHours(1);
                LocalDateTime slot = baseTime.plusMinutes(stopPlan.getStopOrder() * 15L);
                p.schedule(slot);
                pickupRequestRepository.save(p);
            }
        }

        return collectionRouteRepository.save(route);
    }

    @Override
    public CollectionRoute startRoute(Long routeId, Long farmerId) {
        CollectionRoute route = collectionRouteRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with ID: " + routeId));

        if (!route.getFarmer().getId().equals(farmerId)) {
            throw new org.springframework.security.access.AccessDeniedException("Not authorized to modify this route");
        }

        route.startRoute();
        return collectionRouteRepository.save(route);
    }

    @Override
    public void completeStop(Long routeId, Long stopId, Long farmerId) {
        CollectionRoute route = collectionRouteRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with ID: " + routeId));

        if (!route.getFarmer().getId().equals(farmerId)) {
            throw new org.springframework.security.access.AccessDeniedException("Not authorized to modify this route");
        }

        RouteStop stop = routeStopRepository.findById(stopId)
                .orElseThrow(() -> new ResourceNotFoundException("Route stop not found with ID: " + stopId));

        stop.markCompleted();
        routeStopRepository.save(stop);

        // Synchronize underlying PickupRequest to COLLECTED
        PickupRequest pickup = stop.getPickupRequest();
        if (pickup != null && pickup.getStatus() != PickupStatus.COLLECTED && pickup.getStatus() != PickupStatus.VERIFIED) {
            if (pickup.getStatus() == PickupStatus.ASSIGNED) {
                pickup.schedule(LocalDateTime.now().plusMinutes(1));
            }
            if (pickup.getStatus() == PickupStatus.SCHEDULED) {
                pickup.markCollected();
                pickupRequestRepository.save(pickup);
            }
        }

        // Automatically complete the route if all stops are finished
        if (route.areAllStopsCompleted()) {
            route.completeRoute();
            collectionRouteRepository.save(route);
        }
    }

    @Override
    public void cancelRoute(Long routeId, Long farmerId, String reason) {
        CollectionRoute route = collectionRouteRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with ID: " + routeId));

        if (!route.getFarmer().getId().equals(farmerId)) {
            throw new org.springframework.security.access.AccessDeniedException("Not authorized to modify this route");
        }

        route.cancelRoute(reason);
        collectionRouteRepository.save(route);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CollectionRoute> getActiveRoutes(Long farmerId) {
        return collectionRouteRepository.findActiveRoutesWithStops(farmerId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CollectionRoute> getRouteDetails(Long routeId, Long farmerId) {
        return collectionRouteRepository.findByIdWithDetails(routeId)
                .filter(r -> r.getFarmer().getId().equals(farmerId));
    }

    @Override
    public void updateFarmerLocationAndCapacity(
            Long farmerId,
            Double lat,
            Double lng,
            Double radiusKm,
            BigDecimal maxDailyCapacityKg
    ) {
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with ID: " + farmerId));

        farmer.updateLocationAndCapacity(lat, lng, radiusKm, maxDailyCapacityKg);
        farmerRepository.save(farmer);
    }
}
