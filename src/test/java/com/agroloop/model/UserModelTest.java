package com.agroloop.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("User OOP Domain Model Tests")
class UserModelTest {

    @Test
    @DisplayName("Household initializes with 0 tokens and adds tokens correctly")
    void testHouseholdTokenOperations() {
        Household household = new Household("Alice", "alice@example.com", "hash", "123 Street");
        assertEquals(BigDecimal.ZERO, household.getTokenBalance());
        assertEquals(Role.ROLE_HOUSEHOLD, household.getRole());

        household.addTokens(new BigDecimal("50.00"));
        assertEquals(new BigDecimal("50.00"), household.getTokenBalance());

        household.spendTokens(new BigDecimal("20.00"));
        assertEquals(new BigDecimal("30.00"), household.getTokenBalance());
    }

    @Test
    @DisplayName("Household spendTokens throws IllegalStateException when balance is insufficient")
    void testHouseholdSpendTokensInsufficientBalance() {
        Household household = new Household("Alice", "alice@example.com", "hash", "123 Street");
        household.addTokens(new BigDecimal("10.00"));

        assertThrows(IllegalStateException.class, () ->
                household.spendTokens(new BigDecimal("25.00")));
    }

    @Test
    @DisplayName("Household throws IllegalArgumentException when token amount is negative or null")
    void testHouseholdInvalidTokenAmounts() {
        Household household = new Household("Alice", "alice@example.com", "hash", "123 Street");

        assertThrows(IllegalArgumentException.class, () -> household.addTokens(null));
        assertThrows(IllegalArgumentException.class, () -> household.addTokens(new BigDecimal("-5.00")));
        assertThrows(IllegalArgumentException.class, () -> household.spendTokens(null));
        assertThrows(IllegalArgumentException.class, () -> household.spendTokens(new BigDecimal("-5.00")));
    }

    @Test
    @DisplayName("Farmer initializes with ROLE_FARMER and allows updating farm details")
    void testFarmerDomainLogic() {
        Farmer farmer = new Farmer("Bob", "bob@example.com", "hash", "Sunny Farm", "Highway 9", "Organic crops");
        assertEquals(Role.ROLE_FARMER, farmer.getRole());
        assertEquals("Sunny Farm", farmer.getFarmName());

        farmer.updateFarmDetails("Sunny Valley Organic Farm", "Highway 10", "Updated notes");
        assertEquals("Sunny Valley Organic Farm", farmer.getFarmName());
        assertEquals("Highway 10", farmer.getFarmAddress());
        assertEquals("Updated notes", farmer.getNotes());
    }

    @Test
    @DisplayName("Admin initializes with ROLE_ADMIN and active status")
    void testAdminDomainLogic() {
        Admin admin = new Admin("Admin User", "admin@agroloop.com", "adminhash");
        assertEquals(Role.ROLE_ADMIN, admin.getRole());
        assertTrue(admin.isEnabled());
        assertNotNull(admin.getCreatedAt());
    }
}
