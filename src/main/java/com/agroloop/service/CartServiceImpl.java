package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.model.Product;
import com.agroloop.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class CartServiceImpl implements CartService {

    public static final String CART_SESSION_KEY = "ECO_CART";

    private final ProductRepository productRepository;

    public CartServiceImpl(ProductRepository productRepository) {
        this.productRepository = Objects.requireNonNull(productRepository, "ProductRepository cannot be null");
    }

    @Override
    public CartDto getCart(HttpSession session) {
        Objects.requireNonNull(session, "HttpSession cannot be null");
        CartDto cart = (CartDto) session.getAttribute(CART_SESSION_KEY);
        if (cart == null) {
            cart = new CartDto(new ArrayList<>());
            session.setAttribute(CART_SESSION_KEY, cart);
        }
        return cart;
    }

    @Override
    public void addToCart(HttpSession session, Long productId, int quantity) {
        Objects.requireNonNull(session, "HttpSession cannot be null");
        Objects.requireNonNull(productId, "Product ID cannot be null");
        if (quantity <= 0) {
            throw new IllegalArgumentException("Cart quantity must be greater than zero");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + productId));

        if (!product.isActive()) {
            throw new IllegalArgumentException("Cannot add inactive product to cart");
        }

        CartDto cart = getCart(session);
        List<CartItemDto> items = new ArrayList<>(cart.getItems());

        Optional<CartItemDto> existingItemOpt = items.stream()
                .filter(item -> Objects.equals(item.getProductId(), productId))
                .findFirst();

        if (existingItemOpt.isPresent()) {
            CartItemDto existing = existingItemOpt.get();
            existing.setQuantity(existing.getQuantity() + quantity);
        } else {
            String farmerName = product.getFarmer() != null && product.getFarmer().getName() != null
                    ? product.getFarmer().getName()
                    : "Unknown Farmer";

            CartItemDto newItem = new CartItemDto(
                    product.getId(),
                    product.getName(),
                    product.getPriceInTokens(),
                    product.getUnit(),
                    product.getCategory(),
                    farmerName,
                    product.getImageUrl(),
                    quantity
            );
            items.add(newItem);
        }

        cart.setItems(items);
        session.setAttribute(CART_SESSION_KEY, cart);
    }

    @Override
    public void updateQuantity(HttpSession session, Long productId, int quantity) {
        Objects.requireNonNull(session, "HttpSession cannot be null");
        Objects.requireNonNull(productId, "Product ID cannot be null");

        CartDto cart = getCart(session);
        List<CartItemDto> items = new ArrayList<>(cart.getItems());

        if (quantity <= 0) {
            items.removeIf(item -> Objects.equals(item.getProductId(), productId));
        } else {
            items.stream()
                    .filter(item -> Objects.equals(item.getProductId(), productId))
                    .findFirst()
                    .ifPresent(item -> item.setQuantity(quantity));
        }

        cart.setItems(items);
        session.setAttribute(CART_SESSION_KEY, cart);
    }

    @Override
    public void removeFromCart(HttpSession session, Long productId) {
        updateQuantity(session, productId, 0);
    }

    @Override
    public void clearCart(HttpSession session) {
        Objects.requireNonNull(session, "HttpSession cannot be null");
        session.removeAttribute(CART_SESSION_KEY);
    }
}
