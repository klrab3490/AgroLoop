package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.exception.InsufficientStockException;
import com.agroloop.exception.InsufficientTokensException;
import com.agroloop.model.DisputeResolution;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderItem;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.Product;
import com.agroloop.model.RefundReason;
import com.agroloop.model.Role;
import com.agroloop.model.TransactionDirection;
import com.agroloop.model.TransactionType;
import com.agroloop.model.User;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.repository.UserRepository;
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
    private final UserRepository userRepository;

    public MarketplaceServiceImpl(
            HouseholdRepository householdRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            EcoTokenTransactionRepository ecoTokenTransactionRepository,
            FarmerRepository farmerRepository,
            AdminRepository adminRepository,
            UserRepository userRepository
    ) {
        this.householdRepository = Objects.requireNonNull(householdRepository, "HouseholdRepository cannot be null");
        this.productRepository = Objects.requireNonNull(productRepository, "ProductRepository cannot be null");
        this.orderRepository = Objects.requireNonNull(orderRepository, "OrderRepository cannot be null");
        this.ecoTokenTransactionRepository = Objects.requireNonNull(ecoTokenTransactionRepository, "EcoTokenTransactionRepository cannot be null");
        this.farmerRepository = Objects.requireNonNull(farmerRepository, "FarmerRepository cannot be null");
        this.adminRepository = Objects.requireNonNull(adminRepository, "AdminRepository cannot be null");
        this.userRepository = Objects.requireNonNull(userRepository, "UserRepository cannot be null");
    }

    @Override
    @Transactional
    public Order checkout(String householdEmail, CartDto cart, CheckoutRequest request) {
        Objects.requireNonNull(householdEmail, "Household email cannot be null");
        Objects.requireNonNull(cart, "Cart cannot be null");
        Objects.requireNonNull(request, "Checkout request cannot be null");

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cart cannot be empty for checkout");
        }

        // 1. Resolve Household entity from authenticated principal email (read-only query)
        Household initialHousehold = householdRepository.findByEmail(householdEmail)
                .orElseThrow(() -> new IllegalArgumentException("Household not found for email: " + householdEmail));

        // 2. Global lock hierarchy for checkout (order doesn't exist yet):
        //    Household -> Products (in ascending ID order)
        Household household = householdRepository.findByIdForUpdate(initialHousehold.getId())
                .orElseThrow(() -> new IllegalArgumentException("Household not found with ID: " + initialHousehold.getId()));

        // 3. Acquire Pessimistic Locks on all cart products in deterministic ascending ID order
        List<Long> productIds = cart.getItems().stream()
                .map(CartItemDto::getProductId)
                .distinct()
                .sorted()
                .toList();

        Map<Long, Product> lockedProducts = new LinkedHashMap<>();
        for (Long pId : productIds) {
            Product product = productRepository.findByIdForUpdate(pId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + pId));
            lockedProducts.put(pId, product);
        }

        // 4. Validate product availability and stock constraints
        for (CartItemDto item : cart.getItems()) {
            Product product = lockedProducts.get(item.getProductId());
            if (item.getQuantity() <= 0) {
                throw new IllegalArgumentException("Cart item quantity must be greater than zero for product: " + product.getName());
            }
            if (!product.isActive()) {
                throw new IllegalStateException("Product is not active: " + product.getName());
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

        // 9. Persist immutable MARKETPLACE_PURCHASE ledger transaction via factory
        User actor = userRepository.findByEmail(householdEmail)
                .orElse(household);
        EcoTokenTransaction transaction = EcoTokenTransaction.marketplacePurchase(
                household,
                savedOrder,
                authoritativeTotal,
                household.getTokenBalance(),
                actor
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

        // Check against historical snapshot farmerId, and fallback to product.farmer if needed
        Farmer farmer = farmerRepository.findByEmail(userEmail).orElse(null);
        boolean isFarmerParticipant = farmer != null && order.getItems().stream()
                .anyMatch(item -> Objects.equals(item.getFarmerId(), farmer.getId()));

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

    @Override
    @Transactional
    public void cancelHouseholdOrder(Long orderId, String householdEmail, String reason) {
        cancelOrder(orderId, householdEmail, reason);
    }

    @Override
    @Transactional
    public void cancelFarmerOrder(Long orderId, String farmerEmail, String reason) {
        cancelOrder(orderId, farmerEmail, reason);
    }

    @Override
    @Transactional
    public void cancelOrder(Long orderId, String actorEmail, String reason) {
        User actor = userRepository.findByEmail(actorEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + actorEmail));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        if (actor.getRole() == Role.ROLE_ADMIN) {
            executeRefund(orderId, actor, RefundReason.ADMIN_CANCELLATION, reason, null);
        } else if (order.getHousehold() != null && Objects.equals(order.getHousehold().getId(), actor.getId())) {
            executeRefund(orderId, actor, RefundReason.HOUSEHOLD_CANCELLATION, reason, null);
        } else if (order.getItems().stream().anyMatch(item -> Objects.equals(item.getFarmerId(), actor.getId()))) {
            executeRefund(orderId, actor, RefundReason.FARMER_CANCELLATION, reason, null);
        } else {
            throw new AccessDeniedException("User is not authorized to cancel Order #" + orderId);
        }
    }

    @Override
    @Transactional
    public void adminCancelOrder(Long orderId, String adminEmail, String reason) {
        User adminUser = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found with email: " + adminEmail));

        executeRefund(orderId, adminUser, RefundReason.ADMIN_CANCELLATION, reason, null);
    }

    @Override
    @Transactional
    public void disputeOrderAsHousehold(Long orderId, String householdEmail, String disputeReason) {
        Household callerHousehold = householdRepository.findByEmail(householdEmail)
                .orElseThrow(() -> new IllegalArgumentException("Household not found with email: " + householdEmail));
        User callerUser = userRepository.findByEmail(householdEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + householdEmail));

        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        if (!Objects.equals(order.getHousehold().getId(), callerHousehold.getId())) {
            throw new AccessDeniedException("Household does not own Order #" + orderId);
        }

        order.dispute(disputeReason, callerUser);
        orderRepository.save(order);
    }

    @Override
    @Transactional
    public void disputeOrderAsFarmer(Long orderId, String farmerEmail, String disputeReason) {
        Farmer farmer = farmerRepository.findByEmail(farmerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Farmer not found with email: " + farmerEmail));
        User farmerUser = userRepository.findByEmail(farmerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + farmerEmail));

        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        boolean isFarmerItem = order.getItems().stream()
                .anyMatch(item -> Objects.equals(item.getFarmerId(), farmer.getId()));

        if (!isFarmerItem) {
            throw new AccessDeniedException("Farmer does not participate in Order #" + orderId);
        }

        order.dispute(disputeReason, farmerUser);
        orderRepository.save(order);
    }

    @Override
    @Transactional
    public void resolveDispute(Long orderId, String adminEmail, DisputeResolution resolution, String resolutionNotes) {
        Objects.requireNonNull(resolution, "Dispute resolution cannot be null");
        User adminUser = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found with email: " + adminEmail));

        if (resolution == DisputeResolution.APPROVED_REFUND) {
            executeRefund(orderId, adminUser, RefundReason.DISPUTE_APPROVED, null, resolutionNotes);
        } else if (resolution == DisputeResolution.DISMISSED) {
            Order order = orderRepository.findByIdForUpdate(orderId)
                    .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));
            order.dismissDispute(resolutionNotes, adminUser);
            orderRepository.save(order);
        }
    }

    /**
     * Universal atomic refund engine adhering strictly to global lock hierarchy:
     * Order -> Household -> Products (ascending ID)
     * Participates in caller's active @Transactional boundary.
     */
    private void executeRefund(
            Long orderId,
            User actor,
            RefundReason refundReason,
            String cancellationReason,
            String resolutionNotes
    ) {
        // 1. Lock Order
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        // If household cancellation, verify ownership under lock
        if (refundReason == RefundReason.HOUSEHOLD_CANCELLATION) {
            if (!Objects.equals(order.getHousehold().getId(), actor.getId())) {
                throw new AccessDeniedException("Household does not own Order #" + orderId);
            }
        } else if (refundReason == RefundReason.FARMER_CANCELLATION) {
            boolean isFarmerItem = order.getItems().stream()
                    .anyMatch(item -> Objects.equals(item.getFarmerId(), actor.getId()));
            if (!isFarmerItem) {
                throw new AccessDeniedException("Farmer does not participate in Order #" + orderId);
            }
        }

        // 2. Validate state preconditions against RefundReason
        switch (refundReason) {
            case HOUSEHOLD_CANCELLATION, FARMER_CANCELLATION, ADMIN_CANCELLATION -> {
                if (order.getStatus() != OrderStatus.PLACED) {
                    throw new IllegalStateException("Order #" + orderId + " is in status " + order.getStatus() + " and cannot be cancelled directly");
                }
            }
            case DISPUTE_APPROVED -> {
                if (order.getStatus() != OrderStatus.DISPUTED) {
                    throw new IllegalStateException("Order #" + orderId + " is in status " + order.getStatus() + " and cannot have dispute approved");
                }
            }
        }

        // 3. Lock Household
        Household household = householdRepository.findByIdForUpdate(order.getHousehold().getId())
                .orElseThrow(() -> new IllegalStateException("Household not found for Order #" + orderId));

        // 4. Lock Products in natural ascending ID order
        List<Long> productIds = order.getItems().stream()
                .map(item -> item.getProduct().getId())
                .distinct()
                .sorted()
                .toList();

        Map<Long, Product> lockedProducts = new LinkedHashMap<>();
        for (Long pId : productIds) {
            Product p = productRepository.findByIdForUpdate(pId)
                    .orElseThrow(() -> new IllegalStateException("Product not found with ID: " + pId));
            lockedProducts.put(pId, p);
        }

        // 5. Validate canonical purchase & complete refund invariants
        EcoTokenTransaction purchaseTx = ecoTokenTransactionRepository
                .findByOrderAndTransactionType(order, TransactionType.MARKETPLACE_PURCHASE)
                .orElseThrow(() -> new IllegalStateException("Canonical purchase ledger missing for Order #" + orderId));

        if (purchaseTx.getDirection() != TransactionDirection.DEBIT || purchaseTx.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Corrupt purchase transaction detected for Order #" + orderId);
        }

        // Explicit order and household identity assertions
        if (!Objects.equals(purchaseTx.getOrder().getId(), order.getId())) {
            throw new IllegalStateException("Purchase transaction order does not match Order #" + orderId);
        }

        if (!Objects.equals(purchaseTx.getHousehold().getId(), order.getHousehold().getId())) {
            throw new IllegalStateException("Purchase transaction household does not match Order household for Order #" + orderId);
        }

        if (purchaseTx.getAmount().compareTo(order.getTotalTokens()) != 0) {
            throw new IllegalStateException("Purchase transaction amount (" + purchaseTx.getAmount()
                    + ") does not match Order totalTokens (" + order.getTotalTokens() + ") for Order #" + orderId);
        }

        if (ecoTokenTransactionRepository.findByOrderAndTransactionType(order, TransactionType.ORDER_REFUND).isPresent()) {
            throw new IllegalStateException("Order #" + orderId + " has already been refunded");
        }

        BigDecimal refundAmount = purchaseTx.getAmount();

        // 6. Mutate Order Domain State FIRST
        if (refundReason == RefundReason.DISPUTE_APPROVED) {
            order.approveDispute(resolutionNotes, actor);
        } else {
            order.cancel(cancellationReason, actor);
        }
        orderRepository.save(order);

        // 7. Restock Inventory
        for (OrderItem item : order.getItems()) {
            Product product = lockedProducts.get(item.getProduct().getId());
            product.restock(item.getQuantity());
            productRepository.save(product);
        }

        // 8. Credit Household Token Balance and capture balanceAfter
        household.addTokens(refundAmount);
        householdRepository.save(household);
        BigDecimal balanceAfter = household.getTokenBalance();

        // 9. Persist Immutable ORDER_REFUND Ledger Transaction via Factory
        String auditReason = refundReason == RefundReason.DISPUTE_APPROVED ? resolutionNotes : cancellationReason;
        String description = "Refund for Order #" + order.getId()
                + " (" + refundReason.getDisplayName() + ")"
                + (auditReason != null ? ": " + auditReason : "");

        EcoTokenTransaction refundTx = EcoTokenTransaction.orderRefund(
                household,
                order,
                refundAmount,
                balanceAfter,
                actor,
                description
        );
        ecoTokenTransactionRepository.save(refundTx);
    }
}
