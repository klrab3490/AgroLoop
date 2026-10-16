package com.agroloop.controller.api.v1;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.dto.api.v1.request.CancelOrderApiRequest;
import com.agroloop.dto.api.v1.request.CreateOrderApiRequest;
import com.agroloop.dto.api.v1.request.DisputeOrderApiRequest;
import com.agroloop.dto.api.v1.request.OrderItemRequest;
import com.agroloop.dto.api.v1.response.OrderApiResponse;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.Order;
import com.agroloop.model.Product;
import com.agroloop.model.User;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.security.authorization.OrderSecurityEvaluator;
import com.agroloop.security.idempotency.IdempotencyScope;
import com.agroloop.security.idempotency.IdempotencyService;
import com.agroloop.service.MarketplaceService;
import com.agroloop.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@Transactional(readOnly = true)
public class OrderApiController {

    private final MarketplaceService marketplaceService;
    private final ProductService productService;
    private final OrderRepository orderRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final IdempotencyService idempotencyService;
    private final OrderSecurityEvaluator orderSecurityEvaluator;

    public OrderApiController(
            MarketplaceService marketplaceService,
            ProductService productService,
            OrderRepository orderRepository,
            HouseholdRepository householdRepository,
            UserRepository userRepository,
            IdempotencyService idempotencyService,
            OrderSecurityEvaluator orderSecurityEvaluator
    ) {
        this.marketplaceService = marketplaceService;
        this.productService = productService;
        this.orderRepository = orderRepository;
        this.householdRepository = householdRepository;
        this.userRepository = userRepository;
        this.idempotencyService = idempotencyService;
        this.orderSecurityEvaluator = orderSecurityEvaluator;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrderApiResponse>> listOrders(Authentication auth) {
        String email = getEmail(auth);
        List<Order> orders;
        if (hasRole(auth, "ROLE_ADMIN")) {
            orders = orderRepository.findAllByOrderByCreatedAtDesc();
        } else {
            orders = householdRepository.findByEmail(email)
                    .map(orderRepository::findByHouseholdOrderByCreatedAtDesc)
                    .orElse(Collections.emptyList());
        }
        return ResponseEntity.ok(orders.stream().map(OrderApiResponse::from).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@orderAuth.canAccessOrder(authentication, #id)")
    public ResponseEntity<OrderApiResponse> getOrder(@PathVariable Long id, Authentication auth) {
        String email = getEmail(auth);
        Order order;
        if (hasRole(auth, "ROLE_ADMIN")) {
            order = orderRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
        } else {
            order = marketplaceService.getOrderById(id, email);
        }
        return ResponseEntity.ok(OrderApiResponse.from(order));
    }

    @PostMapping
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_HOUSEHOLD')")
    public ResponseEntity<OrderApiResponse> createOrder(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateOrderApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for creating an order");
        }

        Long userId = getUserId(auth);
        String email = getEmail(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(userId);

        OrderApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/orders",
                request,
                OrderApiResponse.class,
                () -> {
                    List<CartItemDto> cartItems = new ArrayList<>();
                    for (OrderItemRequest itemReq : request.items()) {
                        Product product = productService.getProductById(itemReq.productId());
                        String farmerName = (product.getFarmer() != null)
                                ? product.getFarmer().getFullName() : "Unknown Farmer";
                        CartItemDto cartItem = new CartItemDto(
                                product.getId(),
                                product.getName(),
                                product.getPriceInTokens(),
                                product.getUnit(),
                                product.getCategory(),
                                farmerName,
                                product.getImageUrl(),
                                itemReq.quantity()
                        );
                        cartItems.add(cartItem);
                    }

                    CartDto cart = new CartDto(cartItems);
                    CheckoutRequest checkoutReq = new CheckoutRequest(request.deliveryAddress(), request.notes());
                    Order createdOrder = marketplaceService.checkout(email, cart, checkoutReq);
                    return OrderApiResponse.from(createdOrder);
                }
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/cancel")
    @Transactional
    @PreAuthorize("@orderAuth.canCancelOrder(authentication, #id)")
    public ResponseEntity<OrderApiResponse> cancelOrder(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CancelOrderApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for cancelling an order");
        }

        Long userId = getUserId(auth);
        String email = getEmail(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(userId);

        OrderApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/orders/" + id + "/cancel",
                request,
                OrderApiResponse.class,
                () -> {
                    marketplaceService.cancelOrder(id, email, request.reason());
                    Order updated = marketplaceService.getOrderById(id, email);
                    return OrderApiResponse.from(updated);
                }
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/dispute")
    @Transactional
    public ResponseEntity<OrderApiResponse> disputeOrder(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody DisputeOrderApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for disputing an order");
        }

        boolean isHousehold = orderSecurityEvaluator.canDisputeAsHousehold(auth, id);
        boolean isFarmer = orderSecurityEvaluator.canDisputeAsFarmer(auth, id);

        if (!isHousehold && !isFarmer) {
            throw new AccessDeniedException("User is not authorized to dispute this order");
        }

        Long userId = getUserId(auth);
        String email = getEmail(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(userId);

        OrderApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/orders/" + id + "/dispute",
                request,
                OrderApiResponse.class,
                () -> {
                    if (isHousehold) {
                        marketplaceService.disputeOrderAsHousehold(id, email, request.disputeReason());
                    } else {
                        marketplaceService.disputeOrderAsFarmer(id, email, request.disputeReason());
                    }
                    Order updated = orderRepository.findById(id)
                            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
                    return OrderApiResponse.from(updated);
                }
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/complete")
    @Transactional
    public ResponseEntity<OrderApiResponse> completeOrder(
            @PathVariable Long id,
            Authentication auth
    ) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));

        boolean isAdmin = hasRole(auth, "ROLE_ADMIN");
        Long userId = getUserId(auth);
        boolean isFarmer = order.getItems().stream()
                .anyMatch(item -> java.util.Objects.equals(item.getFarmerId(), userId));

        if (!isAdmin && !isFarmer) {
            throw new AccessDeniedException("Only participating farmers or administrators can mark this order as completed");
        }

        if (order.getStatus() == com.agroloop.model.OrderStatus.COMPLETED) {
            return ResponseEntity.ok(OrderApiResponse.from(order));
        }

        order.complete();
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(OrderApiResponse.from(saved));
    }

    public record UpdateOrderStatusApiRequest(String status) {}

    @PostMapping("/{id}/status")
    @Transactional
    public ResponseEntity<OrderApiResponse> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody UpdateOrderStatusApiRequest request,
            Authentication auth
    ) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));

        boolean isAdmin = hasRole(auth, "ROLE_ADMIN");
        Long userId = getUserId(auth);
        boolean isFarmer = order.getItems().stream()
                .anyMatch(item -> java.util.Objects.equals(item.getFarmerId(), userId));

        if (!isAdmin && !isFarmer) {
            throw new AccessDeniedException("Only participating farmers or administrators can update order status");
        }

        if (request == null || request.status() == null || request.status().isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }

        String target = request.status().toUpperCase().trim();
        switch (target) {
            case "PACKED" -> order.pack();
            case "IN_TRANSIT" -> order.dispatch();
            case "COMPLETED", "DELIVERED" -> order.complete();
            default -> throw new IllegalArgumentException("Unsupported target status: " + target);
        }

        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(OrderApiResponse.from(saved));
    }


    private Long getUserId(Authentication auth) {
        if (auth == null) {
            throw new AccessDeniedException("Unauthenticated user");
        }
        Long id = orderSecurityEvaluator.extractUserId(auth);
        if (id == null) {
            throw new AccessDeniedException("Unauthenticated user");
        }
        return id;
    }

    private String getEmail(Authentication auth) {
        if (auth == null) {
            return null;
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null) return email;
        }
        Long userId = orderSecurityEvaluator.extractUserId(auth);
        if (userId != null) {
            return userRepository.findById(userId).map(User::getEmail).orElse(auth.getName());
        }
        return auth.getName();
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        String normalizedRole = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(role) || a.getAuthority().equals(normalizedRole));
    }
}
