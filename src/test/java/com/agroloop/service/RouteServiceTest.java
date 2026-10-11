package com.agroloop.service;

import com.agroloop.model.CollectionRoute;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.PickupStatus;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.CollectionRouteRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.RouteStopRepository;
import com.agroloop.service.matching.RouteOptimizationService;
import com.agroloop.service.matching.WasteMatchResult;
import com.agroloop.service.matching.WasteMatcher;
import com.agroloop.service.matching.WasteMatcherRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RouteServiceTest {

    @Mock
    private FarmerRepository farmerRepository;

    @Mock
    private PickupRequestRepository pickupRequestRepository;

    @Mock
    private CollectionRouteRepository collectionRouteRepository;

    @Mock
    private RouteStopRepository routeStopRepository;

    @Mock
    private PickupService pickupService;

    @Mock
    private WasteMatcherRegistry wasteMatcherRegistry;

    @Mock
    private RouteOptimizationService routeOptimizationService;

    @Mock
    private WasteMatcher mockMatcher;

    @InjectMocks
    private RouteServiceImpl routeService;

    private Farmer farmer;
    private PickupRequest pickupRequest;

    @BeforeEach
    void setUp() {
        farmer = new Farmer("Farmer Bob", "farmer@test.com", "hash", "Farm", "Addr", "notes");
        Household household = new Household("Household Alice", "alice@test.com", "hash", "Addr");
        WasteSubmission submission = new WasteSubmission(household, WasteCategory.FOOD_SCRAPS, new BigDecimal("12.00"), "Pickup Addr", null, null);
        pickupRequest = new PickupRequest(submission);
    }

    @Test
    void getPickupRecommendations_shouldDelegateToRegistryAndMatcher() {
        when(farmerRepository.findById(1L)).thenReturn(Optional.of(farmer));
        when(pickupRequestRepository.findByStatusOrderByCreatedAtDesc(PickupStatus.REQUESTED)).thenReturn(List.of(pickupRequest));
        when(collectionRouteRepository.findByFarmerIdAndStatusIn(eq(1L), any())).thenReturn(List.of());
        when(wasteMatcherRegistry.getMatcher("COMPOSITE")).thenReturn(mockMatcher);
        when(mockMatcher.match(eq(farmer), eq(List.of(pickupRequest)), eq(BigDecimal.ZERO)))
                .thenReturn(List.of(new WasteMatchResult(pickupRequest, 5.0, 90.0, "Close", true, true)));

        List<WasteMatchResult> results = routeService.getPickupRecommendations(1L, "COMPOSITE");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getMatchScore()).isEqualTo(90.0);
    }

    @Test
    void createOptimizedRoute_shouldClaimAndSequencePickups() {
        when(farmerRepository.findById(1L)).thenReturn(Optional.of(farmer));
        when(pickupRequestRepository.findById(10L)).thenReturn(Optional.of(pickupRequest));
        when(routeOptimizationService.optimizeRoute(eq(farmer), any()))
                .thenReturn(new RouteOptimizationService.RoutePlan(
                        List.of(new RouteOptimizationService.OptimizedStopPlan(pickupRequest, 1, 4.2)),
                        4.2,
                        "https://maps.google.com"
                ));
        when(collectionRouteRepository.save(any(CollectionRoute.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CollectionRoute created = routeService.createOptimizedRoute(1L, LocalDate.now(), List.of(10L), "Route 1");

        assertThat(created).isNotNull();
        assertThat(created.getStops()).hasSize(1);
        assertThat(created.getTotalDistanceKm()).isEqualTo(4.2);
        verify(pickupService).claimPickup(10L, 1L);
        verify(collectionRouteRepository).save(any(CollectionRoute.class));
    }
}
