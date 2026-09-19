package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.model.Farmer;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CartService Unit Tests — Session Shopping Cart & Boundary Guards")
class CartServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CartServiceImpl cartService;

    private MockHttpSession session;
    private Farmer farmer;
    private Product activeProduct;
    private Product inactiveProduct;

    @BeforeEach
    void setUp() {
        session = new MockHttpSession();
        farmer = new Farmer("Farmer Bob", "bob@example.com", "hash", "Bob Farm", "Wayanad", "Notes");

        activeProduct = new Product(farmer, "Organic Apples", "Fresh", ProductCategory.FRESH_FRUITS, "kg", new BigDecimal("6.00"), 20, null);
        org.springframework.test.util.ReflectionTestUtils.setField(activeProduct, "id", 1L);

        inactiveProduct = new Product(farmer, "Old Jam", "Expired", ProductCategory.FRESH_FRUITS, "jar", new BigDecimal("4.00"), 0, null);
        inactiveProduct.deactivate();
        org.springframework.test.util.ReflectionTestUtils.setField(inactiveProduct, "id", 2L);
    }

    @Test
    @DisplayName("Should initialize an empty cart if session has no existing cart")
    void testGetEmptyCart() {
        CartDto cart = cartService.getCart(session);
        assertNotNull(cart);
        assertTrue(cart.isEmpty());
        assertEquals(0, cart.getTotalQuantity());
        assertEquals(BigDecimal.ZERO.setScale(2), cart.getTotalTokens());
    }

    @Test
    @DisplayName("Should add item to cart and calculate totals")
    void testAddToCartSuccess() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(activeProduct));

        cartService.addToCart(session, 1L, 2);

        CartDto cart = cartService.getCart(session);
        assertFalse(cart.isEmpty());
        assertEquals(1, cart.getItems().size());
        assertEquals(2, cart.getTotalQuantity());
        assertEquals(new BigDecimal("12.00"), cart.getTotalTokens());
        assertEquals("Organic Apples", cart.getItems().get(0).getProductName());
    }

    @Test
    @DisplayName("Adding existing product should increment quantity")
    void testAddExistingProductIncrementsQuantity() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(activeProduct));

        cartService.addToCart(session, 1L, 2);
        cartService.addToCart(session, 1L, 3);

        CartDto cart = cartService.getCart(session);
        assertEquals(1, cart.getItems().size());
        assertEquals(5, cart.getTotalQuantity());
        assertEquals(new BigDecimal("30.00"), cart.getTotalTokens());
    }

    @Test
    @DisplayName("Should reject non-positive quantities when adding to cart")
    void testAddNonPositiveQuantityThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> cartService.addToCart(session, 1L, 0));
        assertThrows(IllegalArgumentException.class, () -> cartService.addToCart(session, 1L, -1));
    }

    @Test
    @DisplayName("Should reject adding inactive product to cart")
    void testAddInactiveProductThrowsException() {
        when(productRepository.findById(2L)).thenReturn(Optional.of(inactiveProduct));

        assertThrows(IllegalArgumentException.class, () -> cartService.addToCart(session, 2L, 1));
    }

    @Test
    @DisplayName("Should update item quantity, and remove item if updated to 0 or negative")
    void testUpdateQuantity() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(activeProduct));
        cartService.addToCart(session, 1L, 2);

        cartService.updateQuantity(session, 1L, 5);
        assertEquals(5, cartService.getCart(session).getTotalQuantity());

        cartService.updateQuantity(session, 1L, 0);
        assertTrue(cartService.getCart(session).isEmpty());
    }

    @Test
    @DisplayName("Should remove item from cart completely")
    void testRemoveFromCart() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(activeProduct));
        cartService.addToCart(session, 1L, 2);

        cartService.removeFromCart(session, 1L);
        assertTrue(cartService.getCart(session).isEmpty());
    }

    @Test
    @DisplayName("Should clear cart session")
    void testClearCart() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(activeProduct));
        cartService.addToCart(session, 1L, 2);

        cartService.clearCart(session);
        assertTrue(cartService.getCart(session).isEmpty());
    }
}
