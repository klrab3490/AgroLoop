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
}
