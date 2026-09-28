package com.agroloop.service.matching;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WasteMatcherTest {

    private Farmer farmer;
    private Household household;
    private PickupRequest nearbyPickup;
    private PickupRequest farPickup;

    @BeforeEach
    void setUp() {
        farmer = new Farmer("Bob Farmer", "farmer@test.com", "hash", "Sunny Farm", "Kerala", "Organic");
        farmer.updateLocationAndCapacity(10.8505, 76.2711, 20.0, new BigDecimal("100.00")); // 20km radius

        household = new Household("Alice", "alice@test.com", "hash", "Address 1");

        // Nearby pickup ~3 km away
        WasteSubmission subNear = new WasteSubmission(
                household, WasteCategory.FOOD_SCRAPS, new BigDecimal("25.00"),
                "Near St", "img.jpg", "notes", 10.8700, 76.2800
        );
        nearbyPickup = new PickupRequest(subNear);

        // Far pickup ~45 km away (outside 20km radius)
        WasteSubmission subFar = new WasteSubmission(
                household, WasteCategory.GARDEN_WASTE, new BigDecimal("60.00"),
                "Far St", "img.jpg", "notes", 11.2500, 76.5000
        );
        farPickup = new PickupRequest(subFar);
    }

    @Test
    void distanceBasedMatcher_shouldRankClosestPickupFirst() {
        DistanceBasedWasteMatcher matcher = new DistanceBasedWasteMatcher();
        List<WasteMatchResult> results = matcher.match(farmer, List.of(farPickup, nearbyPickup), BigDecimal.ZERO);

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getPickupRequest()).isEqualTo(nearbyPickup);
        assertThat(results.get(0).isWithinServiceRadius()).isTrue();
        assertThat(results.get(0).getDistanceKm()).isLessThan(results.get(1).getDistanceKm());
        assertThat(results.get(1).isWithinServiceRadius()).isFalse();
    }

    @Test
    void capacityBalancedMatcher_shouldPrioritizeOptimalPayloadFit() {
        CapacityBalancedWasteMatcher matcher = new CapacityBalancedWasteMatcher();
        // Remaining capacity: 100 - 80 = 20 kg
        List<WasteMatchResult> results = matcher.match(farmer, List.of(farPickup, nearbyPickup), new BigDecimal("80.00"));

        assertThat(results).hasSize(2);
        // nearbyPickup is 25 kg (closer to remaining 20 kg), farPickup is 60 kg (far overflows)
        assertThat(results.get(0).getPickupRequest()).isEqualTo(nearbyPickup);
    }

    @Test
    void compositeMatcher_shouldCombineDistanceCapacityAndUrgency() {
        CompositeWasteMatcher matcher = new CompositeWasteMatcher();
        List<WasteMatchResult> results = matcher.match(farmer, List.of(farPickup, nearbyPickup), BigDecimal.ZERO);

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getPickupRequest()).isEqualTo(nearbyPickup);
        assertThat(results.get(0).getMatchScore()).isGreaterThan(results.get(1).getMatchScore());
    }

    @Test
    void registry_shouldResolveCorrectStrategy() {
        DistanceBasedWasteMatcher distanceMatcher = new DistanceBasedWasteMatcher();
        CapacityBalancedWasteMatcher capacityMatcher = new CapacityBalancedWasteMatcher();
        CompositeWasteMatcher compositeMatcher = new CompositeWasteMatcher();

        WasteMatcherRegistry registry = new WasteMatcherRegistry(
                List.of(distanceMatcher, capacityMatcher, compositeMatcher),
                compositeMatcher
        );

        assertThat(registry.getMatcher("distance")).isInstanceOf(DistanceBasedWasteMatcher.class);
        assertThat(registry.getMatcher("CAPACITY")).isInstanceOf(CapacityBalancedWasteMatcher.class);
        assertThat(registry.getMatcher("COMPOSITE")).isInstanceOf(CompositeWasteMatcher.class);
        assertThat(registry.getMatcher("unknown")).isInstanceOf(CompositeWasteMatcher.class);
        assertThat(registry.getMatcher(null)).isInstanceOf(CompositeWasteMatcher.class);
    }
}
