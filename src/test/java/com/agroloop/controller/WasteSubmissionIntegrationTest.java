package com.agroloop.controller;

import com.agroloop.model.Household;
import com.agroloop.model.SubmissionStatus;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.WasteSubmissionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Waste Submission Integration Tests (Phase 3 - Step 6)")
class WasteSubmissionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household can successfully submit waste with photo and custom pickup address")
    void testSuccessfulWasteSubmissionWithPhotoAndCustomAddress() throws Exception {
        Household household = householdRepository.findByEmail("household@agroloop.com").orElseThrow();
        long initialCount = wasteSubmissionRepository.countByHouseholdId(household.getId());

        MockMultipartFile photo = new MockMultipartFile(
                "photo",
                "kitchen_waste.jpg",
                "image/jpeg",
                "dummy image content".getBytes()
        );

        mockMvc.perform(multipart("/household/waste/submit")
                        .file(photo)
                        .param("category", "FOOD_SCRAPS")
                        .param("estimatedWeight", "12.50")
                        .param("pickupAddress", "Custom Gate 2, Kochi")
                        .param("notes", "Vegetable and fruit scraps in sealed container")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"))
                .andExpect(flash().attribute("successMessage", containsString("Organic waste batch submitted successfully")));

        List<WasteSubmission> submissions = wasteSubmissionRepository.findByHouseholdIdOrderByCreatedAtDesc(household.getId());
        assertEquals(initialCount + 1, submissions.size());

        WasteSubmission latest = submissions.get(0);
        assertEquals(WasteCategory.FOOD_SCRAPS, latest.getCategory());
        assertEquals(new BigDecimal("12.50"), latest.getEstimatedWeight());
        assertEquals("Custom Gate 2, Kochi", latest.getPickupAddress());
        assertNotNull(latest.getImagePath());
        assertTrue(latest.getImagePath().startsWith("waste/"));
        assertTrue(latest.getImagePath().endsWith(".jpg"));
        assertEquals("Vegetable and fruit scraps in sealed container", latest.getNotes());
        assertEquals(SubmissionStatus.SUBMITTED, latest.getStatus());
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household can submit waste without photo and inherit registered address")
    void testSuccessfulWasteSubmissionWithoutPhotoInheritsAddress() throws Exception {
        Household household = householdRepository.findByEmail("household@agroloop.com").orElseThrow();
        long initialCount = wasteSubmissionRepository.countByHouseholdId(household.getId());

        mockMvc.perform(multipart("/household/waste/submit")
                        .param("category", "GARDEN_WASTE")
                        .param("estimatedWeight", "25.00")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"))
                .andExpect(flash().attribute("successMessage", containsString("Organic waste batch submitted successfully")));

        List<WasteSubmission> submissions = wasteSubmissionRepository.findByHouseholdIdOrderByCreatedAtDesc(household.getId());
        assertEquals(initialCount + 1, submissions.size());

        WasteSubmission latest = submissions.get(0);
        assertEquals(WasteCategory.GARDEN_WASTE, latest.getCategory());
        assertEquals(new BigDecimal("25.00"), latest.getEstimatedWeight());
        assertEquals(household.getAddress(), latest.getPickupAddress(), "Must inherit household registered address when blank");
        assertNull(latest.getImagePath());
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Rejects submission when weight is below minimum limit (< 0.10 kg)")
    void testRejectsWeightBelowMinimum() throws Exception {
        Household household = householdRepository.findByEmail("household@agroloop.com").orElseThrow();
        long initialCount = wasteSubmissionRepository.countByHouseholdId(household.getId());

        mockMvc.perform(multipart("/household/waste/submit")
                        .param("category", "COFFEE_GROUNDS")
                        .param("estimatedWeight", "0.05")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"))
                .andExpect(flash().attributeExists("errorMessage"));

        assertEquals(initialCount, wasteSubmissionRepository.countByHouseholdId(household.getId()));
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Rejects submission when category is missing")
    void testRejectsMissingCategory() throws Exception {
        Household household = householdRepository.findByEmail("household@agroloop.com").orElseThrow();
        long initialCount = wasteSubmissionRepository.countByHouseholdId(household.getId());

        mockMvc.perform(multipart("/household/waste/submit")
                        .param("estimatedWeight", "5.00")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"))
                .andExpect(flash().attributeExists("errorMessage"));

        assertEquals(initialCount, wasteSubmissionRepository.countByHouseholdId(household.getId()));
    }

    @Test
    @WithMockUser(username = "farmer@agroloop.com", authorities = {"ROLE_FARMER"})
    @DisplayName("Farmer user is forbidden from submitting waste (ROLE_HOUSEHOLD required)")
    void testFarmerCannotSubmitWaste() throws Exception {
        mockMvc.perform(multipart("/household/waste/submit")
                        .param("category", "FOOD_SCRAPS")
                        .param("estimatedWeight", "5.00")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household dashboard renders submission history and details")
    void testDashboardRendersSubmissionHistory() throws Exception {
        Household household = householdRepository.findByEmail("household@agroloop.com").orElseThrow();

        WasteSubmission submission = household.submitWaste(
                WasteCategory.AGRICULTURAL_ORGANIC,
                new BigDecimal("80.00"),
                "Agri Zone Plot 5",
                null,
                "Farm crop stalks"
        );
        wasteSubmissionRepository.save(submission);

        mockMvc.perform(get("/household/dashboard"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/household"))
                .andExpect(content().string(containsString("Agricultural Organic Matter")))
                .andExpect(content().string(containsString("80.00")))
                .andExpect(content().string(containsString("Agri Zone Plot 5")))
                .andExpect(content().string(containsString("SUBMITTED")));
    }
}
