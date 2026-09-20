package com.agroloop.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("Order Domain Model Lifecycle Tests (Phase 7)")
class OrderLifecycleTest {

    private Household household;
    private Farmer farmer;
    private User admin;
    private Order order;
    private Product product;

    @BeforeEach
    void setUp() {
        household = new Household("Alice Green", "alice@example.com", "hash", "123 Green Way");
        ReflectionTestUtils.setField(household, "id", 101L);

        farmer = new Farmer("Bob Brown", "bob@example.com", "hash", "Bob Farm", "456 Valley Rd", "Compost");
        ReflectionTestUtils.setField(farmer, "id", 201L);

        admin = new Admin("Super Admin", "admin@agroloop.com", "hash");
        ReflectionTestUtils.setField(admin, "id", 301L);

        product = new Product(farmer, "Organic Apples", "Fresh crunchy apples", ProductCategory.FRESH_FRUITS, "kg", new BigDecimal("4.50"), 100, null);
        ReflectionTestUtils.setField(product, "id", 501L);

        order = new Order(household, "123 Green Way", "Leave by gate");
        order.addItem(product, 2);
    }

    @Test
    @DisplayName("Initial status is PLACED with correct totalTokens")
    void initialState_placed() {
        assertEquals(OrderStatus.PLACED, order.getStatus());
        assertEquals(new BigDecimal("9.00"), order.getTotalTokens());
        assertNull(order.getCancellationReason());
        assertNull(order.getCancelledAt());
        assertNull(order.getDisputeReason());
    }

    @Test
    @DisplayName("Order items capture immutable historical farmerId snapshot")
    void orderItems_captureFarmerId() {
        assertEquals(1, order.getItems().size());
        OrderItem item = order.getItems().get(0);
        assertEquals(201L, item.getFarmerId());
        assertEquals("Bob Brown", item.getFarmerName());
    }

    @Test
    @DisplayName("cancel() transitions PLACED to CANCELLED and populates audit fields")
    void cancel_fromPlaced_success() {
        order.cancel("Changed my mind", household);

        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        assertEquals("Changed my mind", order.getCancellationReason());
        assertEquals(household, order.getCancellationActor());
        assertNotNull(order.getCancelledAt());
    }

    @Test
    @DisplayName("cancel() on non-PLACED order throws IllegalStateException")
    void cancel_onNonPlaced_throwsException() {
        order.cancel("First cancellation", household);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                order.cancel("Second cancellation attempt", household));
        assertEquals("Only PLACED orders can be cancelled. Current status: CANCELLED", ex.getMessage());
    }

    @Test
    @DisplayName("cancel() with blank or oversized reason throws IllegalArgumentException")
    void cancel_invalidReason_throwsException() {
        assertThrows(IllegalArgumentException.class, () -> order.cancel("", household));
        assertThrows(IllegalArgumentException.class, () -> order.cancel("   ", household));
        assertThrows(IllegalArgumentException.class, () -> order.cancel(null, household));

        String longReason = "a".repeat(501);
        assertThrows(IllegalArgumentException.class, () -> order.cancel(longReason, household));
    }

    @Test
    @DisplayName("dispute() transitions PLACED to DISPUTED and populates audit fields")
    void dispute_fromPlaced_success() {
        order.dispute("Produce was damaged", household);

        assertEquals(OrderStatus.DISPUTED, order.getStatus());
        assertEquals("Produce was damaged", order.getDisputeReason());
        assertEquals(household, order.getDisputeActor());
        assertNotNull(order.getDisputedAt());
    }

    @Test
    @DisplayName("approveDispute() transitions DISPUTED to CANCELLED with APPROVED_REFUND")
    void approveDispute_success() {
        order.dispute("Produce damaged", household);
        order.approveDispute("Damage confirmed, refund granted", admin);

        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        assertEquals(DisputeResolution.APPROVED_REFUND, order.getResolutionType());
        assertEquals("Damage confirmed, refund granted", order.getResolutionNotes());
        assertEquals(admin, order.getResolvedBy());
        assertNotNull(order.getResolvedAt());
        assertNotNull(order.getCancelledAt());
    }

    @Test
    @DisplayName("dismissDispute() reverts DISPUTED to PLACED with DISMISSED resolution")
    void dismissDispute_success() {
        order.dispute("Produce damaged", household);
        order.dismissDispute("Dispute unsubstantiated", admin);

        assertEquals(OrderStatus.PLACED, order.getStatus());
        assertEquals(DisputeResolution.DISMISSED, order.getResolutionType());
        assertEquals("Dispute unsubstantiated", order.getResolutionNotes());
        assertEquals(admin, order.getResolvedBy());
        assertNotNull(order.getResolvedAt());
    }

    @Test
    @DisplayName("Single dispute lifecycle invariant: cannot dispute order after resolution")
    void singleDisputeLifecycle_cannotDisputeAfterDismissal() {
        order.dispute("Issue 1", household);
        order.dismissDispute("Dismissed by admin", admin);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                order.dispute("Issue 2", household));
        assertEquals("Order has already undergone dispute resolution and cannot be disputed again", ex.getMessage());
    }
}
