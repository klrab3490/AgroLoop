package com.agroloop.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Transient DTO representing the household's active shopping cart session.
 */
public class CartDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<CartItemDto> items = new ArrayList<>();

    public CartDto() {
    }

    public CartDto(List<CartItemDto> items) {
        if (items != null) {
            this.items = new ArrayList<>(items);
        }
    }

    public List<CartItemDto> getItems() {
        return Collections.unmodifiableList(items);
    }

    public void setItems(List<CartItemDto> items) {
        this.items = items != null ? new ArrayList<>(items) : new ArrayList<>();
    }

    public int getTotalQuantity() {
        return items.stream()
                .mapToInt(CartItemDto::getQuantity)
                .sum();
    }

    public BigDecimal getTotalTokens() {
        return items.stream()
                .map(CartItemDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public boolean isEmpty() {
        return items == null || items.isEmpty();
    }
}
