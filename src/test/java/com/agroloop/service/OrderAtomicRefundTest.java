package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.model.Admin;
import com.agroloop.model.DisputeResolution;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.model.TransactionDirection;
import com.agroloop.model.TransactionType;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderItemRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.annotation.DirtiesContext;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Order Atomic Refund & Dispute Lifecycle Integration Tests")
class OrderAtomicRefundTest {

    @Autowired
    private MarketplaceService marketplaceService;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private EcoTokenTransactionRepository ecoTokenTransactionRepository;

    private Farmer farmer;
    private Household household;
    private Household otherHousehold;
    private Admin admin;
    private Product product1;
    private Product product2;

    @BeforeEach
    void setUp() {
        tearDown();

        farmer = farmerRepository.save(new Farmer("Farmer John", "farmer.john@example.com", "hash", "John Farm", "Wayanad", "Organic"));
        household = new Household("Alice Green", "alice.green@example.com", "hash", "123 Forest Rd");
        household.addTokens(new BigDecimal("200.00"));
        household = householdRepository.save(household);

        otherHousehold = new Household("Charlie Brown", "charlie@example.com", "hash", "456 Oak Lane");
        otherHousehold.addTokens(new BigDecimal("100.00"));
        otherHousehold = householdRepository.save(otherHousehold);

        admin = adminRepository.save(new Admin("Admin Sara", "sara.admin@agroloop.com", "hash"));

        product1 = productRepository.save(new Product(
                farmer, "Fresh Spinach", "Organic spinach", ProductCategory.ORGANIC_VEGETABLES, "bunch", new BigDecimal("10.00"), 30, null
        ));
        product2 = productRepository.save(new Product(
                farmer, "Rich Compost", "Soil booster", ProductCategory.COMPOST_AND_SOIL, "bag", new BigDecimal("25.00"), 10, null
        ));
    }

    @AfterEach
    void tearDown() {
        ecoTokenTransactionRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        productRepository.deleteAll();

        householdRepository.findAll().stream()
                .filter(h -> !"household@agroloop.com".equals(h.getEmail()))
                .forEach(householdRepository::delete);

        farmerRepository.findAll().stream()
                .filter(f -> !"farmer@agroloop.com".equals(f.getEmail()))
                .forEach(farmerRepository::delete);

        adminRepository.findAll().stream()
                .filter(a -> !"admin@agroloop.com".equals(a.getEmail()))
                .forEach(adminRepository::delete);
    }

    @Test
    @DisplayName("Household cancellation restores stock, refunds tokens, emits ORDER_REFUND, and sets status CANCELLED")
    void testSuccessfulHouseholdCancellationAndRefund() {
        // 1. Place order (2 spinach @ 10 = 20, 1 compost @ 25 = 25; total = 45)
        CartItemDto item1 = new CartItemDto(product1.getId(), "Fresh Spinach", new BigDecimal("10.00"), "bunch", ProductCategory.ORGANIC_VEGETABLES, "John", null, 2);
        CartItemDto item2 = new CartItemDto(product2.getId(), "Rich Compost", new BigDecimal("25.00"), "bag", ProductCategory.COMPOST_AND_SOIL, "John", null, 1);
        CartDto cart = new CartDto(List.of(item1, item2));

        Order order = marketplaceService.checkout(household.getEmail(), cart, new CheckoutRequest("123 Forest Rd", "Leave at porch"));
        Long orderId = order.getId();

        // Verify post-checkout state
        Household reloadedHousehold = householdRepository.findById(household.getId()).orElseThrow();
        assertEquals(new BigDecimal("155.00"), reloadedHousehold.getTokenBalance()); // 200 - 45
        Product p1 = productRepository.findById(product1.getId()).orElseThrow();
        assertEquals(28, p1.getStock()); // 30 - 2
        Product p2 = productRepository.findById(product2.getId()).orElseThrow();
        assertEquals(9, p2.getStock()); // 10 - 1

        // 2. Cancel order
        marketplaceService.cancelHouseholdOrder(orderId, household.getEmail(), "Changed my mind before shipment");

        // 3. Assert full atomic reversal
        Order cancelledOrder = orderRepository.findById(orderId).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, cancelledOrder.getStatus());
        assertEquals("Changed my mind before shipment", cancelledOrder.getCancellationReason());
        assertNotNull(cancelledOrder.getCancellationActor());
        assertNotNull(cancelledOrder.getCancelledAt());

        // Stock restored
        p1 = productRepository.findById(product1.getId()).orElseThrow();
        assertEquals(30, p1.getStock());
        p2 = productRepository.findById(product2.getId()).orElseThrow();
        assertEquals(10, p2.getStock());

        // Household tokens refunded
        reloadedHousehold = householdRepository.findById(household.getId()).orElseThrow();
        assertEquals(new BigDecimal("200.00"), reloadedHousehold.getTokenBalance());

        // Ledger contains exactly two transactions for this order: purchase and refund
        List<EcoTokenTransaction> transactions = ecoTokenTransactionRepository.findByHouseholdOrderByIdAsc(reloadedHousehold);
        assertEquals(2, transactions.size());

        EcoTokenTransaction purchaseTx = transactions.get(0);
        assertEquals(TransactionType.MARKETPLACE_PURCHASE, purchaseTx.getTransactionType());
        assertEquals(TransactionDirection.DEBIT, purchaseTx.getDirection());
        assertEquals(new BigDecimal("45.00"), purchaseTx.getAmount());
        assertEquals(new BigDecimal("155.00"), purchaseTx.getBalanceAfter());

        EcoTokenTransaction refundTx = transactions.get(1);
        assertEquals(TransactionType.ORDER_REFUND, refundTx.getTransactionType());
        assertEquals(TransactionDirection.CREDIT, refundTx.getDirection());
        assertEquals(new BigDecimal("45.00"), refundTx.getAmount());
        assertEquals(new BigDecimal("200.00"), refundTx.getBalanceAfter());

        // Tripartite equality
        assertEquals(order.getTotalTokens(), purchaseTx.getAmount());
        assertEquals(purchaseTx.getAmount(), refundTx.getAmount());
    }

    @Test
    @DisplayName("Double refund prevention: executing refund a second time is strictly rejected")
    void testDoubleRefundPrevention() {
        CartItemDto item1 = new CartItemDto(product1.getId(), "Fresh Spinach", new BigDecimal("10.00"), "bunch", ProductCategory.ORGANIC_VEGETABLES, "John", null, 1);
        CartDto cart = new CartDto(List.of(item1));

        Order order = marketplaceService.checkout(household.getEmail(), cart, new CheckoutRequest("123 Forest Rd", null));
        Long orderId = order.getId();

        marketplaceService.cancelHouseholdOrder(orderId, household.getEmail(), "First cancellation");

        // Attempt second cancellation by household
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                marketplaceService.cancelHouseholdOrder(orderId, household.getEmail(), "Second cancellation"));
        assertTrue(ex.getMessage().contains("cannot be cancelled directly"));

        // Attempt admin cancellation on already cancelled order
        assertThrows(IllegalStateException.class, () ->
                marketplaceService.adminCancelOrder(orderId, admin.getEmail(), "Admin cancel"));

        // Household balance and stock remain exactly as after first refund
        Household reloadedHousehold = householdRepository.findById(household.getId()).orElseThrow();
        assertEquals(new BigDecimal("200.00"), reloadedHousehold.getTokenBalance());

        Product p1 = productRepository.findById(product1.getId()).orElseThrow();
        assertEquals(30, p1.getStock());
    }

    @Test
    @DisplayName("Non-owning household cannot cancel order")
    void testUnauthorizedHouseholdCannotCancel() {
        CartItemDto item1 = new CartItemDto(product1.getId(), "Fresh Spinach", new BigDecimal("10.00"), "bunch", ProductCategory.ORGANIC_VEGETABLES, "John", null, 1);
        CartDto cart = new CartDto(List.of(item1));

        Order order = marketplaceService.checkout(household.getEmail(), cart, new CheckoutRequest("123 Forest Rd", null));
        Long orderId = order.getId();

        assertThrows(AccessDeniedException.class, () ->
                marketplaceService.cancelHouseholdOrder(orderId, otherHousehold.getEmail(), "Malicious attempt"));

        Order reloadedOrder = orderRepository.findById(orderId).orElseThrow();
        assertEquals(OrderStatus.PLACED, reloadedOrder.getStatus());
    }

    @Test
    @DisplayName("Dispute resolution with APPROVED_REFUND restocks inventory and credits tokens")
    void testDisputeApprovedRefundRestocksAndCredits() {
        CartItemDto item1 = new CartItemDto(product1.getId(), "Fresh Spinach", new BigDecimal("10.00"), "bunch", ProductCategory.ORGANIC_VEGETABLES, "John", null, 2);
        CartDto cart = new CartDto(List.of(item1));

        Order order = marketplaceService.checkout(household.getEmail(), cart, new CheckoutRequest("123 Forest Rd", null));
        Long orderId = order.getId();

        // Household disputes order
        marketplaceService.disputeOrderAsHousehold(orderId, household.getEmail(), "Spoiled produce delivered");

        Order disputedOrder = orderRepository.findById(orderId).orElseThrow();
        assertEquals(OrderStatus.DISPUTED, disputedOrder.getStatus());
        assertEquals("Spoiled produce delivered", disputedOrder.getDisputeReason());

        // Admin approves refund
        marketplaceService.resolveDispute(orderId, admin.getEmail(), DisputeResolution.APPROVED_REFUND, "Verified photo evidence of spoiled goods");

        Order resolvedOrder = orderRepository.findById(orderId).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, resolvedOrder.getStatus());
        assertEquals(DisputeResolution.APPROVED_REFUND, resolvedOrder.getResolutionType());
        assertEquals("Verified photo evidence of spoiled goods", resolvedOrder.getResolutionNotes());
        assertEquals(admin.getId(), resolvedOrder.getResolvedBy().getId());

        // Stock restored
        Product p1 = productRepository.findById(product1.getId()).orElseThrow();
        assertEquals(30, p1.getStock());

        // Tokens refunded
        Household reloadedHousehold = householdRepository.findById(household.getId()).orElseThrow();
        assertEquals(new BigDecimal("200.00"), reloadedHousehold.getTokenBalance());

        // Refund ledger emitted
        EcoTokenTransaction refundTx = ecoTokenTransactionRepository
                .findByOrderAndTransactionType(resolvedOrder, TransactionType.ORDER_REFUND)
                .orElseThrow();
        assertEquals(new BigDecimal("20.00"), refundTx.getAmount());
        assertEquals(TransactionDirection.CREDIT, refundTx.getDirection());
    }

    @Test
    @DisplayName("Dispute resolution with DISMISSED returns order to PLACED without restocking or crediting")
    void testDisputeDismissedDoesNotRestockNorRefund() {
        CartItemDto item1 = new CartItemDto(product1.getId(), "Fresh Spinach", new BigDecimal("10.00"), "bunch", ProductCategory.ORGANIC_VEGETABLES, "John", null, 2);
        CartDto cart = new CartDto(List.of(item1));

        Order order = marketplaceService.checkout(household.getEmail(), cart, new CheckoutRequest("123 Forest Rd", null));
        Long orderId = order.getId();

        // Farmer disputes order
        marketplaceService.disputeOrderAsFarmer(orderId, farmer.getEmail(), "Incorrect claim on delivery");

        Order disputedOrder = orderRepository.findById(orderId).orElseThrow();
        assertEquals(OrderStatus.DISPUTED, disputedOrder.getStatus());

        // Admin dismisses dispute
        marketplaceService.resolveDispute(orderId, admin.getEmail(), DisputeResolution.DISMISSED, "Delivery proof confirmed valid");

        Order dismissedOrder = orderRepository.findById(orderId).orElseThrow();
        assertEquals(OrderStatus.PLACED, dismissedOrder.getStatus());
        assertEquals(DisputeResolution.DISMISSED, dismissedOrder.getResolutionType());
        assertEquals("Delivery proof confirmed valid", dismissedOrder.getResolutionNotes());

        // Stock NOT restored (remains 28)
        Product p1 = productRepository.findById(product1.getId()).orElseThrow();
        assertEquals(28, p1.getStock());

        // Household tokens NOT refunded (remains 180)
        Household reloadedHousehold = householdRepository.findById(household.getId()).orElseThrow();
        assertEquals(new BigDecimal("180.00"), reloadedHousehold.getTokenBalance());

        // No ORDER_REFUND ledger transaction
        assertTrue(ecoTokenTransactionRepository.findByOrderAndTransactionType(dismissedOrder, TransactionType.ORDER_REFUND).isEmpty());

        // Cannot dispute a second time once resolved
        assertThrows(IllegalStateException.class, () ->
                marketplaceService.disputeOrderAsHousehold(orderId, household.getEmail(), "Second dispute"));
    }
}
