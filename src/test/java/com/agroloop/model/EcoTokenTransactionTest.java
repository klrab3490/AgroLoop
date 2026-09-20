package com.agroloop.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("EcoTokenTransaction Domain Model Tests (Phase 5 & 7)")
class EcoTokenTransactionTest {

    private Household household;
    private Farmer farmer;
    private User admin;
    private WasteVerification verification;
    private Order order;

    @BeforeEach
    void setUp() {
        household = new Household("Alice Green", "alice@example.com", "hash", "123 Green Way");
        ReflectionTestUtils.setField(household, "id", 101L);

        farmer = new Farmer("Bob Brown", "bob@example.com", "hash", "Bob Farm", "456 Valley Rd", "Compost");
        ReflectionTestUtils.setField(farmer, "id", 201L);

        admin = new Admin("Super Admin", "admin@agroloop.com", "hash");
        ReflectionTestUtils.setField(admin, "id", 301L);

        WasteSubmission submission = household.submitWaste(WasteCategory.COFFEE_GROUNDS, new BigDecimal("5.00"), "123 Green Way", null, "Notes");
        PickupRequest pickup = new PickupRequest(submission);
        pickup.accept(farmer);
        pickup.schedule(LocalDateTime.now().plusDays(1));
        pickup.markCollected();

        verification = new WasteVerification(pickup, farmer, new BigDecimal("5.00"), QualityGrade.GRADE_A, "Clean batch");
        ReflectionTestUtils.setField(verification, "id", 501L);

        order = new Order(household, "123 Green Way", "Leave at door");
        ReflectionTestUtils.setField(order, "id", 801L);
    }

    @Test
    @DisplayName("rewardMinted factory sets credit direction and audit fields")
    void rewardMinted_success() {
        EcoTokenTransaction tx = EcoTokenTransaction.rewardMinted(
                household,
                verification,
                new BigDecimal("9"),
                new BigDecimal("159"),
                null
        );

        assertNotNull(tx);
        assertEquals(household, tx.getHousehold());
        assertEquals(verification, tx.getWasteVerification());
        assertEquals(new BigDecimal("9.00"), tx.getAmount());
        assertEquals(TransactionType.REWARD_MINTED, tx.getTransactionType());
        assertEquals(TransactionDirection.CREDIT, tx.getDirection());
        assertEquals(null, tx.getActor());
        assertEquals(new BigDecimal("159.00"), tx.getBalanceAfter());
        assertTrue(tx.getDescription().contains("Verified waste reward"));
        assertNotNull(tx.getCreatedAt());
    }

    @Test
    @DisplayName("marketplacePurchase factory sets debit direction and actor")
    void marketplacePurchase_success() {
        EcoTokenTransaction tx = EcoTokenTransaction.marketplacePurchase(
                household,
                order,
                new BigDecimal("25.00"),
                new BigDecimal("125.00"),
                household
        );

        assertNotNull(tx);
        assertEquals(household, tx.getHousehold());
        assertEquals(order, tx.getOrder());
        assertEquals(null, tx.getWasteVerification());
        assertEquals(household, tx.getActor());
        assertEquals(new BigDecimal("25.00"), tx.getAmount());
        assertEquals(TransactionType.MARKETPLACE_PURCHASE, tx.getTransactionType());
        assertEquals(TransactionDirection.DEBIT, tx.getDirection());
        assertEquals(new BigDecimal("125.00"), tx.getBalanceAfter());
        assertEquals("Marketplace purchase for Order #801", tx.getDescription());
    }

    @Test
    @DisplayName("orderRefund factory sets credit direction and actor")
    void orderRefund_success() {
        EcoTokenTransaction tx = EcoTokenTransaction.orderRefund(
                household,
                order,
                new BigDecimal("25.00"),
                new BigDecimal("150.00"),
                admin,
                "Administrative refund"
        );

        assertNotNull(tx);
        assertEquals(household, tx.getHousehold());
        assertEquals(order, tx.getOrder());
        assertEquals(admin, tx.getActor());
        assertEquals(new BigDecimal("25.00"), tx.getAmount());
        assertEquals(TransactionType.ORDER_REFUND, tx.getTransactionType());
        assertEquals(TransactionDirection.CREDIT, tx.getDirection());
        assertEquals(new BigDecimal("150.00"), tx.getBalanceAfter());
        assertEquals("Administrative refund", tx.getDescription());
    }

    @Test
    @DisplayName("adminAdjustment factory sets credit/debit and mandatory admin actor")
    void adminAdjustment_success() {
        EcoTokenTransaction tx = EcoTokenTransaction.adminAdjustment(
                household,
                new BigDecimal("50.00"),
                TransactionDirection.CREDIT,
                new BigDecimal("200.00"),
                admin,
                "Platform compensation"
        );

        assertNotNull(tx);
        assertEquals(household, tx.getHousehold());
        assertEquals(admin, tx.getActor());
        assertEquals(new BigDecimal("50.00"), tx.getAmount());
        assertEquals(TransactionType.ADMIN_ADJUSTMENT, tx.getTransactionType());
        assertEquals(TransactionDirection.CREDIT, tx.getDirection());
        assertEquals(new BigDecimal("200.00"), tx.getBalanceAfter());
        assertEquals("Platform compensation", tx.getDescription());
    }

    @Test
    @DisplayName("Negative balanceAfter throws IllegalArgumentException")
    void negativeBalanceAfter_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                EcoTokenTransaction.rewardMinted(
                        household,
                        verification,
                        new BigDecimal("5.00"),
                        new BigDecimal("-1.00"),
                        null
                ));

        assertTrue(ex.getMessage().contains("non-negative"));
    }

    @Test
    @DisplayName("Null household throws NullPointerException")
    void nullHousehold_throwsException() {
        assertThrows(NullPointerException.class, () ->
                EcoTokenTransaction.rewardMinted(
                        null,
                        verification,
                        new BigDecimal("5.00"),
                        new BigDecimal("10.00"),
                        null
                ));
    }

    @Test
    @DisplayName("Null verification in rewardMinted throws NullPointerException")
    void nullVerification_throwsException() {
        assertThrows(NullPointerException.class, () ->
                EcoTokenTransaction.rewardMinted(
                        household,
                        null,
                        new BigDecimal("5.00"),
                        new BigDecimal("10.00"),
                        null
                ));
    }

    @Test
    @DisplayName("Null order in marketplacePurchase throws NullPointerException")
    void nullOrder_throwsException() {
        assertThrows(NullPointerException.class, () ->
                EcoTokenTransaction.marketplacePurchase(
                        household,
                        null,
                        new BigDecimal("5.00"),
                        new BigDecimal("10.00"),
                        household
                ));
    }

    @Test
    @DisplayName("Null amount throws IllegalArgumentException")
    void nullAmount_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
                EcoTokenTransaction.rewardMinted(
                        household,
                        verification,
                        null,
                        new BigDecimal("10.00"),
                        null
                ));
    }

    @Test
    @DisplayName("Zero or negative amount for purchase throws IllegalArgumentException")
    void zeroOrNegativeAmount_purchase_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
                EcoTokenTransaction.marketplacePurchase(
                        household,
                        order,
                        BigDecimal.ZERO,
                        new BigDecimal("10.00"),
                        household
                ));

        assertThrows(IllegalArgumentException.class, () ->
                EcoTokenTransaction.marketplacePurchase(
                        household,
                        order,
                        new BigDecimal("-5.00"),
                        new BigDecimal("10.00"),
                        household
                ));
    }

    @Test
    @DisplayName("Negative amount for rewardMinted throws IllegalArgumentException")
    void negativeAmount_rewardMinted_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
                EcoTokenTransaction.rewardMinted(
                        household,
                        verification,
                        new BigDecimal("-5.00"),
                        new BigDecimal("10.00"),
                        null
                ));
    }

    @Test
    @DisplayName("Zero amount for rewardMinted creates audit ledger entry")
    void zeroAmount_rewardMinted_allowedForAuditLedger() {
        EcoTokenTransaction tx = EcoTokenTransaction.rewardMinted(
                household,
                verification,
                BigDecimal.ZERO,
                new BigDecimal("10.00"),
                null
        );
        assertNotNull(tx);
        assertEquals(new BigDecimal("0.00"), tx.getAmount());
        assertTrue(tx.getDescription().contains("0 tokens minted"));
    }

    @Test
    @DisplayName("Mismatched household on WasteVerification throws IllegalArgumentException")
    void mismatchedHousehold_throwsException() {
        Household anotherHousehold = new Household("Charlie", "charlie@example.com", "hash", "789 Other St");
        ReflectionTestUtils.setField(anotherHousehold, "id", 999L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                EcoTokenTransaction.rewardMinted(
                        anotherHousehold,
                        verification,
                        new BigDecimal("5.00"),
                        new BigDecimal("10.00"),
                        null
                ));
        assertTrue(ex.getMessage().contains("does not match waste verification owner"));
    }

    @Test
    @DisplayName("Mismatched household on Order throws IllegalArgumentException")
    void mismatchedHouseholdOnOrder_throwsException() {
        Household anotherHousehold = new Household("Charlie", "charlie@example.com", "hash", "789 Other St");
        ReflectionTestUtils.setField(anotherHousehold, "id", 999L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                EcoTokenTransaction.marketplacePurchase(
                        anotherHousehold,
                        order,
                        new BigDecimal("15.00"),
                        new BigDecimal("30.00"),
                        anotherHousehold
                ));
        assertTrue(ex.getMessage().contains("does not match order owner"));
    }

    @Test
    @DisplayName("Null actor for marketplacePurchase throws NullPointerException")
    void nullActor_marketplacePurchase_throwsException() {
        assertThrows(NullPointerException.class, () ->
                EcoTokenTransaction.marketplacePurchase(
                        household,
                        order,
                        new BigDecimal("15.00"),
                        new BigDecimal("30.00"),
                        null
                ));
    }

    @Test
    @DisplayName("Null admin actor for adminAdjustment throws NullPointerException")
    void nullAdminActor_adminAdjustment_throwsException() {
        assertThrows(NullPointerException.class, () ->
                EcoTokenTransaction.adminAdjustment(
                        household,
                        new BigDecimal("15.00"),
                        TransactionDirection.CREDIT,
                        new BigDecimal("30.00"),
                        null,
                        "Reason"
                ));
    }
}
