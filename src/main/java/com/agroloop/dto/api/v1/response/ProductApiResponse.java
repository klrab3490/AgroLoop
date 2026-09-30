package com.agroloop.dto.api.v1.response;

import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;

import java.math.BigDecimal;

public record ProductApiResponse(
        Long id,
        String name,
        String description,
        ProductCategory category,
        BigDecimal price,
        Integer stock,
        String unit,
        boolean active,
        Long farmerId,
        String farmerName,
        String mediaId,
        String imageUrl
) {
    public static ProductApiResponse from(Product product) {
        if (product == null) {
            return null;
        }
        Long farmerId = null;
        String farmerName = null;
        try {
            if (product.getFarmer() != null) {
                farmerId = product.getFarmer().getId();
                farmerName = product.getFarmer().getFullName();
            }
        } catch (Exception ignored) {
            // Safe fallback if proxy session is detached
        }
        return new ProductApiResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory(),
                product.getPriceInTokens(),
                product.getStockQuantity(),
                product.getUnit(),
                product.isActive(),
                farmerId,
                farmerName,
                null,
                product.getImageUrl()
        );
    }
}
