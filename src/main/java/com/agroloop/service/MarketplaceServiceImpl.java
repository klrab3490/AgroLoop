package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.exception.InsufficientStockException;
import com.agroloop.exception.InsufficientTokensException;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.Product;
import com.agroloop.model.TransactionType;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class MarketplaceServiceImpl implements MarketplaceService {

    private final HouseholdRepository householdRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final EcoTokenTransactionRepository ecoTokenTransactionRepository;
    private final FarmerRepository farmerRepository;
    private final AdminRepository adminRepository;

    public MarketplaceServiceImpl(
            HouseholdRepository householdRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            EcoTokenTransactionRepository ecoTokenTransactionRepository,
            FarmerRepository farmerRepository,
            AdminRepository adminRepository
    ) {
        this.householdRepository = Objects.requireNonNull(householdRepository, "HouseholdRepository cannot be null");
        this.productRepository = Objects.requireNonNull(productRepository, "ProductRepository cannot be null");
        this.orderRepository = Objects.requireNonNull(orderRepository, "OrderRepository cannot be null");
        this.ecoTokenTransactionRepository = Objects.requireNonNull(ecoTokenTransactionRepository, "EcoTokenTransactionRepository cannot be null");
        this.farmerRepository = Objects.requireNonNull(farmerRepository, "FarmerRepository cannot be null");
        this.adminRepository = Objects.requireNonNull(adminRepository, "AdminRepository cannot be null");
    }

    @Override
    @Transactional
    public Order checkout(String householdEmail, CartDto cart, CheckoutRequest request) {
        Objects.requireNonNull(householdEmail, "Household email cannot be null");
        Objects.requireNonNull(cart, "Cart cannot be null");
        Objects.requireNonNull(request, "CheckoutRequest cannot be null");

        if (cart.isEmpty()) {
            throw new IllegalArgumentException("Cannot checkout with an empty cart");
        }

        // 1. Resolve Household and acquire exclusive pessimistic write lock
        Household initialHousehold = householdRepository.findByEmail(householdEmail)
                .orElseThrow(() -> new IllegalArgumentException("Household not found for email: " + householdEmail));

        Household household = householdRepository.findByIdForUpdate(initialHousehold.getId())
                .orElseThrow(() -> new IllegalArgumentException("Household lock failed for ID: " + initialHousehold.getId()));

        // 2. Sort distinct product IDs in ascending natural order to prevent deadlocks
        List<Long> sortedProductIds = cart.getItems().stream()
                .map(CartItemDto::getProductId)
                .distinct()
                .sorted()
                .toList();

        // 3. Sequentially acquire pessimistic write locks on products in sorted ascending order
        Map<Long, Product> lockedProducts = new LinkedHashMap<>();
        for (Long productId : sortedProductIds) {
            Product product = productRepository.findByIdForUpdate(productId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + productId));
            lockedProducts.put(productId, product);
        }

        // 4. Pure Validation Phase: verify active status, positive quantity, and stock availability
        for (CartItemDto item : cart.getItems()) {
            Product product = lockedProducts.get(item.getProductId());

            if (!product.isActive()) {
                throw new IllegalStateException("Product '" + product.getName() + "' is no longer active for purchase");
            }
            if (item.getQuantity() <= 0) {
                throw new IllegalArgumentException("Item quantity must be greater than zero for product: " + product.getName());
            }
            if (product.getStock() < item.getQuantity()) {
                throw new InsufficientStockException(product.getId(), item.getQuantity(), product.getStock());
            }
        }

        // 5. Authoritative Server-Side Price Calculation from current database prices
        BigDecimal authoritativeTotal = BigDecimal.ZERO;
        for (CartItemDto item : cart.getItems()) {
            Product product = lockedProducts.get(item.getProductId());
            BigDecimal itemTotal = product.getPriceInTokens().multiply(BigDecimal.valueOf(item.getQuantity()));
            authoritativeTotal = authoritativeTotal.add(itemTotal);
        }
        authoritativeTotal = authoritativeTotal.setScale(2, RoundingMode.HALF_UP);

        // 6. Solvency Validation
        if (household.getTokenBalance().compareTo(authoritativeTotal) < 0) {
            throw new InsufficientTokensException(household.getTokenBalance(), authoritativeTotal);
        }

        // 7. Atomic Mutation Phase
        // a) Deduct product inventory
        for (CartItemDto item : cart.getItems()) {
            Product product = lockedProducts.get(item.getProductId());
            product.deductStock(item.getQuantity());
            productRepository.save(product);
        }

        // b) Debit household token balance
        household.spendTokens(authoritativeTotal);
        householdRepository.save(household);

        // 8. Persist Order and immutable historical snapshot OrderItems
        Order order = new Order(household, request.getDeliveryAddress(), request.getNotes());
        for (CartItemDto item : cart.getItems()) {
            Product product = lockedProducts.get(item.getProductId());
            order.addItem(product, item.getQuantity());
        }
        Order savedOrder = orderRepository.save(order);

        // 9. Persist immutable MARKETPLACE_PURCHASE ledger transaction
        String description = "Marketplace purchase for Order #" + savedOrder.getId();
        EcoTokenTransaction transaction = new EcoTokenTransaction(
                household,
                savedOrder,
                authoritativeTotal,
                TransactionType.MARKETPLACE_PURCHASE,
                household.getTokenBalance(),
                description
        );
        ecoTokenTransactionRepository.save(transaction);

        return savedOrder;
    }

    @Override
    public List<Order> getHouseholdOrders(String householdEmail) {
        Household household = householdRepository.findByEmail(householdEmail)
                .orElseThrow(() -> new IllegalArgumentException("Household not found for email: " + householdEmail));
        return orderRepository.findByHouseholdOrderByCreatedAtDesc(household);
    }

    @Override
    public Order getOrderById(Long orderId, String userEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        boolean isHouseholdOwner = order.getHousehold() != null
                && Objects.equals(order.getHousehold().getEmail(), userEmail);

        boolean isFarmerParticipant = order.getItems().stream()
                .anyMatch(item -> item.getProduct() != null
                        && item.getProduct().getFarmer() != null
                        && Objects.equals(item.getProduct().getFarmer().getEmail(), userEmail));

        boolean isAdmin = adminRepository.findByEmail(userEmail).isPresent();

        if (!isHouseholdOwner && !isFarmerParticipant && !isAdmin) {
            throw new AccessDeniedException("User is not authorized to view this order");
        }

        return order;
    }

    @Override
    public List<Order> getFarmerOrders(String farmerEmail) {
        Farmer farmer = farmerRepository.findByEmail(farmerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Farmer not found with email: " + farmerEmail));
        return orderRepository.findOrdersForFarmer(farmer);
    }
}
