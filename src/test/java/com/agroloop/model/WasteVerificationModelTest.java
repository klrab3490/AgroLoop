package com.agroloop.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WasteVerificationModelTest {

    private Farmer farmer;
    private PickupRequest pickupRequest;

    @BeforeEach
    void setUp() {
        Household household = new Household("Alice Smith", "alice@example.com", "hash123", "123 Green St");
        farmer = new Farmer("Bob Farmer", "bob@example.com", "hash123", "Bob's Farm", "456 Farm Rd", "Composting");
        WasteSubmission submission = household.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("4.00"), null, null, null);
        pickupRequest = new PickupRequest(submission);
    }

    @Test
    @DisplayName("Valid WasteVerification instantiates correctly with verifiedAt timestamp")
    void validInstantiation() {
        WasteVerification verification = new WasteVerification(
                pickupRequest,
                farmer,
                new BigDecimal("4.25"),
                QualityGrade.GRADE_A,
                "Clean organic fruit scraps"
        );

        assertEquals(pickupRequest, verification.getPickupRequest());
        assertEquals(farmer, verification.getVerifiedByFarmer());
        assertEquals(new BigDecimal("4.25"), verification.getVerifiedWeight());
        assertEquals(QualityGrade.GRADE_A, verification.getQualityGrade());
        assertEquals("Clean organic fruit scraps", verification.getVerificationNotes());
        assertNotNull(verification.getVerifiedAt());
        assertTrue(verification.isAcceptable());
    }

    @Test
    @DisplayName("Verification notes are trimmed or sanitized to null")
    void notesSanitization() {
        WasteVerification verification = new WasteVerification(
                pickupRequest,
                farmer,
                new BigDecimal("2.50"),
                QualityGrade.GRADE_B,
                "   "
        );
        assertEquals("", verification.getVerificationNotes());

        WasteVerification verificationNull = new WasteVerification(
                pickupRequest,
                farmer,
                new BigDecimal("2.50"),
                QualityGrade.GRADE_B,
                null
        );
        assertNull(verificationNull.getVerificationNotes());
    }

    @Test
    @DisplayName("Fails when PickupRequest is null")
    void nullPickupRequestThrows() {
        assertThrows(NullPointerException.class, () -> new WasteVerification(
                null,
                farmer,
                new BigDecimal("5.00"),
                QualityGrade.GRADE_A,
                "Notes"
        ));
    }

    @Test
    @DisplayName("Fails when Farmer is null")
    void nullFarmerThrows() {
        assertThrows(NullPointerException.class, () -> new WasteVerification(
                pickupRequest,
                null,
                new BigDecimal("5.00"),
                QualityGrade.GRADE_A,
                "Notes"
        ));
    }

    @Test
    @DisplayName("Fails when QualityGrade is null")
    void nullGradeThrows() {
        assertThrows(NullPointerException.class, () -> new WasteVerification(
                pickupRequest,
                farmer,
                new BigDecimal("5.00"),
                null,
                "Notes"
        ));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.00", "-0.01", "-5.00"})
    @DisplayName("Fails when verified weight is zero or negative")
    void invalidWeightThrows(String invalidWeight) {
        BigDecimal weight = new BigDecimal(invalidWeight);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> new WasteVerification(
                pickupRequest,
                farmer,
                weight,
                QualityGrade.GRADE_B,
                "Notes"
        ));
        assertTrue(ex.getMessage().contains("must be greater than zero"));
    }

    @Test
    @DisplayName("Fails when verified weight is null")
    void nullWeightThrows() {
        assertThrows(IllegalArgumentException.class, () -> new WasteVerification(
                pickupRequest,
                farmer,
                null,
                QualityGrade.GRADE_B,
                "Notes"
        ));
    }

    @Test
    @DisplayName("QualityGrade multipliers and acceptability checks")
    void qualityGradeBehaviors() {
        assertEquals(new BigDecimal("1.20"), QualityGrade.GRADE_A.getMultiplier());
        assertTrue(QualityGrade.GRADE_A.isAcceptable());

        assertEquals(new BigDecimal("1.00"), QualityGrade.GRADE_B.getMultiplier());
        assertTrue(QualityGrade.GRADE_B.isAcceptable());

        assertEquals(new BigDecimal("0.70"), QualityGrade.GRADE_C.getMultiplier());
        assertTrue(QualityGrade.GRADE_C.isAcceptable());

        assertEquals(BigDecimal.ZERO, QualityGrade.REJECTED.getMultiplier());
        assertFalse(QualityGrade.REJECTED.isAcceptable());
    }
}
