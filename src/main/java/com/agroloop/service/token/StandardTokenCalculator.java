package com.agroloop.service.token;

import com.agroloop.model.QualityGrade;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteVerification;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Standard baseline token reward calculation strategy.
 * Formula: reward = verifiedWeight * categoryMultiplier * qualityMultiplier
 */
@Component
@ConditionalOnProperty(
        name = "agroloop.tokens.calculator-strategy",
        havingValue = "standard",
        matchIfMissing = true
)
public class StandardTokenCalculator implements TokenCalculator {

    @Override
    public BigDecimal calculateReward(WasteVerification verification) {
        Objects.requireNonNull(verification, "Waste verification cannot be null");

        // Rejected batches receive exactly 0.00 tokens
        if (verification.getQualityGrade() == QualityGrade.REJECTED || !verification.isAcceptable()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal weight = verification.getVerifiedWeight();
        if (weight == null || weight.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal categoryMultiplier = BigDecimal.ONE;
        if (verification.getPickupRequest() != null
                && verification.getPickupRequest().getWasteSubmission() != null
                && verification.getPickupRequest().getWasteSubmission().getCategory() != null) {
            WasteCategory category = verification.getPickupRequest().getWasteSubmission().getCategory();
            categoryMultiplier = category.getRewardMultiplier();
        }

        BigDecimal qualityMultiplier = verification.getQualityGrade().getMultiplier();

        BigDecimal rawReward = weight.multiply(categoryMultiplier).multiply(qualityMultiplier);
        return rawReward.setScale(2, RoundingMode.HALF_UP);
    }
}
