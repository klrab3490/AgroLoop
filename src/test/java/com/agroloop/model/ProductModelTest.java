package com.agroloop.model;

import com.agroloop.exception.InsufficientStockException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("Product Domain Model Tests — OOP Encapsulation & Inventory Invariants")
class ProductModelTest {

    private Farmer farmer;

    @BeforeEach
    void setUp() {
        farmer = new Farmer("Farmer Bob", "bob@example.com", "hash", "Green Valley", "Wayanad", "Organic farm");
    }

    @Test
    @DisplayName("Should successfully instantiate product with valid encapsulated invariants")
    void testValidProductCreation() {
        Product product = new Product(
                farmer,
                "Organic Carrots",
                "Fresh crunchy carrots",
                ProductCategory.ORGANIC_VEGETABLES,
                "kg",
                new BigDecimal("4.50"),
                50,
                "products/carrots.jpg"
        );

        assertEquals("Organic Carrots", product.getName());
        assertEquals(farmer, product.getFarmer());
        assertEquals(ProductCategory.ORGANIC_VEGETABLES, product.getCategory());
        assertEquals("kg", product.getUnit());
        assertEquals(new BigDecimal("4.50"), product.getPriceInTokens());
        assertEquals(50, product.getStock());
        assertTrue(product.isActive());
        assertEquals(0L, product.getVersion());
        assertNotNull(product.getCreatedAt());
        assertNotNull(product.getUpdatedAt());
    }

    @Test
    @DisplayName("Should reject blank name, null category, or blank unit")
    void testValidationOnBlankFields() {
        assertThrows(IllegalArgumentException.class, () -> new Product(
                farmer, " ", "desc", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("5.00"), 10, null
        ));

        assertThrows(NullPointerException.class, () -> new Product(
                farmer, "Carrots", "desc", null, "kg", new BigDecimal("5.00"), 10, null
        ));

        assertThrows(IllegalArgumentException.class, () -> new Product(
                farmer, "Carrots", "desc", ProductCategory.ORGANIC_VEGETABLES, " ", new BigDecimal("5.00"), 10, null
        ));
    }

    @Test
    @DisplayName("Should reject non-positive price or negative initial stock")
    void testPriceAndStockInvariants() {
        assertThrows(IllegalArgumentException.class, () -> new Product(
                farmer, "Carrots", "desc", ProductCategory.ORGANIC_VEGETABLES, "kg", BigDecimal.ZERO, 10, null
        ));

        assertThrows(IllegalArgumentException.class, () -> new Product(
                farmer, "Carrots", "desc", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("-2.00"), 10, null
        ));

        assertThrows(IllegalArgumentException.class, () -> new Product(
                farmer, "Carrots", "desc", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("5.00"), -1, null
        ));
    }

    @Test
    @DisplayName("Should deduct inventory stock correctly when sufficient units exist")
    void testStockDeductionSuccess() {
        Product product = new Product(
                farmer, "Compost Bag", "5kg rich bio-compost", ProductCategory.COMPOST_AND_SOIL, "bag", new BigDecimal("12.00"), 15, null
        );

        product.deductStock(5);
        assertEquals(10, product.getStock());

        product.deductStock(10);
        assertEquals(0, product.getStock());
    }

    @Test
    @DisplayName("Should throw InsufficientStockException when requested quantity exceeds stock")
    void testStockDeductionInsufficient() {
        Product product = new Product(
                farmer, "Compost Bag", "5kg rich bio-compost", ProductCategory.COMPOST_AND_SOIL, "bag", new BigDecimal("12.00"), 2, null
        );

        InsufficientStockException ex = assertThrows(InsufficientStockException.class, () -> product.deductStock(3));
        assertEquals(3, ex.getRequestedQuantity());
        assertEquals(2, ex.getAvailableStock());
        assertEquals(2, product.getStock()); // Invariant: stock remains untouched
    }

    @Test
    @DisplayName("Should reject non-positive deduction quantities")
    void testStockDeductionInvalidQuantity() {
        Product product = new Product(
                farmer, "Compost Bag", "desc", ProductCategory.COMPOST_AND_SOIL, "bag", new BigDecimal("12.00"), 10, null
        );

        assertThrows(IllegalArgumentException.class, () -> product.deductStock(0));
        assertThrows(IllegalArgumentException.class, () -> product.deductStock(-5));
        assertEquals(10, product.getStock());
    }

    @Test
    @DisplayName("Should restock inventory units correctly")
    void testRestockSuccess() {
        Product product = new Product(
                farmer, "Compost Bag", "desc", ProductCategory.COMPOST_AND_SOIL, "bag", new BigDecimal("12.00"), 5, null
        );

        product.restock(10);
        assertEquals(15, product.getStock());

        assertThrows(IllegalArgumentException.class, () -> product.restock(0));
        assertThrows(IllegalArgumentException.class, () -> product.restock(-3));
    }

    @Test
    @DisplayName("Should support soft-archival without hard deletion")
    void testSoftArchival() {
        Product product = new Product(
                farmer, "Heirloom Seeds", "desc", ProductCategory.SEEDS_AND_SAPLINGS, "packet", new BigDecimal("3.00"), 20, null
        );

        assertTrue(product.isActive());
        product.deactivate();
        assertFalse(product.isActive());

        product.activate();
        assertTrue(product.isActive());
    }

    @Test
    @DisplayName("Should update product metadata properly")
    void testUpdateDetails() {
        Product product = new Product(
                farmer, "Old Name", "Old Desc", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("5.00"), 10, null
        );

        product.updateDetails(
                "New Name", "New Desc", ProductCategory.FRESH_FRUITS, "box", new BigDecimal("8.00"), "new_photo.jpg"
        );

        assertEquals("New Name", product.getName());
        assertEquals("New Desc", product.getDescription());
        assertEquals(ProductCategory.FRESH_FRUITS, product.getCategory());
        assertEquals("box", product.getUnit());
        assertEquals(new BigDecimal("8.00"), product.getPriceInTokens());
        assertEquals("new_photo.jpg", product.getImageUrl());
    }
}
