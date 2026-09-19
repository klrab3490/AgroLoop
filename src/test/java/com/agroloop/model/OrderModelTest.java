package com.agroloop.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("Order & OrderItem Domain Model Tests — Immutability & Calculations")
class OrderModelTest {

    private Household household;
    private Farmer farmer;
    private Product spinach;
    private Product compost;

    @BeforeEach
    void setUp() {
        household = new Household("Alice Doe", "alice@example.com", "hash", "123 Green Way, Kochi");
        farmer = new Farmer("Farmer Bob", "bob@example.com", "hash", "Green Valley", "Wayanad", "Bio farm");

        spinach = new Product(farmer, "Baby Spinach", "Organic leaves", ProductCategory.ORGANIC_VEGETABLES, "bundle", new BigDecimal("3.50"), 20, null);
        compost = new Product(farmer, "Bio Compost", "Enriched soil", ProductCategory.COMPOST_AND_SOIL, "bag", new BigDecimal("10.00"), 10, null);
    }

    @Test
    @DisplayName("Should create order and accumulate line items into authoritative total")
    void testOrderAccumulation() {
        Order order = new Order(household, "456 Custom Road, Kochi", "Leave at front door");

        assertEquals(household, order.getHousehold());
        assertEquals("456 Custom Road, Kochi", order.getDeliveryAddress());
        assertEquals("Leave at front door", order.getNotes());
        assertEquals(OrderStatus.PLACED, order.getStatus());
        assertEquals(BigDecimal.ZERO.setScale(2), order.getTotalTokens());
        assertNotNull(order.getCreatedAt());

        // Add 2 bundles of spinach (2 * 3.50 = 7.00)
        OrderItem item1 = order.addItem(spinach, 2);
        assertEquals(new BigDecimal("7.00"), item1.getSubtotal());
        assertEquals(new BigDecimal("7.00"), order.getTotalTokens());
        assertEquals(1, order.getItems().size());

        // Add 1 bag of compost (1 * 10.00 = 10.00)
        OrderItem item2 = order.addItem(compost, 1);
        assertEquals(new BigDecimal("10.00"), item2.getSubtotal());
        assertEquals(new BigDecimal("17.00"), order.getTotalTokens());
        assertEquals(2, order.getItems().size());
    }

    @Test
    @DisplayName("OrderItem must snapshot product metadata independently of future product modifications")
    void testOrderItemHistoricalSnapshotImmutability() {
        Order order = new Order(household, null, null);
        OrderItem item = order.addItem(spinach, 3); // 3 * 3.50 = 10.50

        assertEquals("Baby Spinach", item.getProductName());
        assertEquals(new BigDecimal("3.50"), item.getUnitPrice());
        assertEquals("bundle", item.getUnit());
        assertEquals(ProductCategory.ORGANIC_VEGETABLES, item.getCategory());
        assertEquals("Farmer Bob", item.getFarmerName());
        assertEquals(new BigDecimal("10.50"), item.getSubtotal());

        // Mutate original Product details
        spinach.updateDetails("Premium Golden Spinach", "Altered desc", ProductCategory.HERBS_AND_SPICES, "kg", new BigDecimal("9.99"), null);

        // Historical snapshot in OrderItem MUST remain identical to order-time snapshot
        assertEquals("Baby Spinach", item.getProductName());
        assertEquals(new BigDecimal("3.50"), item.getUnitPrice());
        assertEquals("bundle", item.getUnit());
        assertEquals(ProductCategory.ORGANIC_VEGETABLES, item.getCategory());
        assertEquals("Farmer Bob", item.getFarmerName());
        assertEquals(new BigDecimal("10.50"), item.getSubtotal());
        assertEquals(new BigDecimal("10.50"), order.getTotalTokens());
    }

    @Test
    @DisplayName("Should fallback to household address when custom delivery address is blank")
    void testAddressFallback() {
        Order order = new Order(household, null, null);
        assertEquals("123 Green Way, Kochi", order.getDeliveryAddress());

        Order orderWithWhitespace = new Order(household, "   ", null);
        assertEquals("123 Green Way, Kochi", orderWithWhitespace.getDeliveryAddress());
    }

    @Test
    @DisplayName("Should throw exception if both custom delivery address and household address are missing")
    void testAddressRequired() {
        Household homelessUser = new Household("Bob", "bob@test.com", "hash", null);
        assertThrows(IllegalArgumentException.class, () -> new Order(homelessUser, null, null));
    }

    @Test
    @DisplayName("Should reject invalid line item quantities")
    void testInvalidQuantity() {
        Order order = new Order(household, null, null);
        assertThrows(IllegalArgumentException.class, () -> order.addItem(spinach, 0));
        assertThrows(IllegalArgumentException.class, () -> order.addItem(spinach, -2));
    }

    @Test
    @DisplayName("Should transition to COMPLETED status")
    void testOrderStatusCompletion() {
        Order order = new Order(household, null, null);
        order.complete();
        assertEquals(OrderStatus.COMPLETED, order.getStatus());

        // Completing already completed order should fail
        assertThrows(IllegalStateException.class, order::complete);
    }
}
