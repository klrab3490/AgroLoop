package com.agroloop.controller;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.PickupStatus;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.WasteSubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.flash;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Pickup & Verification Integration Tests (Phase 4)")
class PickupIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private PickupRequestRepository pickupRequestRepository;

    private Household testHousehold;
    private Farmer testFarmer;
    private WasteSubmission testSubmission;
    private PickupRequest testPickup;

    @BeforeEach
    void setUp() {
        testHousehold = householdRepository.findByEmail("household@agroloop.com").orElseGet(() ->
                householdRepository.save(new Household("Test Household", "household@agroloop.com", "pass", "101 Green Lane"))
        );

        testFarmer = farmerRepository.findByEmail("farmer@agroloop.com").orElseGet(() ->
                farmerRepository.save(new Farmer("Test Farmer", "farmer@agroloop.com", "pass", "Green Valley Farm", "202 Valley Way", "Organic grower"))
        );

        testSubmission = wasteSubmissionRepository.save(
                testHousehold.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("8.50"), "101 Green Lane", null, "Segregated scraps")
        );

        testPickup = pickupRequestRepository.save(new PickupRequest(testSubmission));
    }

    @Test
    @WithMockUser(username = "farmer@agroloop.com", authorities = {"ROLE_FARMER"})
    @DisplayName("Farmer views available pickups on farmer dashboard")
    void testFarmerViewsAvailablePickups() throws Exception {
        mockMvc.perform(get("/farmer/dashboard"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Available Pickups Queue")))
                .andExpect(content().string(containsString("Food Scraps")))
                .andExpect(content().string(containsString("Claim Pickup")));
    }

    @Test
    @WithMockUser(username = "farmer@agroloop.com", authorities = {"ROLE_FARMER"})
    @DisplayName("Full farmer lifecycle: Claim -> Schedule -> Collect -> Verify")
    void testFullPickupLifecycle() throws Exception {
        // 1. Claim Pickup
        mockMvc.perform(post("/farmer/pickups/" + testPickup.getId() + "/claim")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/dashboard"))
                .andExpect(flash().attributeExists("successMessage"));

        PickupRequest claimed = pickupRequestRepository.findById(testPickup.getId()).orElseThrow();
        assertEquals(PickupStatus.ASSIGNED, claimed.getStatus());
        assertEquals(testFarmer.getId(), claimed.getAssignedFarmer().getId());

        // 2. Schedule Pickup
        LocalDateTime futureSlot = LocalDateTime.now().plusDays(2).withNano(0);
        mockMvc.perform(post("/farmer/pickups/" + testPickup.getId() + "/schedule")
                        .with(csrf())
                        .param("scheduledTime", futureSlot.toString()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/dashboard"))
                .andExpect(flash().attributeExists("successMessage"));

        PickupRequest scheduled = pickupRequestRepository.findById(testPickup.getId()).orElseThrow();
        assertEquals(PickupStatus.SCHEDULED, scheduled.getStatus());
        assertNotNull(scheduled.getScheduledTime());

        // 3. Mark Collected
        mockMvc.perform(post("/farmer/pickups/" + testPickup.getId() + "/collect")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/dashboard"))
                .andExpect(flash().attributeExists("successMessage"));

        PickupRequest collected = pickupRequestRepository.findById(testPickup.getId()).orElseThrow();
        assertEquals(PickupStatus.COLLECTED, collected.getStatus());
        assertNotNull(collected.getCollectedAt());

        // 4. Record Verification
        mockMvc.perform(post("/farmer/pickups/" + testPickup.getId() + "/verify")
                        .with(csrf())
                        .param("verifiedWeight", "8.75")
                        .param("qualityGrade", "GRADE_A")
                        .param("notes", "Excellent moisture balance"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/dashboard"))
                .andExpect(flash().attributeExists("successMessage"));

        PickupRequest verified = pickupRequestRepository.findById(testPickup.getId()).orElseThrow();
        assertEquals(PickupStatus.VERIFIED, verified.getStatus());
        assertNotNull(verified.getVerification());
        assertEquals(new BigDecimal("8.75"), verified.getVerification().getVerifiedWeight());
        assertEquals(QualityGrade.GRADE_A, verified.getVerification().getQualityGrade());
    }

    @Test
    @WithMockUser(username = "farmer@agroloop.com", authorities = {"ROLE_FARMER"})
    @DisplayName("Farmer can decline claimed pickup, resetting it to REQUESTED queue")
    void testFarmerDeclinePickup() throws Exception {
        testPickup.accept(testFarmer);
        pickupRequestRepository.save(testPickup);

        mockMvc.perform(post("/farmer/pickups/" + testPickup.getId() + "/decline")
                        .with(csrf())
                        .param("reason", "Vehicle maintenance conflict"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/dashboard"))
                .andExpect(flash().attributeExists("successMessage"));

        PickupRequest declined = pickupRequestRepository.findById(testPickup.getId()).orElseThrow();
        assertEquals(PickupStatus.REQUESTED, declined.getStatus());
        assertNull(declined.getAssignedFarmer());
        assertEquals("Vehicle maintenance conflict", declined.getDeclineReason());
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household can cancel eligible pickup request")
    void testHouseholdCancelPickup() throws Exception {
        mockMvc.perform(post("/household/pickups/" + testPickup.getId() + "/cancel")
                        .with(csrf())
                        .param("reason", "Composted directly in home garden"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"))
                .andExpect(flash().attributeExists("successMessage"));

        PickupRequest cancelled = pickupRequestRepository.findById(testPickup.getId()).orElseThrow();
        assertEquals(PickupStatus.CANCELLED, cancelled.getStatus());
        assertEquals("Composted directly in home garden", cancelled.getCancellationReason());
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household cannot access farmer pickup action endpoints")
    void testHouseholdCannotClaimPickup() throws Exception {
        mockMvc.perform(post("/farmer/pickups/" + testPickup.getId() + "/claim")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "other@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household cannot cancel another household's pickup request")
    void testHouseholdCannotCancelOtherHouseholdPickup() throws Exception {
        householdRepository.save(new Household("Other Household", "other@agroloop.com", "pass", "999 Oak Ave"));

        mockMvc.perform(post("/household/pickups/" + testPickup.getId() + "/cancel")
                        .with(csrf())
                        .param("reason", "Malicious cancellation attempt"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"))
                .andExpect(flash().attributeExists("errorMessage"));

        PickupRequest unchanged = pickupRequestRepository.findById(testPickup.getId()).orElseThrow();
        assertEquals(PickupStatus.REQUESTED, unchanged.getStatus());
        assertNull(unchanged.getCancellationReason());
    }
}
