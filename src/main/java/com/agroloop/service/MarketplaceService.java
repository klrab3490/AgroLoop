package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.model.Order;

import java.util.List;

/**
 * Service contract for atomic marketplace checkout coordination, order management,
 * and order history queries.
 */
public interface MarketplaceService {

    /**
     * Executes atomic checkout inside a single database transaction:
     * 1. Acquires pessimistic lock on Household
     * 2. Acquires pessimistic locks on Products in ascending ID order
     * 3. Validates active status, positive quantities, and stock availability
     * 4. Calculates authoritative total price from current database prices
     * 5. Validates household token solvency
     * 6. Deducts product stock and debits household token balance
     * 7. Persists Order and snapshot OrderItems
     * 8. Records immutable MARKETPLACE_PURCHASE EcoTokenTransaction ledger entry
     *
     * @param householdEmail email of the authenticated household
     * @param cart the user's current session cart
     * @param request delivery and order metadata
     * @return the persisted Order
     */
    Order checkout(String householdEmail, CartDto cart, CheckoutRequest request);

    List<Order> getHouseholdOrders(String householdEmail);

    Order getOrderById(Long orderId, String userEmail);

    List<Order> getFarmerOrders(String farmerEmail);
}
