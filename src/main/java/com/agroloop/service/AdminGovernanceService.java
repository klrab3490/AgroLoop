package com.agroloop.service;

import com.agroloop.dto.SolvencyMetricsDto;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.TransactionDirection;
import com.agroloop.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service contract for platform administration, user moderation, dispute adjudication,
 * financial solvency reconciliation, and token adjustments.
 */
public interface AdminGovernanceService {

    void enableUser(Long userId, String adminEmail);

    void disableUser(Long userId, String adminEmail);

    void adjustTokens(Long householdId, BigDecimal amount, TransactionDirection direction, String reason, String adminEmail);

    SolvencyMetricsDto getPlatformSolvencyMetrics();

    List<Order> getAllOrders(OrderStatus statusFilter);

    List<Order> getDisputedOrders();

    Page<EcoTokenTransaction> getPlatformLedger(Pageable pageable);

    List<User> getAllUsers();
}
