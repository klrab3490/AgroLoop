package com.agroloop.dto;

import com.agroloop.model.ProductCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

/**
 * Form backing DTO for creating and updating farmer produce listings.
 */
public class ProductFormRequest {

    @NotBlank(message = "Product name is required")
    @Size(max = 150, message = "Product name cannot exceed 150 characters")
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @NotNull(message = "Product category is required")
    private ProductCategory category;

    @NotBlank(message = "Unit is required (e.g., kg, bundle, bag)")
    @Size(max = 50, message = "Unit cannot exceed 50 characters")
    private String unit;

    @NotNull(message = "Price in EcoTokens is required")
    @DecimalMin(value = "0.01", message = "Price must be at least 0.01 EcoTokens")
    private BigDecimal priceInTokens;

    @NotNull(message = "Stock quantity is required")
    @Min(value = 0, message = "Stock quantity cannot be negative")
    private Integer stock;

    private MultipartFile image;

    public ProductFormRequest() {
    }

    public ProductFormRequest(
            String name,
            String description,
            ProductCategory category,
            String unit,
            BigDecimal priceInTokens,
            Integer stock
    ) {
        this.name = name;
        this.description = description;
        this.category = category;
        this.unit = unit;
        this.priceInTokens = priceInTokens;
        this.stock = stock;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public void setCategory(ProductCategory category) {
        this.category = category;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getPriceInTokens() {
        return priceInTokens;
    }

    public void setPriceInTokens(BigDecimal priceInTokens) {
        this.priceInTokens = priceInTokens;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public MultipartFile getImage() {
        return image;
    }

    public void setImage(MultipartFile image) {
        this.image = image;
    }
}
