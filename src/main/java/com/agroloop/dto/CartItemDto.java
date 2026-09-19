package com.agroloop.dto;

import com.agroloop.model.ProductCategory;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Transient DTO representing an item in the user's shopping cart session.
 */
public class CartItemDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long productId;
    private String productName;
    private BigDecimal unitPrice;
    private String unit;
    private ProductCategory category;
    private String farmerName;
    private String imageUrl;
    private int quantity;

    public CartItemDto() {
    }

    public CartItemDto(
            Long productId,
            String productName,
            BigDecimal unitPrice,
            String unit,
            ProductCategory category,
            String farmerName,
            String imageUrl,
            int quantity
    ) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Cart item quantity must be greater than zero");
        }
        this.productId = productId;
        this.productName = productName;
        this.unitPrice = unitPrice != null ? unitPrice.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        this.unit = unit;
        this.category = category;
        this.farmerName = farmerName;
        this.imageUrl = imageUrl;
        this.quantity = quantity;
    }

    public BigDecimal getSubtotal() {
        if (unitPrice == null) {
            return BigDecimal.ZERO;
        }
        return unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public void setCategory(ProductCategory category) {
        this.category = category;
    }

    public String getFarmerName() {
        return farmerName;
    }

    public void setFarmerName(String farmerName) {
        this.farmerName = farmerName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Cart item quantity must be greater than zero");
        }
        this.quantity = quantity;
    }
}
