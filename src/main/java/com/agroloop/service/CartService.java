package com.agroloop.service;

import com.agroloop.dto.CartDto;
import jakarta.servlet.http.HttpSession;

/**
 * Service contract for managing transient shopping cart state stored in HTTP sessions.
 */
public interface CartService {

    CartDto getCart(HttpSession session);

    void addToCart(HttpSession session, Long productId, int quantity);

    void updateQuantity(HttpSession session, Long productId, int quantity);

    void removeFromCart(HttpSession session, Long productId);

    void clearCart(HttpSession session);
}
