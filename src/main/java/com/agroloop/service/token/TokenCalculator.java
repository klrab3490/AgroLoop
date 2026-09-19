package com.agroloop.service.token;

import com.agroloop.model.WasteVerification;

import java.math.BigDecimal;

/**
 * Strategy interface defining polymorphic algorithms for calculating EcoToken
 * rewards generated from verified organic waste collections.
 */
public interface TokenCalculator {

    /**
     * Calculates the EcoToken reward earned from the verified waste inspection.
     *
     * @param verification the verified waste collection record
     * @return the calculated reward amount in EcoTokens (scaled to 2 decimal places, non-negative)
     */
    BigDecimal calculateReward(WasteVerification verification);
}
