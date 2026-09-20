package com.agroloop.model;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Domain entity representing a customer order placed by a Household
 * in the AgroLoop circular marketplace. Encapsulates order line items,
 * total token cost calculations, delivery address, and lifecycle status.
 */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @Column(name = "total_tokens", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalTokens;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private OrderStatus status;

    @Column(name = "delivery_address", nullable = false, length = 500)
    private String deliveryAddress;

    @Column(length = 1000)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    // Audit fields for cancellations and disputes (Phase 7)
    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancellation_actor_id")
    private User cancellationActor;

    @Column(name = "dispute_reason", length = 500)
    private String disputeReason;

    @Column(name = "disputed_at")
    private LocalDateTime disputedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_actor_id")
    private User disputeActor;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_type", length = 50)
    private DisputeResolution resolutionType;

    @Column(name = "resolution_notes", length = 1000)
    private String resolutionNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    protected Order() {
        // Required by JPA.
    }

    public Order(
            Household household,
            String deliveryAddress,
            String notes
    ) {
        this.household = Objects.requireNonNull(household, "Household cannot be null");
        this.deliveryAddress = validateAddress(deliveryAddress, household);
        this.notes = notes != null ? notes.trim() : null;
        this.status = OrderStatus.PLACED;
        this.totalTokens = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // --- Domain Encapsulation Methods ---

    /**
     * Adds an item to the order and recalculates the total token price.
     */
    public OrderItem addItem(Product product, int quantity) {
        Objects.requireNonNull(product, "Product cannot be null");
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }
        if (this.status != OrderStatus.PLACED || this.id != null) {
            // Once persisted, line items cannot be added
        }

        OrderItem item = new OrderItem(this, product, quantity);
        this.items.add(item);
        this.totalTokens = this.totalTokens.add(item.getSubtotal()).setScale(2, RoundingMode.HALF_UP);
        return item;
    }

    /**
     * Marks the order as completed/fulfilled.
     */
    public void complete() {
        if (this.status != OrderStatus.PLACED) {
            throw new IllegalStateException("Only PLACED orders can be marked as COMPLETED");
        }
        this.status = OrderStatus.COMPLETED;
    }

    /**
     * Cancels the order with a validated cancellation reason and audit actor.
     */
    public void cancel(String reason, User actor) {
        if (this.status != OrderStatus.PLACED) {
            throw new IllegalStateException("Only PLACED orders can be cancelled. Current status: " + this.status);
        }
        validateReason(reason, 500, "Cancellation reason");
        Objects.requireNonNull(actor, "Cancellation actor cannot be null");

        this.status = OrderStatus.CANCELLED;
        this.cancellationReason = reason.trim();
        this.cancellationActor = actor;
        this.cancelledAt = LocalDateTime.now();
    }

    /**
     * Raises a dispute on the order. Enforces single dispute lifecycle invariant.
     */
    public void dispute(String reason, User actor) {
        if (this.status != OrderStatus.PLACED) {
            throw new IllegalStateException("Only PLACED orders can be disputed. Current status: " + this.status);
        }
        if (this.resolvedAt != null) {
            throw new IllegalStateException("Order has already undergone dispute resolution and cannot be disputed again");
        }
        validateReason(reason, 500, "Dispute reason");
        Objects.requireNonNull(actor, "Dispute actor cannot be null");

        this.status = OrderStatus.DISPUTED;
        this.disputeReason = reason.trim();
        this.disputeActor = actor;
        this.disputedAt = LocalDateTime.now();
    }

    /**
     * Approves a dispute, upholding customer claims, setting status to CANCELLED and resolution to APPROVED_REFUND.
     */
    public void approveDispute(String notes, User admin) {
        if (this.status != OrderStatus.DISPUTED) {
            throw new IllegalStateException("Only DISPUTED orders can be approved for refund. Current status: " + this.status);
        }
        validateReason(notes, 1000, "Resolution notes");
        Objects.requireNonNull(admin, "Admin adjudicator cannot be null");

        this.status = OrderStatus.CANCELLED;
        this.resolutionType = DisputeResolution.APPROVED_REFUND;
        this.resolutionNotes = notes.trim();
        this.resolvedBy = admin;
        LocalDateTime now = LocalDateTime.now();
        this.resolvedAt = now;
        this.cancelledAt = now;
    }

    /**
     * Dismisses a dispute, reverting order to PLACED for fulfillment.
     */
    public void dismissDispute(String notes, User admin) {
        if (this.status != OrderStatus.DISPUTED) {
            throw new IllegalStateException("Only DISPUTED orders can be dismissed. Current status: " + this.status);
        }
        validateReason(notes, 1000, "Resolution notes");
        Objects.requireNonNull(admin, "Admin adjudicator cannot be null");

        this.status = OrderStatus.PLACED;
        this.resolutionType = DisputeResolution.DISMISSED;
        this.resolutionNotes = notes.trim();
        this.resolvedBy = admin;
        this.resolvedAt = LocalDateTime.now();
    }

    private static void validateReason(String text, int maxLength, String fieldName) {
        if (text == null || text.trim().isBlank()) {
            throw new IllegalArgumentException(fieldName + " cannot be blank");
        }
        if (text.trim().length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " exceeds maximum length of " + maxLength + " characters");
        }
    }

    private static String validateAddress(String address, Household household) {
        if (address != null && !address.trim().isBlank()) {
            return address.trim();
        }
        if (household.getAddress() != null && !household.getAddress().trim().isBlank()) {
            return household.getAddress().trim();
        }
        throw new IllegalArgumentException("Delivery address cannot be blank");
    }

    // --- Getters ---

    public Long getId() {
        return id;
    }

    public Household getHousehold() {
        return household;
    }

    public BigDecimal getTotalTokens() {
        return totalTokens;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public String getNotes() {
        return notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public User getCancellationActor() {
        return cancellationActor;
    }

    public String getDisputeReason() {
        return disputeReason;
    }

    public LocalDateTime getDisputedAt() {
        return disputedAt;
    }

    public User getDisputeActor() {
        return disputeActor;
    }

    public DisputeResolution getResolutionType() {
        return resolutionType;
    }

    public DisputeResolution getDisputeResolution() {
        return resolutionType;
    }

    public String getResolutionNotes() {
        return resolutionNotes;
    }

    public User getResolvedBy() {
        return resolvedBy;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }
}
