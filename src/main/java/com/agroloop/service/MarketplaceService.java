package com.agroloop.service;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.model.DisputeResolution;
import com.agroloop.model.Order;

import java.util.List;

/**
 * Service contract for atomic marketplace checkout coordination, order management,
 * order history queries, order cancellations, dispute processing, and atomic refunds.
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

    /**
     * Initiates cancellation and atomic refund by the authenticated customer who placed the order.
     */
    void cancelHouseholdOrder(Long orderId, String householdEmail, String reason);

    /**
     * Initiates cancellation and atomic refund by an authenticated administrator.
     */
    void adminCancelOrder(Long orderId, String adminEmail, String reason);

    /**
     * Raises a dispute on an active order by the authenticated household owner.
     */
    void disputeOrderAsHousehold(Long orderId, String householdEmail, String disputeReason);

    /**
     * Raises a dispute on an active order by an authenticated participating farmer.
     */
    void disputeOrderAsFarmer(Long orderId, String farmerEmail, String disputeReason);

    /**
     * Adjudicates a disputed order as an administrator.
     * If APPROVED_REFUND: triggers atomic refund and restock.
     * If DISMISSED: reverts order to PLACED.
     */
    void resolveDispute(Long orderId, String adminEmail, DisputeResolution resolution, String resolutionNotes);
}
