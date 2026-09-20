package com.agroloop.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Immutable ledger entry recording an EcoToken credit or debit event.
 * Strictly linked to the contributing household, and either to a verified waste collection
 * (for REWARD_MINTED credits), an order (for MARKETPLACE_PURCHASE debits / ORDER_REFUND credits),
 * or an administrative balance adjustment (for ADMIN_ADJUSTMENT).
 * Instantiation is restricted to static factory methods.
 */
@Entity
@Table(name = "ecotoken_transactions")
public class EcoTokenTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "waste_verification_id", unique = true)
    private WasteVerification wasteVerification;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 50)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false, length = 20)
    private TransactionDirection direction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(name = "balance_after", nullable = false, precision = 19, scale = 2)
    private BigDecimal balanceAfter;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected EcoTokenTransaction() {
        // Required by JPA.
    }

    private EcoTokenTransaction(
            Household household,
            WasteVerification wasteVerification,
            Order order,
            BigDecimal amount,
            TransactionType transactionType,
            TransactionDirection direction,
            User actor,
            BigDecimal balanceAfter,
            String description
    ) {
        this.household = Objects.requireNonNull(household, "Household cannot be null");
        this.wasteVerification = wasteVerification;
        this.order = order;
        this.transactionType = Objects.requireNonNull(transactionType, "Transaction type cannot be null");
        this.direction = Objects.requireNonNull(direction, "Transaction direction cannot be null");
        this.actor = actor;
        this.amount = validateAmount(amount, this.transactionType);
        this.balanceAfter = validateBalanceAfter(balanceAfter);
        this.description = description != null ? description.trim() : null;
        this.createdAt = LocalDateTime.now();

        validateMatrix(this.transactionType, this.direction, this.wasteVerification, this.order, this.actor);
        if (this.wasteVerification != null) {
            validateHouseholdOwnership(household, this.wasteVerification);
        }
        if (this.order != null) {
            validateHouseholdOwnership(household, this.order);
        }
    }

    // --- Static Factory Methods ---

    /**
     * Creates an immutable REWARD_MINTED credit transaction.
     * Actor is optional (null for automated background minting).
     */
    public static EcoTokenTransaction rewardMinted(
            Household household,
            WasteVerification verification,
            BigDecimal amount,
            BigDecimal balanceAfter,
            User actor
    ) {
        Objects.requireNonNull(verification, "Waste verification cannot be null");
        if (amount == null) {
            throw new IllegalArgumentException("Transaction amount cannot be null");
        }
        String categoryName = (verification.getPickupRequest() != null
                && verification.getPickupRequest().getWasteSubmission() != null
                && verification.getPickupRequest().getWasteSubmission().getCategory() != null)
                ? verification.getPickupRequest().getWasteSubmission().getCategory().getDisplayName()
                : "Organic Waste";

        String description;
        if (verification.getQualityGrade() == QualityGrade.REJECTED
                || !verification.isAcceptable()
                || amount.compareTo(BigDecimal.ZERO) <= 0) {
            description = "Waste rejected during verification — 0 tokens minted";
        } else {
            description = String.format("Verified waste reward: %s kg (%s) - Category: %s",
                    verification.getVerifiedWeight(),
                    verification.getQualityGrade().getDisplayName(),
                    categoryName);
        }

        return new EcoTokenTransaction(
                household,
                verification,
                null,
                amount,
                TransactionType.REWARD_MINTED,
                TransactionDirection.CREDIT,
                actor,
                balanceAfter,
                description
        );
    }

    /**
     * Creates an immutable MARKETPLACE_PURCHASE debit transaction.
     * Actor is mandatory (the purchasing household user).
     */
    public static EcoTokenTransaction marketplacePurchase(
            Household household,
            Order order,
            BigDecimal amount,
            BigDecimal balanceAfter,
            User actor
    ) {
        Objects.requireNonNull(order, "Order cannot be null");
        Objects.requireNonNull(actor, "Purchasing actor cannot be null");
        String description = "Marketplace purchase for Order #" + order.getId();
        return new EcoTokenTransaction(
                household,
                null,
                order,
                amount,
                TransactionType.MARKETPLACE_PURCHASE,
                TransactionDirection.DEBIT,
                actor,
                balanceAfter,
                description
        );
    }

    /**
     * Creates an immutable ORDER_REFUND credit transaction.
     * Actor is mandatory (initiating household user or administrator).
     */
    public static EcoTokenTransaction orderRefund(
            Household household,
            Order order,
            BigDecimal amount,
            BigDecimal balanceAfter,
            User actor,
            String description
    ) {
        Objects.requireNonNull(order, "Order cannot be null");
        Objects.requireNonNull(actor, "Refund actor cannot be null");
        return new EcoTokenTransaction(
                household,
                null,
                order,
                amount,
                TransactionType.ORDER_REFUND,
                TransactionDirection.CREDIT,
                actor,
                balanceAfter,
                description != null ? description : "Refund for Order #" + order.getId()
        );
    }

    /**
     * Creates an immutable ADMIN_ADJUSTMENT ledger transaction.
     * Admin actor is strictly mandatory.
     */
    public static EcoTokenTransaction adminAdjustment(
            Household household,
            BigDecimal amount,
            TransactionDirection direction,
            BigDecimal balanceAfter,
            User admin,
            String description
    ) {
        Objects.requireNonNull(admin, "Admin actor cannot be null for administrative adjustment");
        Objects.requireNonNull(direction, "Transaction direction cannot be null");
        return new EcoTokenTransaction(
                household,
                null,
                null,
                amount,
                TransactionType.ADMIN_ADJUSTMENT,
                direction,
                admin,
                balanceAfter,
                description
        );
    }

    // --- Invariant Validations ---

    private static void validateMatrix(
            TransactionType type,
            TransactionDirection direction,
            WasteVerification wv,
            Order ord,
            User actor
    ) {
        if (type == TransactionType.REWARD_MINTED) {
            if (wv == null || ord != null || direction != TransactionDirection.CREDIT) {
                throw new IllegalArgumentException("REWARD_MINTED requires wasteVerification, CREDIT direction, and no order");
            }
        } else if (type == TransactionType.MARKETPLACE_PURCHASE) {
            if (ord == null || wv != null || direction != TransactionDirection.DEBIT) {
                throw new IllegalArgumentException("MARKETPLACE_PURCHASE requires order, DEBIT direction, and no wasteVerification");
            }
            if (actor == null) {
                throw new IllegalArgumentException("MARKETPLACE_PURCHASE requires non-null actor");
            }
        } else if (type == TransactionType.ORDER_REFUND) {
            if (ord == null || wv != null || direction != TransactionDirection.CREDIT) {
                throw new IllegalArgumentException("ORDER_REFUND requires order, CREDIT direction, and no wasteVerification");
            }
            if (actor == null) {
                throw new IllegalArgumentException("ORDER_REFUND requires non-null actor");
            }
        } else if (type == TransactionType.ADMIN_ADJUSTMENT) {
            if (ord != null || wv != null) {
                throw new IllegalArgumentException("ADMIN_ADJUSTMENT must not be linked to order or wasteVerification");
            }
            if (actor == null) {
                throw new IllegalArgumentException("ADMIN_ADJUSTMENT requires non-null admin actor");
            }
        }
    }

    private static void validateHouseholdOwnership(Household household, WasteVerification wasteVerification) {
        if (wasteVerification.getPickupRequest() != null
                && wasteVerification.getPickupRequest().getWasteSubmission() != null
                && wasteVerification.getPickupRequest().getWasteSubmission().getHousehold() != null) {
            Household owner = wasteVerification.getPickupRequest().getWasteSubmission().getHousehold();
            if (household.getId() != null && owner.getId() != null && !Objects.equals(household.getId(), owner.getId())) {
                throw new IllegalArgumentException("Transaction household does not match waste verification owner");
            }
        }
    }

    private static void validateHouseholdOwnership(Household household, Order order) {
        if (order.getHousehold() != null) {
            Household owner = order.getHousehold();
            if (household.getId() != null && owner.getId() != null && !Objects.equals(household.getId(), owner.getId())) {
                throw new IllegalArgumentException("Transaction household does not match order owner");
            }
        }
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    private static BigDecimal validateAmount(BigDecimal amount, TransactionType type) {
        if (amount == null) {
            throw new IllegalArgumentException("Transaction amount cannot be null");
        }
        if (type == TransactionType.REWARD_MINTED) {
            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Transaction amount cannot be negative");
            }
        } else {
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Transaction amount must be strictly greater than zero");
            }
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal validateBalanceAfter(BigDecimal balanceAfter) {
        if (balanceAfter == null || balanceAfter.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Balance after transaction must be non-negative");
        }
        return balanceAfter.setScale(2, RoundingMode.HALF_UP);
    }

    // --- Getters (Immutable - No Setters) ---

    public Long getId() {
        return id;
    }

    public Household getHousehold() {
        return household;
    }

    public WasteVerification getWasteVerification() {
        return wasteVerification;
    }

    public Order getOrder() {
        return order;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public TransactionType getTransactionType() {
        return transactionType;
    }

    public TransactionDirection getDirection() {
        return direction;
    }

    public User getActor() {
        return actor;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public String getDescription() {
        return description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
