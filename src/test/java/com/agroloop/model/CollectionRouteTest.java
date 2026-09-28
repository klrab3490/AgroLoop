package com.agroloop.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CollectionRouteTest {

    @Test
    void routeLifecycle_plannedToInProgressToCompleted() {
        Farmer farmer = new Farmer("Farmer", "f@test.com", "h", "Farm", "Addr", "notes");
        Household household = new Household("H", "h@test.com", "h", "Addr");
        WasteSubmission sub = new WasteSubmission(household, WasteCategory.FOOD_SCRAPS, new BigDecimal("15.50"), "Addr", null, null);
        PickupRequest pickup = new PickupRequest(sub);

        CollectionRoute route = new CollectionRoute(farmer, LocalDate.now(), "Test Run");
        assertThat(route.getStatus()).isEqualTo(RouteStatus.PLANNED);

        RouteStop stop = route.addStop(pickup, 1, 3.5);
        assertThat(route.getStops()).hasSize(1);
        assertThat(route.getTotalDistanceKm()).isEqualTo(3.5);
        assertThat(route.getTotalEstimatedWeight()).isEqualByComparingTo("15.50");
        assertThat(stop.getStatus()).isEqualTo(RouteStopStatus.PENDING);

        route.startRoute();
        assertThat(route.getStatus()).isEqualTo(RouteStatus.IN_PROGRESS);

        stop.markCompleted();
        assertThat(stop.getStatus()).isEqualTo(RouteStopStatus.COMPLETED);
        assertThat(route.areAllStopsCompleted()).isTrue();

        route.completeRoute();
        assertThat(route.getStatus()).isEqualTo(RouteStatus.COMPLETED);
    }

    @Test
    void cannotStartEmptyRoute() {
        Farmer farmer = new Farmer("Farmer", "f@test.com", "h", "Farm", "Addr", "notes");
        CollectionRoute route = new CollectionRoute(farmer, LocalDate.now(), "Empty");

        assertThatThrownBy(route::startRoute)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot start an empty route");
    }

    @Test
    void cannotCancelCompletedRoute() {
        Farmer farmer = new Farmer("Farmer", "f@test.com", "h", "Farm", "Addr", "notes");
        Household household = new Household("H", "h@test.com", "h", "Addr");
        WasteSubmission sub = new WasteSubmission(household, WasteCategory.FOOD_SCRAPS, BigDecimal.TEN, "Addr", null, null);
        PickupRequest pickup = new PickupRequest(sub);

        CollectionRoute route = new CollectionRoute(farmer, LocalDate.now(), null);
        route.addStop(pickup, 1, 1.0);
        route.startRoute();
        route.completeRoute();

        assertThatThrownBy(() -> route.cancelRoute("change of mind"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot cancel a route that has already been COMPLETED");
    }
}
