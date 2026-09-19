package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
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
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Marketplace Deadlock Avoidance & Rollback Atomicity Integration Tests")
class MarketplaceDeadlockAndRollbackIntegrationTest {

    @Autowired
    private MarketplaceService marketplaceService;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private EcoTokenTransactionRepository ecoTokenTransactionRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private Farmer farmer;
    private Product productA;
    private Product productB;
    private Household household1;
    private Household household2;

    @BeforeEach
    void setUp() {
        tearDown();

        farmer = farmerRepository.save(new Farmer("Farmer Sam", "sam@example.com", "hash", "Sam Farm", "Kochi", "Farm"));

        productA = productRepository.save(new Product(
                farmer, "Product A", "Desc A", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("5.00"), 50, null
        ));

        productB = productRepository.save(new Product(
                farmer, "Product B", "Desc B", ProductCategory.FRESH_FRUITS, "kg", new BigDecimal("8.00"), 50, null
        ));

        household1 = new Household("Household One", "h1@example.com", "hash", "Street 1");
        household1.addTokens(new BigDecimal("100.00"));
        household1 = householdRepository.save(household1);

        household2 = new Household("Household Two", "h2@example.com", "hash", "Street 2");
        household2.addTokens(new BigDecimal("100.00"));
        household2 = householdRepository.save(household2);
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
    }

    @Test
    @DisplayName("Opposite cart orderings [A, B] and [B, A] do not deadlock due to ascending product-ID lock ordering")
    void testOppositeOrderingsDoNotDeadlock() throws InterruptedException {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger completedCount = new AtomicInteger(0);
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        // Thread 1: Cart ordered [A, B]
        Future<?> f1 = executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                CartItemDto itemA = new CartItemDto(productA.getId(), productA.getName(), productA.getPriceInTokens(), "kg", productA.getCategory(), farmer.getName(), null, 1);
                CartItemDto itemB = new CartItemDto(productB.getId(), productB.getName(), productB.getPriceInTokens(), "kg", productB.getCategory(), farmer.getName(), null, 1);
                CartDto cart = new CartDto(List.of(itemA, itemB));

                marketplaceService.checkout(household1.getEmail(), cart, new CheckoutRequest("Address 1", null));
                completedCount.incrementAndGet();
            } catch (Throwable th) {
                errors.add(th);
            }
        });

        // Thread 2: Cart ordered [B, A] (inverted!)
        Future<?> f2 = executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                CartItemDto itemB = new CartItemDto(productB.getId(), productB.getName(), productB.getPriceInTokens(), "kg", productB.getCategory(), farmer.getName(), null, 1);
                CartItemDto itemA = new CartItemDto(productA.getId(), productA.getName(), productA.getPriceInTokens(), "kg", productA.getCategory(), farmer.getName(), null, 1);
                CartDto cart = new CartDto(List.of(itemB, itemA));

                marketplaceService.checkout(household2.getEmail(), cart, new CheckoutRequest("Address 2", null));
                completedCount.incrementAndGet();
            } catch (Throwable th) {
                errors.add(th);
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();

        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertEquals(0, errors.size(), "Deadlock or exception occurred: " + errors);
        assertEquals(2, completedCount.get(), "Both concurrent checkouts must complete without deadlock");

        Product finalA = productRepository.findById(productA.getId()).orElseThrow();
        Product finalB = productRepository.findById(productB.getId()).orElseThrow();
        assertEquals(48, finalA.getStock()); // 50 - 2
        assertEquals(48, finalB.getStock()); // 50 - 2
    }

    @Test
    @DisplayName("Transaction rollback test: Exception during checkout reverts staged stock and token mutations")
    void testTransactionRollbackAtomicity() {
        int initialStockA = productA.getStock();
        BigDecimal initialBalance = household1.getTokenBalance();

        // Pass invalid delivery address that fails at Order entity instantiation or validation
        CartItemDto itemA = new CartItemDto(productA.getId(), productA.getName(), productA.getPriceInTokens(), "kg", productA.getCategory(), farmer.getName(), null, 2);
        CartDto cart = new CartDto(List.of(itemA));

        // Create household with null registered address and provide blank delivery address to force IllegalArgumentException in Order constructor
        Household addresslessHousehold = new Household("No Address", "noaddr@example.com", "hash", null);
        addresslessHousehold.addTokens(new BigDecimal("50.00"));
        addresslessHousehold = householdRepository.save(addresslessHousehold);

        final String userEmail = addresslessHousehold.getEmail();
        CheckoutRequest blankAddressRequest = new CheckoutRequest("   ", null);

        assertThrows(IllegalArgumentException.class, () ->
                marketplaceService.checkout(userEmail, cart, blankAddressRequest)
        );

        // Verify that stock was NOT deducted (rolled back)
        Product reloadedA = productRepository.findById(productA.getId()).orElseThrow();
        assertEquals(initialStockA, reloadedA.getStock(), "Product stock must be rolled back on failure");

        // Verify that token balance was NOT debited (rolled back)
        Household reloadedHousehold = householdRepository.findById(addresslessHousehold.getId()).orElseThrow();
        assertEquals(new BigDecimal("50.00"), reloadedHousehold.getTokenBalance(), "Household balance must be rolled back");

        // Verify zero orders and zero transactions
        assertEquals(0, orderRepository.findAll().size());
        assertEquals(0, ecoTokenTransactionRepository.findAll().size());
    }
}
