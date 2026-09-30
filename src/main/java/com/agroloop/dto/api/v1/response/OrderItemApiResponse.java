package com.agroloop.dto.api.v1.response;

import com.agroloop.model.OrderItem;

import java.math.BigDecimal;

public record OrderItemApiResponse(
        Long id,
        Long productId,
        String productName,
        Long farmerId,
        String farmerName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal
) {
    public static OrderItemApiResponse from(OrderItem item) {
        if (item == null) {
            return null;
        }
        Long productId = null;
        try {
            if (item.getProduct() != null) {
                productId = item.getProduct().getId();
            }
        } catch (Exception ignored) {
            // Safe fallback if proxy session is detached
        }
        return new OrderItemApiResponse(
                item.getId(),
                productId,
                item.getProductName(),
                item.getFarmerId(),
                item.getFarmerName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getSubtotal()
        );
    }
}
