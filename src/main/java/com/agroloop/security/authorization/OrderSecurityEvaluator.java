package com.agroloop.security.authorization;

import com.agroloop.model.Order;
import com.agroloop.model.User;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

@Component("orderAuth")
public class OrderSecurityEvaluator {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public OrderSecurityEvaluator(OrderRepository orderRepository, UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public boolean canAccessOrder(Authentication auth, Long orderId) {
        if (auth == null || orderId == null) {
            return false;
        }
        if (isAdmin(auth)) {
            return true;
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return false;
        }
        Order order = orderOpt.get();
        Long userId = extractUserId(auth);
        if (userId == null) {
            return false;
        }

        // Household owner check
        if (order.getHousehold() != null && Objects.equals(order.getHousehold().getId(), userId)) {
            return true;
        }

        // Participating farmer check
        return order.getItems().stream()
                .anyMatch(item -> Objects.equals(item.getFarmerId(), userId));
    }

    @Transactional(readOnly = true)
    public boolean canCancelAsHousehold(Authentication auth, Long orderId) {
        if (auth == null || orderId == null) {
            return false;
        }
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return false;
        }
        Long userId = extractUserId(auth);
        return userId != null && Objects.equals(orderOpt.get().getHousehold().getId(), userId);
    }

    @Transactional(readOnly = true)
    public boolean canCancelAsFarmer(Authentication auth, Long orderId) {
        if (auth == null || orderId == null) {
            return false;
        }
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return false;
        }
        Long userId = extractUserId(auth);
        if (userId == null) {
            return false;
        }
        return orderOpt.get().getItems().stream()
                .anyMatch(item -> Objects.equals(item.getFarmerId(), userId));
    }

    @Transactional(readOnly = true)
    public boolean canCancelOrder(Authentication auth, Long orderId) {
        if (auth == null || orderId == null) {
            return false;
        }
        if (isAdmin(auth)) {
            return true;
        }
        return canCancelAsHousehold(auth, orderId) || canCancelAsFarmer(auth, orderId);
    }

    @Transactional(readOnly = true)
    public boolean canDisputeAsHousehold(Authentication auth, Long orderId) {
        return canCancelAsHousehold(auth, orderId);
    }

    @Transactional(readOnly = true)
    public boolean canDisputeAsFarmer(Authentication auth, Long orderId) {
        if (auth == null || orderId == null) {
            return false;
        }
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return false;
        }
        Long userId = extractUserId(auth);
        if (userId == null) {
            return false;
        }
        return orderOpt.get().getItems().stream()
                .anyMatch(item -> Objects.equals(item.getFarmerId(), userId));
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    public Long extractUserId(Authentication auth) {
        if (auth == null) {
            return null;
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            Object uid = jwt.getClaim("uid");
            if (uid instanceof Number num) {
                return num.longValue();
            }
            try {
                return Long.parseLong(jwt.getSubject());
            } catch (NumberFormatException e) {
                // fallback to email lookup
            }
        }
        // Fallback to email lookup
        String email = auth.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        return userOpt.map(User::getId).orElse(null);
    }
}
