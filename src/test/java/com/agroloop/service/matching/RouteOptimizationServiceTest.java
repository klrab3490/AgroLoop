package com.agroloop.service.matching;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RouteOptimizationServiceTest {

    @Test
    void optimizeRoute_shouldOrderStopsNearestNeighbor() {
        Farmer farmer = new Farmer("Farmer", "f@test.com", "h", "Farm", "Addr", "notes");
        farmer.updateLocationAndCapacity(10.0, 76.0, 50.0, new BigDecimal("300"));

        Household h = new Household("H", "h@test.com", "h", "Addr");

        // Stop A: slightly far (10.05, 76.05)
        WasteSubmission subA = new WasteSubmission(h, WasteCategory.FOOD_SCRAPS, BigDecimal.TEN, "A", null, null, 10.05, 76.05);
        PickupRequest pickupA = new PickupRequest(subA);

        // Stop B: closest to farmer (10.01, 76.01)
        WasteSubmission subB = new WasteSubmission(h, WasteCategory.GARDEN_WASTE, BigDecimal.TEN, "B", null, null, 10.01, 76.01);
        PickupRequest pickupB = new PickupRequest(subB);

        // Stop C: further along (10.09, 76.09)
        WasteSubmission subC = new WasteSubmission(h, WasteCategory.COFFEE_GROUNDS, BigDecimal.TEN, "C", null, null, 10.09, 76.09);
        PickupRequest pickupC = new PickupRequest(subC);

        RouteOptimizationService service = new RouteOptimizationService();
        RouteOptimizationService.RoutePlan plan = service.optimizeRoute(farmer, List.of(pickupC, pickupA, pickupB));

        assertThat(plan.getStops()).hasSize(3);
        // First stop from (10.0, 76.0) should be B (closest)
        assertThat(plan.getStops().get(0).getPickupRequest()).isEqualTo(pickupB);
        assertThat(plan.getStops().get(0).getStopOrder()).isEqualTo(1);

        // Second stop from B should be A
        assertThat(plan.getStops().get(1).getPickupRequest()).isEqualTo(pickupA);
        assertThat(plan.getStops().get(1).getStopOrder()).isEqualTo(2);

        // Third stop should be C
        assertThat(plan.getStops().get(2).getPickupRequest()).isEqualTo(pickupC);
        assertThat(plan.getStops().get(2).getStopOrder()).isEqualTo(3);

        assertThat(plan.getTotalDistanceKm()).isGreaterThan(0.0);
        assertThat(plan.getNavigationUrl()).contains("google.com/maps/dir");
    }
}
