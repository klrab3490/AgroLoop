package com.agroloop.service;

import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.WasteVerification;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service contract for EcoToken reward minting, balance tracking, and ledger auditing.
 */
public interface TokenRewardService {

    /**
     * Mints an EcoToken reward for a verified organic waste collection.
     * <p>
     * Invariants enforced:
     * - Idempotent: returns existing transaction if already processed for this verification.
     * - Concurrency-safe: acquires a PESSIMISTIC_WRITE lock on the household wallet.
     * - Zero-reward auditing: records a 0.00 token transaction for rejected waste batches.
     *
     * @param verification the persisted WasteVerification entity
     * @return the created or existing EcoTokenTransaction
     */
    EcoTokenTransaction mintRewardForVerification(WasteVerification verification);

    /**
     * Retrieves the transaction ledger for a given household ID, ordered newest first.
     */
    List<EcoTokenTransaction> getHouseholdLedger(Long householdId);

    /**
     * Retrieves the current token balance for a given household ID.
     */
    BigDecimal getHouseholdBalance(Long householdId);
}
