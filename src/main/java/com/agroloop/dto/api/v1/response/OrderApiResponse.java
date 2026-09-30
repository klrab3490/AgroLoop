package com.agroloop.dto.api.v1.response;

import com.agroloop.model.DisputeResolution;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderApiResponse(
        Long id,
        Long householdId,
        String householdName,
        OrderStatus status,
        BigDecimal totalTokens,
        String deliveryAddress,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime cancelledAt,
        String cancellationReason,
        String disputeReason,
        LocalDateTime disputedAt,
        DisputeResolution resolutionType,
        String resolutionNotes,
        LocalDateTime resolvedAt,
        List<OrderItemApiResponse> items
) {
    public static OrderApiResponse from(Order order) {
        if (order == null) {
            return null;
        }
        Long householdId = null;
        String householdName = null;
        try {
            if (order.getHousehold() != null) {
                householdId = order.getHousehold().getId();
                householdName = order.getHousehold().getName();
            }
        } catch (Exception ignored) {
            // Safe fallback if proxy session is detached
        }

        List<OrderItemApiResponse> items = List.of();
        try {
            if (order.getItems() != null) {
                items = order.getItems().stream().map(OrderItemApiResponse::from).toList();
            }
        } catch (Exception ignored) {
            // Safe fallback if items collection is detached
        }

        return new OrderApiResponse(
                order.getId(),
                householdId,
                householdName,
                order.getStatus(),
                order.getTotalTokens(),
                order.getDeliveryAddress(),
                order.getNotes(),
                order.getCreatedAt(),
                order.getCancelledAt(),
                order.getCancellationReason(),
                order.getDisputeReason(),
                order.getDisputedAt(),
                order.getDisputeResolution(),
                order.getResolutionNotes(),
                order.getResolvedAt(),
                items
        );
    }
}
