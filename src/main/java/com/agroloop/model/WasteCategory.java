package com.agroloop.model;

import java.math.BigDecimal;

/**
 * Categorization taxonomy for organic waste streams in the AgroLoop circular ecosystem.
 * Each category defines descriptive metadata and a baseline reward multiplier used
 * during the verification and token minting process.
 */
public enum WasteCategory {

    FOOD_SCRAPS(
            "Food Scraps & Kitchen Waste",
            "Vegetable peels, fruit rinds, leftover food, and organic kitchen leftovers suitable for composting.",
            new BigDecimal("1.00")
    ),

    GARDEN_WASTE(
            "Garden & Yard Trimmings",
            "Grass clippings, dried leaves, branch prunings, and garden biomass.",
            new BigDecimal("0.80")
    ),

    AGRICULTURAL_ORGANIC(
            "Agricultural Organic Matter",
            "Crop residues, husks, straw, stalks, and farm biomass.",
            new BigDecimal("1.20")
    ),

    COFFEE_GROUNDS(
            "Coffee Grounds & Tea Residue",
            "Spent coffee grounds, tea leaves, and herbal infusion residues rich in nitrogen.",
            new BigDecimal("1.50")
    );

    private final String displayName;
    private final String description;
    private final BigDecimal rewardMultiplier;

    WasteCategory(String displayName, String description, BigDecimal rewardMultiplier) {
        this.displayName = displayName;
        this.description = description;
        this.rewardMultiplier = rewardMultiplier;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getRewardMultiplier() {
        return rewardMultiplier;
    }
}
