package com.agroloop.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Waste Submission Domain Model Tests (Phase 3 - Step 1)")
class WasteSubmissionModelTest {

    private Household createTestHousehold() {
        return new Household("Alice Green", "alice@agroloop.com", "hash123", "123 Eco Road, Kochi");
    }

    @Test
    @DisplayName("WasteCategory metadata and reward multipliers are correctly configured")
    void testWasteCategoryValues() {
        assertEquals(new BigDecimal("1.00"), WasteCategory.FOOD_SCRAPS.getRewardMultiplier());
        assertEquals(new BigDecimal("0.80"), WasteCategory.GARDEN_WASTE.getRewardMultiplier());
        assertEquals(new BigDecimal("1.20"), WasteCategory.AGRICULTURAL_ORGANIC.getRewardMultiplier());
        assertEquals(new BigDecimal("1.50"), WasteCategory.COFFEE_GROUNDS.getRewardMultiplier());

        assertNotNull(WasteCategory.FOOD_SCRAPS.getDisplayName());
        assertNotNull(WasteCategory.FOOD_SCRAPS.getDescription());
    }

    @Test
    @DisplayName("SubmissionStatus lifecycle query methods behave as expected")
    void testSubmissionStatusLifecycleQueries() {
        assertTrue(SubmissionStatus.SUBMITTED.canBeClaimed());
        assertFalse(SubmissionStatus.CLAIMED.canBeClaimed());
        assertFalse(SubmissionStatus.COLLECTED.canBeClaimed());
        assertFalse(SubmissionStatus.VERIFIED.canBeClaimed());
        assertFalse(SubmissionStatus.REJECTED.canBeClaimed());

        assertFalse(SubmissionStatus.SUBMITTED.isTerminal());
        assertFalse(SubmissionStatus.CLAIMED.isTerminal());
        assertFalse(SubmissionStatus.COLLECTED.isTerminal());
        assertTrue(SubmissionStatus.VERIFIED.isTerminal());
        assertTrue(SubmissionStatus.REJECTED.isTerminal());
    }

    @Test
    @DisplayName("WasteSubmission initializes with SUBMITTED status and exact values")
    void testWasteSubmissionInitialization() {
        Household household = createTestHousehold();
        BigDecimal weight = new BigDecimal("12.50");

        WasteSubmission submission = new WasteSubmission(
                household,
                WasteCategory.FOOD_SCRAPS,
                weight,
                "456 Custom Lane, Kochi",
                "uploads/waste/sample.jpg",
                "Sorted kitchen peelings"
        );

        assertEquals(household, submission.getHousehold());
        assertEquals(WasteCategory.FOOD_SCRAPS, submission.getCategory());
        assertEquals(weight, submission.getEstimatedWeight());
        assertEquals("456 Custom Lane, Kochi", submission.getPickupAddress());
        assertEquals("uploads/waste/sample.jpg", submission.getImagePath());
        assertEquals("Sorted kitchen peelings", submission.getNotes());
        assertEquals(SubmissionStatus.SUBMITTED, submission.getStatus());
        assertNull(submission.getRejectionReason());
        assertNotNull(submission.getCreatedAt());
        assertNotNull(submission.getUpdatedAt());
    }

    @Test
    @DisplayName("WasteSubmission enforces strict domain validations")
    void testWasteSubmissionValidationInvariants() {
        Household household = createTestHousehold();
        BigDecimal validWeight = new BigDecimal("5.00");

        // Null household
        assertThrows(NullPointerException.class, () ->
                new WasteSubmission(null, WasteCategory.FOOD_SCRAPS, validWeight, "Addr", null, null));

        // Null category
        assertThrows(NullPointerException.class, () ->
                new WasteSubmission(household, null, validWeight, "Addr", null, null));

        // Non-positive or null weight
        assertThrows(IllegalArgumentException.class, () ->
                new WasteSubmission(household, WasteCategory.FOOD_SCRAPS, null, "Addr", null, null));
        assertThrows(IllegalArgumentException.class, () ->
                new WasteSubmission(household, WasteCategory.FOOD_SCRAPS, BigDecimal.ZERO, "Addr", null, null));
        assertThrows(IllegalArgumentException.class, () ->
                new WasteSubmission(household, WasteCategory.FOOD_SCRAPS, new BigDecimal("-2.50"), "Addr", null, null));

        // Blank pickup address
        assertThrows(IllegalArgumentException.class, () ->
                new WasteSubmission(household, WasteCategory.FOOD_SCRAPS, validWeight, "   ", null, null));
    }

    @Test
    @DisplayName("WasteSubmission lifecycle transitions execute sequentially")
    void testLifecycleTransitions() {
        Household household = createTestHousehold();
        WasteSubmission submission = household.submitWaste(
                WasteCategory.GARDEN_WASTE,
                new BigDecimal("8.00"),
                null,
                null,
                "Leaves and twigs"
        );

        assertEquals(SubmissionStatus.SUBMITTED, submission.getStatus());

        // SUBMITTED -> CLAIMED
        submission.markClaimed();
        assertEquals(SubmissionStatus.CLAIMED, submission.getStatus());

        // Cannot claim again
        assertThrows(IllegalStateException.class, submission::markClaimed);

        // CLAIMED -> COLLECTED
        submission.markCollected();
        assertEquals(SubmissionStatus.COLLECTED, submission.getStatus());

        // COLLECTED -> VERIFIED
        submission.markVerified();
        assertEquals(SubmissionStatus.VERIFIED, submission.getStatus());

        // Cannot verify or claim already verified submission
        assertThrows(IllegalStateException.class, submission::markVerified);
        assertThrows(IllegalStateException.class, submission::markClaimed);
        assertThrows(IllegalStateException.class, () -> submission.markRejected("Too late"));
    }

    @Test
    @DisplayName("WasteSubmission rejection records reason and enters terminal state")
    void testRejectionTransition() {
        Household household = createTestHousehold();
        WasteSubmission submission = household.submitWaste(
                WasteCategory.AGRICULTURAL_ORGANIC,
                new BigDecimal("15.00"),
                null,
                null,
                null
        );

        submission.markRejected("Contains plastic and glass debris");
        assertEquals(SubmissionStatus.REJECTED, submission.getStatus());
        assertEquals("Contains plastic and glass debris", submission.getRejectionReason());

        // Terminal state prohibits further mutations
        assertThrows(IllegalStateException.class, submission::markClaimed);
        assertThrows(IllegalStateException.class, () -> submission.markRejected("Another reason"));
    }

    @Test
    @DisplayName("Household.submitWaste resolves to registered address when custom address is null or blank")
    void testHouseholdSubmitWasteAddressInheritance() {
        Household household = createTestHousehold();

        // Null custom address -> falls back to household.getAddress()
        WasteSubmission sub1 = household.submitWaste(
                WasteCategory.COFFEE_GROUNDS,
                new BigDecimal("3.00"),
                null,
                null,
                "Espresso grounds"
        );
        assertEquals(household.getAddress(), sub1.getPickupAddress());

        // Blank custom address -> falls back to household.getAddress()
        WasteSubmission sub2 = household.submitWaste(
                WasteCategory.COFFEE_GROUNDS,
                new BigDecimal("3.00"),
                "   ",
                null,
                null
        );
        assertEquals(household.getAddress(), sub2.getPickupAddress());

        // Explicit custom address -> used directly
        WasteSubmission sub3 = household.submitWaste(
                WasteCategory.COFFEE_GROUNDS,
                new BigDecimal("3.00"),
                "789 Alternate Street, Ernakulam",
                null,
                null
        );
        assertEquals("789 Alternate Street, Ernakulam", sub3.getPickupAddress());
    }
}
