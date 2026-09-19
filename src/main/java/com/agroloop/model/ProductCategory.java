package com.agroloop.model;

/**
 * Categorization taxonomy for agricultural goods, produce, and compost available
 * in the AgroLoop circular marketplace.
 */
public enum ProductCategory {

    ORGANIC_VEGETABLES(
            "Organic Vegetables",
            "Farm-fresh organic vegetables grown using enriched compost."
    ),

    FRESH_FRUITS(
            "Fresh Fruits",
            "Naturally cultivated fresh fruits grown without synthetic pesticides."
    ),

    COMPOST_AND_SOIL(
            "Enriched Compost & Soil",
            "High-nutrient organic compost crafted from verified household waste collections."
    ),

    FARM_DAIRY(
            "Farm Fresh Dairy",
            "Fresh, ethically produced organic dairy products from local sustainable farmers."
    ),

    SEEDS_AND_SAPLINGS(
            "Seeds & Saplings",
            "Non-GMO heirloom seeds and young plant saplings for home gardening and farming."
    ),

    HERBS_AND_SPICES(
            "Fresh Herbs & Spices",
            "Culinary and medicinal fresh herbs and spices grown naturally."
    );

    private final String displayName;
    private final String description;

    ProductCategory(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }
}
