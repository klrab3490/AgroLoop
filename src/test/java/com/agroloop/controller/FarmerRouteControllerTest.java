package com.agroloop.controller;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.CollectionRouteRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.WasteSubmissionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("FarmerRouteController Integration Tests — Smart Routes & Polymorphic Matching")
class FarmerRouteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private PickupRequestRepository pickupRequestRepository;

    @Autowired
    private CollectionRouteRepository collectionRouteRepository;

    private Farmer testFarmer;
    private Household testHousehold;
    private PickupRequest testPickup;

    @BeforeEach
    void setUp() {
        tearDown();

        testFarmer = farmerRepository.save(new Farmer(
                "Ramesh Farmer", "ramesh@example.com", "hash", "Green Hills", "Palakkad", "Compost"
        ));
        testFarmer.updateLocationAndCapacity(10.8505, 76.2711, 30.0, new BigDecimal("250.00"));
        testFarmer = farmerRepository.save(testFarmer);

        testHousehold = householdRepository.save(new Household(
                "Ananya", "ananya@example.com", "hash", "123 Eco Way, Palakkad"
        ));

        WasteSubmission sub = wasteSubmissionRepository.save(new WasteSubmission(
                testHousehold, WasteCategory.FOOD_SCRAPS, new BigDecimal("15.00"),
                "123 Eco Way, Palakkad", null, "Fresh scraps", 10.8600, 76.2800
        ));
        testPickup = pickupRequestRepository.save(new PickupRequest(sub));
    }

    @AfterEach
    void tearDown() {
        collectionRouteRepository.deleteAll();
        pickupRequestRepository.deleteAll();
        wasteSubmissionRepository.deleteAll();
        if (testHousehold != null && testHousehold.getId() != null) {
            householdRepository.deleteById(testHousehold.getId());
            testHousehold = null;
        }
        if (testFarmer != null && testFarmer.getId() != null) {
            farmerRepository.deleteById(testFarmer.getId());
            testFarmer = null;
        }
    }

    @Test
    @DisplayName("Unauthenticated request redirects to login")
    void unauthenticatedAccess_shouldRedirectToLogin() throws Exception {
        mockMvc.perform(get("/farmer/routes"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("http://localhost/login"));
    }

    @Test
    @WithMockUser(username = "ananya@example.com", roles = {"HOUSEHOLD"})
    @DisplayName("Household user is denied access to farmer routes")
    void householdAccess_shouldBeForbidden() throws Exception {
        mockMvc.perform(get("/farmer/routes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "ramesh@example.com", roles = {"FARMER"})
    @DisplayName("Farmer accesses routes and matching view successfully")
    void farmerAccess_shouldRenderRoutesPageWithRecommendations() throws Exception {
        mockMvc.perform(get("/farmer/routes"))
                .andExpect(status().isOk())
                .andExpect(view().name("farmer/routes"))
                .andExpect(model().attributeExists("recommendations"))
                .andExpect(model().attributeExists("activeRoutes"))
                .andExpect(model().attribute("selectedStrategy", "COMPOSITE"))
                .andExpect(content().string(containsString("Dynamic Matching &amp; Collection Routes")));
    }

    @Test
    @WithMockUser(username = "ramesh@example.com", roles = {"FARMER"})
    @DisplayName("Farmer updates GPS coordinates and capacity settings")
    void updateSettings_shouldPersistAndRedirect() throws Exception {
        mockMvc.perform(post("/farmer/routes/settings")
                        .with(csrf())
                        .param("latitude", "10.9200")
                        .param("longitude", "76.3500")
                        .param("serviceRadiusKm", "40.0")
                        .param("maxDailyCapacityKg", "300.00"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/routes"));

        Farmer updated = farmerRepository.findById(testFarmer.getId()).orElseThrow();
        assertThat(updated.getLatitude()).isEqualTo(10.9200);
        assertThat(updated.getLongitude()).isEqualTo(76.3500);
        assertThat(updated.getServiceRadiusKm()).isEqualTo(40.0);
        assertThat(updated.getMaxDailyCapacityKg()).isEqualByComparingTo("300.00");
    }

    @Test
    @WithMockUser(username = "ramesh@example.com", roles = {"FARMER"})
    @DisplayName("Farmer generates optimized route from selected pickups")
    void generateRoute_shouldCreateRouteAndRedirect() throws Exception {
        mockMvc.perform(post("/farmer/routes/generate")
                        .with(csrf())
                        .param("pickupIds", testPickup.getId().toString())
                        .param("routeDate", "2026-09-30")
                        .param("notes", "Morning Run"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/routes"));

        assertThat(collectionRouteRepository.count()).isEqualTo(1);
        var route = collectionRouteRepository.findByIdWithDetails(collectionRouteRepository.findAll().get(0).getId()).orElseThrow();
        assertThat(route.getStops()).hasSize(1);
        assertThat(route.getNotes()).isEqualTo("Morning Run");
    }
}
