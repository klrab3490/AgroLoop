package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.model.Admin;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
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
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Order Lifecycle Tri-Race Concurrency Integration Tests")
class OrderLifecycleConcurrencyTest {

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
    private Admin admin;
    private Product product;

    @BeforeEach
    void setUp() {
        tearDown();

        farmer = farmerRepository.save(new Farmer("Farmer Bill", "bill.farmer@example.com", "hash", "Bill Organic", "Kochi", "Farm"));
        household = new Household("Household Dana", "dana@example.com", "hash", "500 Lake View");
        household.addTokens(new BigDecimal("100.00"));
        household = householdRepository.save(household);

        admin = adminRepository.save(new Admin("Admin Dan", "dan.admin@agroloop.com", "hash"));

        product = productRepository.save(new Product(
                farmer, "Apples", "Crisp apples", ProductCategory.FRESH_FRUITS, "kg", new BigDecimal("10.00"), 50, null
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
    @DisplayName("Tri-Race: Concurrent Household Cancel vs Household Dispute vs Admin Cancel results in exactly 1 Success and 2 Business Rejections")
    void testTriRaceConcurrency() throws InterruptedException {
        // Place initial order (2 apples @ 10 = 20)
        CartItemDto item = new CartItemDto(product.getId(), "Apples", new BigDecimal("10.00"), "kg", ProductCategory.FRESH_FRUITS, "Bill", null, 2);
        CartDto cart = new CartDto(List.of(item));

        Order order = marketplaceService.checkout(household.getEmail(), cart, new CheckoutRequest("500 Lake View", null));
        Long orderId = order.getId();

        int threadCount = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger businessRejectionCount = new AtomicInteger(0);
        AtomicInteger infrastructureFailureCount = new AtomicInteger(0);
        List<Throwable> exceptions = Collections.synchronizedList(new ArrayList<>());

        // Thread 1: Household cancel
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                marketplaceService.cancelHouseholdOrder(orderId, household.getEmail(), "Household cancel race");
                successCount.incrementAndGet();
            } catch (IllegalStateException ex) {
                businessRejectionCount.incrementAndGet();
            } catch (Throwable t) {
                infrastructureFailureCount.incrementAndGet();
                exceptions.add(t);
            }
        });

        // Thread 2: Household dispute
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                marketplaceService.disputeOrderAsHousehold(orderId, household.getEmail(), "Household dispute race");
                successCount.incrementAndGet();
            } catch (IllegalStateException ex) {
                businessRejectionCount.incrementAndGet();
            } catch (Throwable t) {
                infrastructureFailureCount.incrementAndGet();
                exceptions.add(t);
            }
        });

        // Thread 3: Admin cancel
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                marketplaceService.adminCancelOrder(orderId, admin.getEmail(), "Admin cancel race");
                successCount.incrementAndGet();
            } catch (IllegalStateException ex) {
                businessRejectionCount.incrementAndGet();
            } catch (Throwable t) {
                infrastructureFailureCount.incrementAndGet();
                exceptions.add(t);
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));

        assertEquals(1, successCount.get(), "Exactly one lifecycle transition must succeed");
        assertEquals(2, businessRejectionCount.get(), "The other two operations must receive standard business state rejection");
        assertEquals(0, infrastructureFailureCount.get(), "No infrastructure or deadlock exceptions allowed: " + exceptions);

        Order finalOrder = orderRepository.findById(orderId).orElseThrow();
        assertTrue(finalOrder.getStatus() == OrderStatus.CANCELLED || finalOrder.getStatus() == OrderStatus.DISPUTED);

        if (finalOrder.getStatus() == OrderStatus.CANCELLED) {
            // Exactly 1 refund ledger transaction exists
            List<EcoTokenTransaction> refunds = ecoTokenTransactionRepository.findByHouseholdOrderByIdAsc(household)
                    .stream()
                    .filter(tx -> tx.getTransactionType() == TransactionType.ORDER_REFUND)
                    .toList();
            assertEquals(1, refunds.size());

            Household finalHousehold = householdRepository.findById(household.getId()).orElseThrow();
            assertEquals(new BigDecimal("100.00"), finalHousehold.getTokenBalance());

            Product finalProduct = productRepository.findById(product.getId()).orElseThrow();
            assertEquals(50, finalProduct.getStock());
        } else {
            // If dispute won the race, no refund transaction should have been emitted yet
            List<EcoTokenTransaction> refunds = ecoTokenTransactionRepository.findByHouseholdOrderByIdAsc(household)
                    .stream()
                    .filter(tx -> tx.getTransactionType() == TransactionType.ORDER_REFUND)
                    .toList();
            assertEquals(0, refunds.size());

            Household finalHousehold = householdRepository.findById(household.getId()).orElseThrow();
            assertEquals(new BigDecimal("80.00"), finalHousehold.getTokenBalance());
        }
    }
}
