package com.agroloop.service;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;
import com.agroloop.service.token.PromotionalTokenCalculator;
import com.agroloop.service.token.StandardTokenCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("TokenCalculator Polymorphic Strategy Tests (Phase 5)")
class TokenCalculatorTest {

    private StandardTokenCalculator standardCalculator;
    private PromotionalTokenCalculator promotionalCalculator;

    private Household household;
    private Farmer farmer;

    @BeforeEach
    void setUp() {
        standardCalculator = new StandardTokenCalculator();
        promotionalCalculator = new PromotionalTokenCalculator(new BigDecimal("1.25"), "Spring Composting Drive");

        household = new Household("Alice Green", "alice@example.com", "hash", "123 Green Way");
        farmer = new Farmer("Bob Brown", "bob@example.com", "hash", "Bob Farm", "456 Valley Rd", "Compost");
    }

    private WasteVerification createVerification(WasteCategory category, BigDecimal weight, QualityGrade grade) {
        WasteSubmission submission = household.submitWaste(category, weight, "123 Green Way", null, "Notes");
        PickupRequest pickup = new PickupRequest(submission);
        pickup.accept(farmer);
        pickup.schedule(LocalDateTime.now().plusDays(1));
        pickup.markCollected();

        return new WasteVerification(pickup, farmer, weight, grade, "Inspection notes");
    }

    @Test
    @DisplayName("Acceptance Case: 5.00 kg Coffee Grounds (1.50x) with Grade A (1.20x) yields 9.00 EcoTokens")
    void standardCalculator_acceptanceCase_yieldsNineTokens() {
        WasteVerification verification = createVerification(WasteCategory.COFFEE_GROUNDS, new BigDecimal("5.00"), QualityGrade.GRADE_A);

        BigDecimal reward = standardCalculator.calculateReward(verification);

        // 5.00 * 1.50 * 1.20 = 9.00
        assertEquals(new BigDecimal("9.00"), reward);
    }

    @Test
    @DisplayName("Standard Case: 10.00 kg Food Scraps (1.00x) with Grade B (1.00x) yields 10.00 EcoTokens")
    void standardCalculator_standardFoodScraps_yieldsCorrectTokens() {
        WasteVerification verification = createVerification(WasteCategory.FOOD_SCRAPS, new BigDecimal("10.00"), QualityGrade.GRADE_B);

        BigDecimal reward = standardCalculator.calculateReward(verification);

        // 10.00 * 1.00 * 1.00 = 10.00
        assertEquals(new BigDecimal("10.00"), reward);
    }

    @Test
    @DisplayName("Standard Case: 10.00 kg Garden Waste (0.80x) with Grade C (0.70x) yields 5.60 EcoTokens")
    void standardCalculator_gardenWasteLowQuality_yieldsCorrectTokens() {
        WasteVerification verification = createVerification(WasteCategory.GARDEN_WASTE, new BigDecimal("10.00"), QualityGrade.GRADE_C);

        BigDecimal reward = standardCalculator.calculateReward(verification);

        // 10.00 * 0.80 * 0.70 = 5.60
        assertEquals(new BigDecimal("5.60"), reward);
    }

    @Test
    @DisplayName("Standard Case: 2.50 kg Agricultural Organic (1.20x) with Grade A (1.20x) yields 3.60 EcoTokens")
    void standardCalculator_agriculturalOrganic_yieldsCorrectTokens() {
        WasteVerification verification = createVerification(WasteCategory.AGRICULTURAL_ORGANIC, new BigDecimal("2.50"), QualityGrade.GRADE_A);

        BigDecimal reward = standardCalculator.calculateReward(verification);

        // 2.50 * 1.20 * 1.20 = 3.60
        assertEquals(new BigDecimal("3.60"), reward);
    }

    @Test
    @DisplayName("Zero-Reward Case: Rejected waste yields exactly 0.00 EcoTokens regardless of weight or category")
    void standardCalculator_rejectedWaste_yieldsZeroTokens() {
        WasteVerification verification = createVerification(WasteCategory.COFFEE_GROUNDS, new BigDecimal("25.00"), QualityGrade.REJECTED);

        BigDecimal reward = standardCalculator.calculateReward(verification);

        assertEquals(new BigDecimal("0.00"), reward);
    }

    @Test
    @DisplayName("Promotional Strategy: 5.00 kg Coffee Grounds with Grade A + 1.25x promo yields 11.25 EcoTokens")
    void promotionalCalculator_appliesSurgeMultiplier() {
        WasteVerification verification = createVerification(WasteCategory.COFFEE_GROUNDS, new BigDecimal("5.00"), QualityGrade.GRADE_A);

        BigDecimal reward = promotionalCalculator.calculateReward(verification);

        // 9.00 * 1.25 = 11.25
        assertEquals(new BigDecimal("11.25"), reward);
        assertEquals("Spring Composting Drive", promotionalCalculator.getCampaignName());
    }

    @Test
    @DisplayName("Promotional Strategy: Rejected waste remains 0.00 tokens even with surge campaign")
    void promotionalCalculator_rejectedWaste_remainsZero() {
        WasteVerification verification = createVerification(WasteCategory.COFFEE_GROUNDS, new BigDecimal("10.00"), QualityGrade.REJECTED);

        BigDecimal reward = promotionalCalculator.calculateReward(verification);

        assertEquals(new BigDecimal("0.00"), reward);
    }

    @Test
    @DisplayName("Null verification throws NullPointerException")
    void standardCalculator_nullVerification_throwsException() {
        assertThrows(NullPointerException.class, () -> standardCalculator.calculateReward(null));
    }
}
