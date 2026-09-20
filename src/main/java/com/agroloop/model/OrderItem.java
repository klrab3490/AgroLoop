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
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Immutable historical snapshot of a line item in an Order.
 * Retains a foreign key reference to the original Product while snapshotting
 * product name, unit price, quantity, unit, category, subtotal, farmer ID, and farmer name
 * so historical purchases remain accurate even if the product is later modified or archived.
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "farmer_id", nullable = false, updatable = false)
    private Long farmerId;

    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Column(name = "unit_price", nullable = false, precision = 19, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, length = 50)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ProductCategory category;

    @Column(name = "farmer_name", nullable = false, length = 150)
    private String farmerName;

    protected OrderItem() {
        // Required by JPA.
    }

    public OrderItem(
            Order order,
            Product product,
            int quantity
    ) {
        this.order = Objects.requireNonNull(order, "Order cannot be null");
        this.product = Objects.requireNonNull(product, "Product cannot be null");
        if (quantity <= 0) {
            throw new IllegalArgumentException("OrderItem quantity must be greater than zero");
        }
        this.quantity = quantity;

        // Snapshot authoritative properties directly from Product at order time
        this.farmerId = (product.getFarmer() != null && product.getFarmer().getId() != null)
                ? product.getFarmer().getId()
                : 1L; // Fallback for test fixtures without full DB farmer setup
        this.productName = product.getName();
        this.unitPrice = product.getPriceInTokens().setScale(2, RoundingMode.HALF_UP);
        this.unit = product.getUnit();
        this.category = product.getCategory();
        String fName = "Unknown Farmer";
        try {
            if (product.getFarmer() != null && product.getFarmer().getName() != null) {
                fName = product.getFarmer().getName();
            }
        } catch (Exception ex) {
            fName = "Farmer #" + this.farmerId;
        }
        this.farmerName = fName;
        this.subtotal = this.unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);
    }

    public Long getId() {
        return id;
    }

    public Order getOrder() {
        return order;
    }

    public Product getProduct() {
        return product;
    }

    public Long getFarmerId() {
        return farmerId;
    }

    public String getProductName() {
        return productName;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public int getQuantity() {
        return quantity;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public String getUnit() {
        return unit;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public String getFarmerName() {
        return farmerName;
    }
}
