package com.agroloop.model;

/**
 * Categorization of ledger transactions affecting household EcoToken balances.
 */
public enum TransactionType {

    /**
     * Platform currency minted as a reward for verified organic waste collection.
     */
    REWARD_MINTED("Reward Minted", true),

    /**
     * Tokens debited to purchase produce or compost from farmer marketplace listings (Phase 6).
     */
    MARKETPLACE_PURCHASE("Marketplace Purchase", false),

    /**
     * Tokens refunded due to order cancellation or upheld dispute (Phase 7).
     */
    ORDER_REFUND("Order Refund", true),

    /**
     * Administrative balance adjustment or dispute resolution (Phase 7).
     */
    ADMIN_ADJUSTMENT("Admin Adjustment", true);

    private final String displayName;
    private final boolean credit;

    TransactionType(String displayName, boolean credit) {
        this.displayName = displayName;
        this.credit = credit;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isCredit() {
        return credit;
    }
}
