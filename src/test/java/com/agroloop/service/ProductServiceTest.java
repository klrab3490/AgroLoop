package com.agroloop.service;

import com.agroloop.dto.ProductFormRequest;
import com.agroloop.model.Farmer;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.service.storage.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProductService Unit Tests — Listing Management & Strict Ownership Authorization")
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private FarmerRepository farmerRepository;

    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private ProductServiceImpl productService;

    private Farmer farmerBob;
    private Farmer farmerCharlie;
    private Product product;

    @BeforeEach
    void setUp() {
        farmerBob = new Farmer("Bob", "bob@example.com", "hash", "Bob Farm", "Wayanad", "Notes");
        org.springframework.test.util.ReflectionTestUtils.setField(farmerBob, "id", 10L);

        farmerCharlie = new Farmer("Charlie", "charlie@example.com", "hash", "Charlie Farm", "Idukki", "Notes");
        org.springframework.test.util.ReflectionTestUtils.setField(farmerCharlie, "id", 20L);

        product = new Product(farmerBob, "Farm Potatoes", "Crisp potatoes", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("3.00"), 50, "products/potato.jpg");
        org.springframework.test.util.ReflectionTestUtils.setField(product, "id", 100L);
    }

    @Test
    @DisplayName("Should successfully create product and delegate image upload")
    void testCreateProduct() {
        ProductFormRequest form = new ProductFormRequest(
                "Fresh Basil", "Fragrant", ProductCategory.HERBS_AND_SPICES, "bundle", new BigDecimal("2.50"), 30
        );

        when(farmerRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(farmerBob));
        when(fileStorageService.storeFile(any(), any())).thenReturn("products/basil.jpg");
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Product created = productService.createProduct("bob@example.com", form);

        assertNotNull(created);
        assertEquals("Fresh Basil", created.getName());
        assertEquals(farmerBob, created.getFarmer());
        assertEquals("products/basil.jpg", created.getImageUrl());
        verify(productRepository).save(any(Product.class));
    }

    @Test
    @DisplayName("Should update product when authenticated farmer is the owner")
    void testUpdateProductSuccess() {
        ProductFormRequest form = new ProductFormRequest(
                "Updated Potatoes", "New desc", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("3.50"), 50
        );

        when(farmerRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(farmerBob));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Product updated = productService.updateProduct(100L, "bob@example.com", form);

        assertEquals("Updated Potatoes", updated.getName());
        assertEquals(new BigDecimal("3.50"), updated.getPriceInTokens());
    }

    @Test
    @DisplayName("Should reject product update if farmer is not the owner (AccessDeniedException)")
    void testUpdateProductDeniedForNonOwner() {
        ProductFormRequest form = new ProductFormRequest("Malicious Edit", "desc", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("1.00"), 10);

        when(farmerRepository.findByEmail("charlie@example.com")).thenReturn(Optional.of(farmerCharlie));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));

        assertThrows(AccessDeniedException.class, () -> productService.updateProduct(100L, "charlie@example.com", form));
    }

    @Test
    @DisplayName("Should restock product when owner authorizes, but reject non-owner")
    void testRestockOwnership() {
        when(farmerRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(farmerBob));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));

        productService.restockProduct(100L, "bob@example.com", 25);
        assertEquals(75, product.getStock());

        when(farmerRepository.findByEmail("charlie@example.com")).thenReturn(Optional.of(farmerCharlie));
        assertThrows(AccessDeniedException.class, () -> productService.restockProduct(100L, "charlie@example.com", 10));
    }

    @Test
    @DisplayName("Should toggle product active status when owner authorizes, but reject non-owner")
    void testToggleStatusOwnership() {
        when(farmerRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(farmerBob));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));

        assertTrue(product.isActive());
        productService.toggleProductStatus(100L, "bob@example.com");
        assertFalse(product.isActive());

        when(farmerRepository.findByEmail("charlie@example.com")).thenReturn(Optional.of(farmerCharlie));
        assertThrows(AccessDeniedException.class, () -> productService.toggleProductStatus(100L, "charlie@example.com"));
    }

    @Test
    @DisplayName("Should filter active catalog products by category and keyword")
    void testCatalogFiltering() {
        when(productRepository.findByCategoryAndNameContainingIgnoreCaseAndActiveTrueOrderByCreatedAtDesc(
                ProductCategory.ORGANIC_VEGETABLES, "potato"
        )).thenReturn(List.of(product));

        List<Product> results = productService.getActiveCatalogProducts(ProductCategory.ORGANIC_VEGETABLES, "potato");
        assertEquals(1, results.size());

        when(productRepository.findByCategoryAndActiveTrueOrderByCreatedAtDesc(ProductCategory.ORGANIC_VEGETABLES))
                .thenReturn(List.of(product));
        assertEquals(1, productService.getActiveCatalogProducts(ProductCategory.ORGANIC_VEGETABLES, null).size());

        when(productRepository.findAllByActiveTrueOrderByCreatedAtDesc()).thenReturn(List.of(product));
        assertEquals(1, productService.getActiveCatalogProducts(null, null).size());
    }
}
