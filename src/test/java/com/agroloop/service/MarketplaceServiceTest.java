package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.exception.InsufficientStockException;
import com.agroloop.exception.InsufficientTokensException;
import com.agroloop.model.Admin;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.model.TransactionType;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MarketplaceService Unit Tests — Atomic Checkout Pipeline & Invariants")
class MarketplaceServiceTest {

    @Mock
    private HouseholdRepository householdRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private EcoTokenTransactionRepository ecoTokenTransactionRepository;

    @Mock
    private FarmerRepository farmerRepository;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private MarketplaceServiceImpl marketplaceService;

    private Household household;
    private Farmer farmer;
    private Product product1;
    private Product product2;

    @BeforeEach
    void setUp() {
        household = new Household("Alice", "alice@example.com", "hash", "123 Green Way");
        household.addTokens(new BigDecimal("100.00"));
        org.springframework.test.util.ReflectionTestUtils.setField(household, "id", 1L);

        farmer = new Farmer("Bob", "bob@example.com", "hash", "Bob Farm", "Wayanad", "Bio");
        org.springframework.test.util.ReflectionTestUtils.setField(farmer, "id", 2L);

        product1 = new Product(farmer, "Tomatoes", "Red", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("5.00"), 20, null);
        org.springframework.test.util.ReflectionTestUtils.setField(product1, "id", 10L);

        product2 = new Product(farmer, "Compost", "Organic", ProductCategory.COMPOST_AND_SOIL, "bag", new BigDecimal("15.00"), 5, null);
        org.springframework.test.util.ReflectionTestUtils.setField(product2, "id", 20L);
    }

    @Test
    @DisplayName("Should successfully execute atomic checkout and emit single purchase ledger transaction")
    void testSuccessfulCheckout() {
        when(householdRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(household));
        when(householdRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(household));

        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(product1));
        when(productRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(product2));

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(o, "id", 501L);
            return o;
        });

        CartItemDto item1 = new CartItemDto(10L, "Tomatoes", new BigDecimal("5.00"), "kg", ProductCategory.ORGANIC_VEGETABLES, "Bob", null, 2); // 10 tokens
        CartItemDto item2 = new CartItemDto(20L, "Compost", new BigDecimal("15.00"), "bag", ProductCategory.COMPOST_AND_SOIL, "Bob", null, 1); // 15 tokens
        CartDto cart = new CartDto(List.of(item1, item2));

        CheckoutRequest request = new CheckoutRequest("456 Alternate Way", "Leave by gate");

        Order savedOrder = marketplaceService.checkout("alice@example.com", cart, request);

        assertNotNull(savedOrder);
        assertEquals(501L, savedOrder.getId());
        assertEquals("456 Alternate Way", savedOrder.getDeliveryAddress());
        assertEquals(new BigDecimal("25.00"), savedOrder.getTotalTokens());
        assertEquals(2, savedOrder.getItems().size());

        // Verify stock deducted
        assertEquals(18, product1.getStock()); // 20 - 2
        assertEquals(4, product2.getStock());  // 5 - 1

        // Verify tokens debited
        assertEquals(new BigDecimal("75.00"), household.getTokenBalance()); // 100 - 25

        // Verify EcoTokenTransaction emitted
        ArgumentCaptor<EcoTokenTransaction> txCaptor = ArgumentCaptor.forClass(EcoTokenTransaction.class);
        verify(ecoTokenTransactionRepository).save(txCaptor.capture());
        EcoTokenTransaction capturedTx = txCaptor.getValue();

        assertEquals(household, capturedTx.getHousehold());
        assertEquals(savedOrder, capturedTx.getOrder());
        assertEquals(null, capturedTx.getWasteVerification());
        assertEquals(TransactionType.MARKETPLACE_PURCHASE, capturedTx.getTransactionType());
        assertEquals(new BigDecimal("25.00"), capturedTx.getAmount());
        assertEquals(new BigDecimal("75.00"), capturedTx.getBalanceAfter());
    }

    @Test
    @DisplayName("Should calculate total using authoritative server price, ignoring client price modifications")
    void testAuthoritativeServerPricing() {
        when(householdRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(household));
        when(householdRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(household));
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(product1));

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(o, "id", 502L);
            return o;
        });

        // Client attempts to pass tampered price of 0.01 tokens
        CartItemDto tamperedItem = new CartItemDto(10L, "Tomatoes", new BigDecimal("0.01"), "kg", ProductCategory.ORGANIC_VEGETABLES, "Bob", null, 3);
        CartDto cart = new CartDto(List.of(tamperedItem));

        Order order = marketplaceService.checkout("alice@example.com", cart, new CheckoutRequest("123 Green Way", null));

        // Authoritative DB price (5.00 * 3 = 15.00) must be used, NOT 0.03
        assertEquals(new BigDecimal("15.00"), order.getTotalTokens());
        assertEquals(new BigDecimal("85.00"), household.getTokenBalance());
    }

    @Test
    @DisplayName("Should reject checkout if product is inactive")
    void testCheckoutInactiveProduct() {
        product1.deactivate();

        when(householdRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(household));
        when(householdRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(household));
        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(product1));

        CartItemDto item = new CartItemDto(10L, "Tomatoes", new BigDecimal("5.00"), "kg", ProductCategory.ORGANIC_VEGETABLES, "Bob", null, 1);
        CartDto cart = new CartDto(List.of(item));

        assertThrows(IllegalStateException.class, () ->
                marketplaceService.checkout("alice@example.com", cart, new CheckoutRequest("123 Green Way", null))
        );
    }

    @Test
    @DisplayName("Should throw InsufficientStockException when requested quantity exceeds product stock")
    void testCheckoutInsufficientStock() {
        when(householdRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(household));
        when(householdRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(household));
        when(productRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(product2)); // stock = 5

        CartItemDto item = new CartItemDto(20L, "Compost", new BigDecimal("15.00"), "bag", ProductCategory.COMPOST_AND_SOIL, "Bob", null, 6);
        CartDto cart = new CartDto(List.of(item));

        InsufficientStockException ex = assertThrows(InsufficientStockException.class, () ->
                marketplaceService.checkout("alice@example.com", cart, new CheckoutRequest("123 Green Way", null))
        );
        assertEquals(20L, ex.getProductId());
        assertEquals(6, ex.getRequestedQuantity());
        assertEquals(5, ex.getAvailableStock());
    }

    @Test
    @DisplayName("Should throw InsufficientTokensException when household balance is insufficient")
    void testCheckoutInsufficientTokens() {
        // Household only has 10.00 tokens
        Household brokeHousehold = new Household("Charlie", "charlie@example.com", "hash", "123 Way");
        brokeHousehold.addTokens(new BigDecimal("10.00"));
        org.springframework.test.util.ReflectionTestUtils.setField(brokeHousehold, "id", 99L);

        when(householdRepository.findByEmail("charlie@example.com")).thenReturn(Optional.of(brokeHousehold));
        when(householdRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(brokeHousehold));
        when(productRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(product2)); // 15.00 tokens

        CartItemDto item = new CartItemDto(20L, "Compost", new BigDecimal("15.00"), "bag", ProductCategory.COMPOST_AND_SOIL, "Bob", null, 1);
        CartDto cart = new CartDto(List.of(item));

        InsufficientTokensException ex = assertThrows(InsufficientTokensException.class, () ->
                marketplaceService.checkout("charlie@example.com", cart, new CheckoutRequest("123 Way", null))
        );
        assertEquals(new BigDecimal("10.00"), ex.getCurrentBalance());
        assertEquals(new BigDecimal("15.00"), ex.getRequiredTokens());
    }

    @Test
    @DisplayName("Should reject empty cart checkout")
    void testCheckoutEmptyCart() {
        CartDto emptyCart = new CartDto(List.of());
        assertThrows(IllegalArgumentException.class, () ->
                marketplaceService.checkout("alice@example.com", emptyCart, new CheckoutRequest("Address", null))
        );
    }

    @Test
    @DisplayName("getOrderById allows access to household buyer")
    void testGetOrderByIdHouseholdOwner() {
        Order order = new Order(household, "Delivery Address", null);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        Order result = marketplaceService.getOrderById(100L, "alice@example.com");
        assertNotNull(result);
        assertEquals(household, result.getHousehold());
    }

    @Test
    @DisplayName("getOrderById allows access to participating farmer")
    void testGetOrderByIdFarmerParticipant() {
        Order order = new Order(household, "Delivery Address", null);
        order.addItem(product1, 2);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(farmerRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(farmer));

        Order result = marketplaceService.getOrderById(100L, "bob@example.com");
        assertNotNull(result);
        assertEquals(household, result.getHousehold());
    }

    @Test
    @DisplayName("getOrderById allows access to administrator")
    void testGetOrderByIdAdmin() {
        Order order = new Order(household, "Delivery Address", null);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(adminRepository.findByEmail("admin@agroloop.com")).thenReturn(Optional.of(new Admin("Admin", "admin@agroloop.com", "hash")));

        Order result = marketplaceService.getOrderById(100L, "admin@agroloop.com");
        assertNotNull(result);
        assertEquals(household, result.getHousehold());
    }

    @Test
    @DisplayName("getOrderById rejects access to unauthorized third party")
    void testGetOrderByIdUnauthorizedUser() {
        Order order = new Order(household, "Delivery Address", null);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(adminRepository.findByEmail("stranger@example.com")).thenReturn(Optional.empty());

        assertThrows(AccessDeniedException.class, () ->
                marketplaceService.getOrderById(100L, "stranger@example.com")
        );
    }
}
