package com.agroloop.model;

import java.math.BigDecimal;

/**
 * Quality inspection grading assigned during post-collection waste verification.
 * Determines contamination thresholds and token reward multipliers in Phase 5.
 */
public enum QualityGrade {

    /**
     * Premium quality: Pure segregated organic matter, zero contamination, optimal for composting.
     */
    GRADE_A("Grade A - Premium", new BigDecimal("1.20"), "Pure organic matter, zero contamination, ideal for high-yield composting"),

    /**
     * Standard quality: Standard compostable waste with minimal inert non-hazardous debris.
     */
    GRADE_B("Grade B - Standard", new BigDecimal("1.00"), "Standard compostable waste, minimal inert non-hazardous debris"),

    /**
     * Low quality: High moisture or partial non-organic debris requiring manual pre-sorting.
     */
    GRADE_C("Grade C - Low Quality", new BigDecimal("0.70"), "High moisture or partial debris, requires pre-sorting before composting"),

    /**
     * Rejected: Excessive inorganic matter, plastics, hazardous chemicals, or spoiled beyond recovery.
     */
    REJECTED("Rejected", BigDecimal.ZERO, "Contaminated with non-biodegradable or hazardous materials");

    private final String displayName;
    private final BigDecimal multiplier;
    private final String description;

    QualityGrade(String displayName, BigDecimal multiplier, String description) {
        this.displayName = displayName;
        this.multiplier = multiplier;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public BigDecimal getMultiplier() {
        return multiplier;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Returns true if the waste is acceptable for composting and token rewards.
     */
    public boolean isAcceptable() {
        return this != REJECTED;
    }
}
