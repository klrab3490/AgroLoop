package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.exception.InsufficientStockException;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.model.TransactionType;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Marketplace Concurrency Integration Tests (Real Database PESSIMISTIC_WRITE)")
class MarketplaceConcurrencyIntegrationTest {

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

    private Farmer farmer;
    private Product limitedProduct;
    private final List<Household> households = new ArrayList<>();

    @BeforeEach
    void setUp() {
        tearDown();

        farmer = farmerRepository.save(new Farmer(
                "Farmer Green",
                "farmer.green@example.com",
                "secret_hash",
                "Green Valley Organics",
                "Wayanad Hills",
                "Certified Organic"
        ));

        // Initialized with stock = 2
        limitedProduct = productRepository.save(new Product(
                farmer,
                "Rare Heirloom Tomato",
                "Limited harvest heirloom tomatoes",
                ProductCategory.ORGANIC_VEGETABLES,
                "kg",
                new BigDecimal("10.00"),
                2,
                null
        ));

        // Create 10 distinct households, each with 50.00 EcoTokens
        for (int i = 1; i <= 10; i++) {
            Household h = new Household(
                    "Household " + i,
                    "household" + i + "@example.com",
                    "secret_hash",
                    "123 Street " + i
            );
            h.addTokens(new BigDecimal("50.00"));
            households.add(householdRepository.save(h));
        }
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

        households.clear();
    }

    @Test
    @DisplayName("10 concurrent households each requesting quantity=1 against stock=2: Exactly 2 succeed, 8 fail with InsufficientStockException")
    void testTenConcurrentCheckoutsAgainstTwoUnits() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger stockFailureCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            final Household household = households.get(i);
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await(); // Simultaneous burst
                    CartItemDto item = new CartItemDto(
                            limitedProduct.getId(),
                            limitedProduct.getName(),
                            limitedProduct.getPriceInTokens(),
                            limitedProduct.getUnit(),
                            limitedProduct.getCategory(),
                            farmer.getName(),
                            null,
                            1 // exactly 1 unit
                    );
                    CartDto cart = new CartDto(List.of(item));
                    CheckoutRequest request = new CheckoutRequest("Delivery Address", "Concurrent Test");

                    Order order = marketplaceService.checkout(household.getEmail(), cart, request);
                    if (order != null && order.getId() != null) {
                        successCount.incrementAndGet();
                    }
                } catch (InsufficientStockException ex) {
                    stockFailureCount.incrementAndGet();
                } catch (Throwable th) {
                    unexpectedErrors.add(th);
                }
            }));
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown(); // Fire!

        executor.shutdown();
        executor.awaitTermination(15, TimeUnit.SECONDS);

        // Assert determinism
        assertEquals(0, unexpectedErrors.size(), "Unexpected errors during checkout: " + unexpectedErrors);
        assertEquals(2, successCount.get(), "Exactly 2 checkouts must succeed for initial stock=2");
        assertEquals(8, stockFailureCount.get(), "Exactly 8 checkouts must fail with InsufficientStockException");

        // Assert database inventory invariant
        Product reloadedProduct = productRepository.findById(limitedProduct.getId()).orElseThrow();
        assertEquals(0, reloadedProduct.getStock(), "Stock must be exactly 0 (never negative)");

        // Assert database orders
        List<Order> allOrders = orderRepository.findAll();
        assertEquals(2, allOrders.size(), "Exactly 2 orders must be saved in database");

        // Assert database ledger transactions
        List<EcoTokenTransaction> allTransactions = ecoTokenTransactionRepository.findAll();
        assertEquals(2, allTransactions.size(), "Exactly 2 purchase transactions must be saved in database");
        for (EcoTokenTransaction tx : allTransactions) {
            assertEquals(TransactionType.MARKETPLACE_PURCHASE, tx.getTransactionType());
            assertEquals(new BigDecimal("10.00"), tx.getAmount());
            assertEquals(new BigDecimal("40.00"), tx.getBalanceAfter());
            assertNotNull(tx.getOrder());
        }
    }
}
