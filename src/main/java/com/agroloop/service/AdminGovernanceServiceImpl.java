package com.agroloop.service;

import com.agroloop.dto.SolvencyMetricsDto;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.Role;
import com.agroloop.model.TransactionDirection;
import com.agroloop.model.User;
import com.agroloop.model.Product;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.security.TokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class AdminGovernanceServiceImpl implements AdminGovernanceService {

    private static final Logger log = LoggerFactory.getLogger(AdminGovernanceServiceImpl.class);

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final OrderRepository orderRepository;
    private final EcoTokenTransactionRepository ecoTokenTransactionRepository;
    private final ProductRepository productRepository;
    private final MarketplaceService marketplaceService;
    private final TokenService tokenService;

    public AdminGovernanceServiceImpl(
            UserRepository userRepository,
            HouseholdRepository householdRepository,
            OrderRepository orderRepository,
            EcoTokenTransactionRepository ecoTokenTransactionRepository,
            ProductRepository productRepository,
            MarketplaceService marketplaceService,
            TokenService tokenService
    ) {
        this.userRepository = Objects.requireNonNull(userRepository, "UserRepository cannot be null");
        this.householdRepository = Objects.requireNonNull(householdRepository, "HouseholdRepository cannot be null");
        this.orderRepository = Objects.requireNonNull(orderRepository, "OrderRepository cannot be null");
        this.ecoTokenTransactionRepository = Objects.requireNonNull(ecoTokenTransactionRepository, "EcoTokenTransactionRepository cannot be null");
        this.productRepository = Objects.requireNonNull(productRepository, "ProductRepository cannot be null");
        this.marketplaceService = Objects.requireNonNull(marketplaceService, "MarketplaceService cannot be null");
        this.tokenService = Objects.requireNonNull(tokenService, "TokenService cannot be null");
    }

    @Override
    @Transactional
    public void enableUser(Long userId, String adminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        user.enable();
        userRepository.save(user);
        log.info("User {} ({}) enabled by admin {}", user.getName(), user.getEmail(), adminEmail);
    }

    @Override
    @Transactional
    public void disableUser(Long userId, String adminEmail) {
        User callerAdmin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found with email: " + adminEmail));

        // 1. Self-disable guard: an administrator cannot disable themselves
        if (Objects.equals(callerAdmin.getId(), userId)) {
            throw new IllegalArgumentException("Administrators cannot disable their own account");
        }

        // 2. Concurrency-safe active admin serialization:
        //    Lock all active administrators in deterministic ascending ID order
        List<User> activeAdmins = userRepository.findActiveUsersByRoleForUpdate(Role.ROLE_ADMIN);

        // 3. Re-read target user under active admin locks
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        if (!targetUser.isEnabled()) {
            log.info("User {} ({}) is already disabled", targetUser.getName(), targetUser.getEmail());
            return;
        }

        // 4. Last-admin guard
        if (targetUser.getRole() == Role.ROLE_ADMIN) {
            if (activeAdmins.size() <= 1) {
                throw new IllegalStateException("Cannot disable the last active administrator");
            }
        }

        targetUser.disable();
        userRepository.save(targetUser);
        log.info("User {} ({}) disabled by admin {}", targetUser.getName(), targetUser.getEmail(), adminEmail);

        // 5. Invalidate and revoke all active auth sessions & refresh tokens
        tokenService.revokeAllUserSessions(userId);

        // 6. If target user is a Farmer, unpublish products and cancel pending placed orders
        if (targetUser.getRole() == Role.ROLE_FARMER) {
            // A. Deactivate all active products belonging to this farmer
            List<Product> activeProducts = productRepository.findByFarmerIdAndActiveTrue(userId);
            for (Product product : activeProducts) {
                product.deactivate();
                productRepository.save(product);
            }
            log.info("Deactivated {} products for disabled farmer id={}", activeProducts.size(), userId);

            // B. Cancel existing PLACED orders for this farmer and refund tokens to buyers
            List<Order> placedOrders = orderRepository.findOrdersForFarmerId(userId).stream()
                    .filter(o -> o.getStatus() == OrderStatus.PLACED)
                    .toList();
            for (Order order : placedOrders) {
                if (ecoTokenTransactionRepository.findByOrderAndTransactionType(order, com.agroloop.model.TransactionType.MARKETPLACE_PURCHASE).isPresent()) {
                    marketplaceService.adminCancelOrder(
                            order.getId(),
                            adminEmail,
                            "Supplier account disabled by administration"
                    );
                    log.info("Auto-cancelled Order #{} for disabled supplier id={}", order.getId(), userId);
                } else {
                    order.cancel("Supplier account disabled by administration", callerAdmin);
                    orderRepository.save(order);
                    log.info("Cancelled Order #{} without purchase ledger for disabled supplier id={}", order.getId(), userId);
                }
            }
        }
    }

    @Override
    @Transactional
    public void adjustTokens(Long householdId, BigDecimal amount, TransactionDirection direction, String reason, String adminEmail) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Adjustment amount must be strictly greater than zero");
        }
        if (reason == null || reason.trim().isBlank()) {
            throw new IllegalArgumentException("Adjustment reason cannot be blank");
        }
        Objects.requireNonNull(direction, "Transaction direction cannot be null");

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found with email: " + adminEmail));

        // Acquire exclusive lock on Household
        Household household = householdRepository.findByIdForUpdate(householdId)
                .orElseThrow(() -> new IllegalArgumentException("Household not found with ID: " + householdId));

        if (direction == TransactionDirection.DEBIT) {
            if (household.getTokenBalance().compareTo(amount) < 0) {
                throw new IllegalStateException("Household has insufficient token balance for debit adjustment");
            }
            household.spendTokens(amount);
        } else if (direction == TransactionDirection.CREDIT) {
            household.addTokens(amount);
        }
        householdRepository.save(household);

        BigDecimal balanceAfter = household.getTokenBalance();

        EcoTokenTransaction tx = EcoTokenTransaction.adminAdjustment(
                household,
                amount,
                direction,
                balanceAfter,
                admin,
                reason.trim()
        );
        ecoTokenTransactionRepository.save(tx);
        log.info("Admin {} adjusted tokens for household {}: direction={}, amount={}, newBalance={}",
                adminEmail, household.getId(), direction, amount, balanceAfter);
    }

    @Override
    public SolvencyMetricsDto getPlatformSolvencyMetrics() {
        BigDecimal totalBalances = ecoTokenTransactionRepository.sumAllHouseholdBalances();
        BigDecimal totalCredits = ecoTokenTransactionRepository.sumAmountByDirection(TransactionDirection.CREDIT);
        BigDecimal totalDebits = ecoTokenTransactionRepository.sumAmountByDirection(TransactionDirection.DEBIT);

        return new SolvencyMetricsDto(totalBalances, totalCredits, totalDebits);
    }

    @Override
    public List<Order> getAllOrders(OrderStatus statusFilter) {
        if (statusFilter != null) {
            return orderRepository.findByStatusOrderByCreatedAtDesc(statusFilter);
        }
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    public List<Order> getRecentOrders(int limit) {
        int boundedLimit = Math.max(1, Math.min(limit, 100));
        return orderRepository.findAll(PageRequest.of(0, boundedLimit, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
    }

    @Override
    public List<Order> getDisputedOrders() {
        return orderRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.DISPUTED);
    }

    @Override
    public Page<EcoTokenTransaction> getPlatformLedger(Pageable pageable) {
        return ecoTokenTransactionRepository.findAllPlatformTransactions(pageable);
    }

    @Override
    public List<User> getAllUsers() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }
}
