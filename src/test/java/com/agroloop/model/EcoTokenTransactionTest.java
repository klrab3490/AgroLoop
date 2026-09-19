package com.agroloop.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("EcoTokenTransaction Domain Model Tests (Phase 5)")
class EcoTokenTransactionTest {

    private Household household;
    private Farmer farmer;
    private WasteVerification verification;

    @BeforeEach
    void setUp() {
        household = new Household("Alice Green", "alice@example.com", "hash", "123 Green Way");
        farmer = new Farmer("Bob Brown", "bob@example.com", "hash", "Bob Farm", "456 Valley Rd", "Compost");

        WasteSubmission submission = household.submitWaste(WasteCategory.COFFEE_GROUNDS, new BigDecimal("5.00"), "123 Green Way", null, "Notes");
        PickupRequest pickup = new PickupRequest(submission);
        pickup.accept(farmer);
        pickup.schedule(LocalDateTime.now().plusDays(1));
        pickup.markCollected();

        verification = new WasteVerification(pickup, farmer, new BigDecimal("5.00"), QualityGrade.GRADE_A, "Clean batch");
    }

    @Test
    @DisplayName("Valid creation normalizes scales and sets audit fields")
    void validCreation_success() {
        EcoTokenTransaction tx = new EcoTokenTransaction(
                household,
                verification,
                new BigDecimal("9"),
                TransactionType.REWARD_MINTED,
                new BigDecimal("159"),
                "Reward for Coffee Grounds"
        );

        assertNotNull(tx);
        assertEquals(household, tx.getHousehold());
        assertEquals(verification, tx.getWasteVerification());
        assertEquals(new BigDecimal("9.00"), tx.getAmount());
        assertEquals(TransactionType.REWARD_MINTED, tx.getTransactionType());
        assertEquals(new BigDecimal("159.00"), tx.getBalanceAfter());
        assertEquals("Reward for Coffee Grounds", tx.getDescription());
        assertNotNull(tx.getCreatedAt());
    }

    @Test
    @DisplayName("Negative balanceAfter throws IllegalArgumentException")
    void negativeBalanceAfter_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> new EcoTokenTransaction(
                household,
                verification,
                new BigDecimal("5.00"),
                TransactionType.REWARD_MINTED,
                new BigDecimal("-1.00"),
                "Invalid balance"
        ));

        assertTrue(ex.getMessage().contains("non-negative"));
    }

    @Test
    @DisplayName("Null household throws NullPointerException")
    void nullHousehold_throwsException() {
        assertThrows(NullPointerException.class, () -> new EcoTokenTransaction(
                null,
                verification,
                new BigDecimal("5.00"),
                TransactionType.REWARD_MINTED,
                new BigDecimal("10.00"),
                "Description"
        ));
    }

    @Test
    @DisplayName("Null verification throws NullPointerException")
    void nullVerification_throwsException() {
        assertThrows(NullPointerException.class, () -> new EcoTokenTransaction(
                household,
                null,
                new BigDecimal("5.00"),
                TransactionType.REWARD_MINTED,
                new BigDecimal("10.00"),
                "Description"
        ));
    }

    @Test
    @DisplayName("Null amount throws IllegalArgumentException")
    void nullAmount_throwsException() {
        assertThrows(IllegalArgumentException.class, () -> new EcoTokenTransaction(
                household,
                verification,
                null,
                TransactionType.REWARD_MINTED,
                new BigDecimal("10.00"),
                "Description"
        ));
    }

    @Test
    @DisplayName("Mismatched household throws IllegalArgumentException")
    void mismatchedHousehold_throwsException() {
        org.springframework.test.util.ReflectionTestUtils.setField(household, "id", 101L);
        Household anotherHousehold = new Household("Charlie", "charlie@example.com", "hash", "789 Other St");
        org.springframework.test.util.ReflectionTestUtils.setField(anotherHousehold, "id", 999L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> new EcoTokenTransaction(
                anotherHousehold,
                verification,
                new BigDecimal("5.00"),
                TransactionType.REWARD_MINTED,
                new BigDecimal("10.00"),
                "Description"
        ));
        assertTrue(ex.getMessage().contains("does not match waste verification owner"));
    }


    @Test
    @DisplayName("TransactionType enum flags credit operations accurately")
    void transactionTypeCreditFlags() {
        assertTrue(TransactionType.REWARD_MINTED.isCredit());
        assertTrue(TransactionType.ADMIN_ADJUSTMENT.isCredit());
        assertEquals(false, TransactionType.MARKETPLACE_PURCHASE.isCredit());
    }
}
