package com.agroloop.model;

import com.agroloop.exception.InsufficientStockException;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Domain entity representing an agricultural or compost product listed by a Farmer
 * in the AgroLoop circular marketplace. Encapsulates inventory stock deduction,
 * restocking, price validations, and soft-archiving status.
 */
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ProductCategory category;

    @Column(nullable = false, length = 50)
    private String unit;

    @Column(name = "price_in_tokens", nullable = false, precision = 19, scale = 2)
    private BigDecimal priceInTokens;

    @Column(nullable = false)
    private int stock;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(nullable = false)
    private boolean active = true;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Product() {
        // Required by JPA.
    }

    public Product(
            Farmer farmer,
            String name,
            String description,
            ProductCategory category,
            String unit,
            BigDecimal priceInTokens,
            int stock,
            String imageUrl
    ) {
        this.farmer = Objects.requireNonNull(farmer, "Farmer cannot be null");
        this.name = validateText(name, "Product name");
        this.description = description != null ? description.trim() : null;
        this.category = Objects.requireNonNull(category, "Product category cannot be null");
        this.unit = validateText(unit, "Product unit");
        this.priceInTokens = validatePrice(priceInTokens);
        this.stock = validateStock(stock);
        this.imageUrl = imageUrl != null ? imageUrl.trim() : null;
        this.active = true;
        this.version = 0L;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- Domain Encapsulation Methods ---

    /**
     * Atomically deducts inventory stock for this product.
     * Enforces non-negative inventory invariants.
     *
     * @param quantity number of units to deduct (> 0)
     * @throws IllegalArgumentException if quantity <= 0
     * @throws InsufficientStockException if requested quantity exceeds available stock
     */
    public void deductStock(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity to deduct must be greater than zero");
        }
        if (this.stock < quantity) {
            throw new InsufficientStockException(this.id, quantity, this.stock);
        }
        this.stock -= quantity;
    }

    /**
     * Adds units to available inventory stock.
     *
     * @param quantity number of units to add (> 0)
     * @throws IllegalArgumentException if quantity <= 0
     */
    public void restock(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity to restock must be greater than zero");
        }
        this.stock += quantity;
    }

    /**
     * Updates listing metadata.
     */
    public void updateDetails(
            String name,
            String description,
            ProductCategory category,
            String unit,
            BigDecimal priceInTokens,
            String imageUrl
    ) {
        this.name = validateText(name, "Product name");
        this.description = description != null ? description.trim() : null;
        this.category = Objects.requireNonNull(category, "Product category cannot be null");
        this.unit = validateText(unit, "Product unit");
        this.priceInTokens = validatePrice(priceInTokens);
        if (imageUrl != null) {
            this.imageUrl = imageUrl.trim();
        }
    }

    /**
     * Soft-archives product to deactivate listing without breaking historical order integrity.
     */
    public void deactivate() {
        this.active = false;
    }

    /**
     * Reactivates product listing.
     */
    public void activate() {
        this.active = true;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl != null ? imageUrl.trim() : null;
    }

    // --- Invariant Validation Helpers ---

    private static String validateText(String text, String fieldName) {
        if (text == null || text.trim().isBlank()) {
            throw new IllegalArgumentException(fieldName + " cannot be blank");
        }
        return text.trim();
    }

    private static BigDecimal validatePrice(BigDecimal price) {
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Product price in tokens must be greater than zero");
        }
        return price.setScale(2, RoundingMode.HALF_UP);
    }

    private static int validateStock(int initialStock) {
        if (initialStock < 0) {
            throw new IllegalArgumentException("Initial product stock cannot be negative");
        }
        return initialStock;
    }

    // --- Getters ---

    public Long getId() {
        return id;
    }

    public Farmer getFarmer() {
        return farmer;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public String getUnit() {
        return unit;
    }

    public BigDecimal getPriceInTokens() {
        return priceInTokens;
    }

    public BigDecimal getPrice() {
        return priceInTokens;
    }

    public int getStock() {
        return stock;
    }

    public int getStockQuantity() {
        return stock;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public boolean isActive() {
        return active;
    }

    public Long getVersion() {
        return version;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
