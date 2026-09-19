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
 * (for REWARD_MINTED credits) or an order (for MARKETPLACE_PURCHASE debits).
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

    @Column(name = "balance_after", nullable = false, precision = 19, scale = 2)
    private BigDecimal balanceAfter;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected EcoTokenTransaction() {
        // Required by JPA.
    }

    /**
     * Constructor for REWARD_MINTED credit transactions originating from verified waste collections.
     */
    public EcoTokenTransaction(
            Household household,
            WasteVerification wasteVerification,
            BigDecimal amount,
            TransactionType transactionType,
            BigDecimal balanceAfter,
            String description
    ) {
        this.household = Objects.requireNonNull(household, "Household cannot be null");
        this.wasteVerification = Objects.requireNonNull(wasteVerification, "Waste verification cannot be null");
        this.order = null;
        this.transactionType = Objects.requireNonNull(transactionType, "Transaction type cannot be null");
        validateHouseholdOwnership(household, wasteVerification);
        validateMatrix(this.transactionType, this.wasteVerification, this.order);
        this.amount = validateAmount(amount);
        this.balanceAfter = validateBalanceAfter(balanceAfter);
        this.description = description != null ? description.trim() : null;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * Constructor for MARKETPLACE_PURCHASE debit transactions originating from marketplace orders.
     */
    public EcoTokenTransaction(
            Household household,
            Order order,
            BigDecimal amount,
            TransactionType transactionType,
            BigDecimal balanceAfter,
            String description
    ) {
        this.household = Objects.requireNonNull(household, "Household cannot be null");
        this.order = Objects.requireNonNull(order, "Order cannot be null");
        this.wasteVerification = null;
        this.transactionType = Objects.requireNonNull(transactionType, "Transaction type cannot be null");
        validateHouseholdOwnership(household, order);
        validateMatrix(this.transactionType, this.wasteVerification, this.order);
        this.amount = validateAmount(amount);
        this.balanceAfter = validateBalanceAfter(balanceAfter);
        this.description = description != null ? description.trim() : null;
        this.createdAt = LocalDateTime.now();
    }

    private static void validateMatrix(TransactionType type, WasteVerification wv, Order ord) {
        if (type == TransactionType.REWARD_MINTED) {
            if (wv == null || ord != null) {
                throw new IllegalArgumentException("REWARD_MINTED requires wasteVerification and must not have an order");
            }
        } else if (type == TransactionType.MARKETPLACE_PURCHASE) {
            if (ord == null || wv != null) {
                throw new IllegalArgumentException("MARKETPLACE_PURCHASE requires order and must not have a wasteVerification");
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

    // --- Validation Invariants ---

    private static BigDecimal validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Transaction amount cannot be null");
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
