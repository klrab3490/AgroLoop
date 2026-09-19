package com.agroloop.service.token;

import com.agroloop.model.WasteVerification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Promotional surge strategy that applies a configurable campaign multiplier
 * on top of the baseline calculation provided by StandardTokenCalculator.
 */
@Component
@ConditionalOnProperty(
        name = "agroloop.tokens.calculator-strategy",
        havingValue = "promotional"
)
public class PromotionalTokenCalculator implements TokenCalculator {

    private final BigDecimal promotionalMultiplier;
    private final String campaignName;
    private final StandardTokenCalculator standardCalculator;

    @Autowired
    public PromotionalTokenCalculator(
            @Value("${agroloop.tokens.promotional.multiplier:1.25}") BigDecimal promotionalMultiplier,
            @Value("${agroloop.tokens.promotional.campaign-name:Community Composting Drive}") String campaignName
    ) {
        this(promotionalMultiplier, campaignName, new StandardTokenCalculator());
    }


    public PromotionalTokenCalculator(
            BigDecimal promotionalMultiplier,
            String campaignName,
            StandardTokenCalculator standardCalculator
    ) {
        this.promotionalMultiplier = promotionalMultiplier != null && promotionalMultiplier.compareTo(BigDecimal.ZERO) > 0
                ? promotionalMultiplier
                : new BigDecimal("1.25");
        this.campaignName = campaignName;
        this.standardCalculator = Objects.requireNonNull(standardCalculator, "Standard token calculator cannot be null");
    }

    @Override
    public BigDecimal calculateReward(WasteVerification verification) {
        Objects.requireNonNull(verification, "Waste verification cannot be null");

        BigDecimal standardReward = standardCalculator.calculateReward(verification);
        if (standardReward.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal promotionalReward = standardReward.multiply(this.promotionalMultiplier);
        return promotionalReward.setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal getPromotionalMultiplier() {
        return promotionalMultiplier;
    }

    public String getCampaignName() {
        return campaignName;
    }
}
