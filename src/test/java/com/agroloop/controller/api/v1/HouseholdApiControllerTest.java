package com.agroloop.controller.api.v1;

import com.agroloop.model.ClientType;
import com.agroloop.model.FarmerApplication;
import com.agroloop.model.Household;
import com.agroloop.model.User;
import com.agroloop.repository.FarmerApplicationRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.security.TokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("HouseholdApiController Integration Tests — Farmer Application Workflow")
class HouseholdApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerApplicationRepository farmerApplicationRepository;

    @Autowired
    private TokenService tokenService;

    private User householdUser;
    private String householdAccessToken;

    @BeforeEach
    void setUp() {
        householdUser = userRepository.findByEmail("household@agroloop.com").orElseGet(() -> {
            Household household = new Household("Alice Green", "household@agroloop.com", "secret", "Green St");
            return householdRepository.save(household);
        });

        // Ensure clean state for farmer applications
        farmerApplicationRepository.deleteAll(
                farmerApplicationRepository.findByUserIdOrderByCreatedAtDesc(householdUser.getId())
        );

        householdAccessToken = tokenService.createInitialSession(householdUser, "Household Mobile App", ClientType.MOBILE).accessToken();
    }

    @Test
    @DisplayName("GET /api/v1/household/farmer-application returns 204 No Content when no application filed")
    void getFarmerApplication_notFound_returns204() throws Exception {
        mockMvc.perform(get("/api/v1/household/farmer-application")
                        .header("Authorization", "Bearer " + householdAccessToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("POST /api/v1/household/farmer-application submits and retrieves application")
    void submitAndGetFarmerApplication_workflow() throws Exception {
        String submitPayload = """
                {
                    "farmName": "Green Pastures Organics",
                    "farmAddress": "44 Rural Route, Sector 9",
                    "notes": "Composting facility with 300kg daily processing capacity"
                }
                """;

        mockMvc.perform(post("/api/v1/household/farmer-application")
                        .header("Authorization", "Bearer " + householdAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submitPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.farmName", is("Green Pastures Organics")))
                .andExpect(jsonPath("$.status", is("PENDING")));

        // Follow up with GET
        mockMvc.perform(get("/api/v1/household/farmer-application")
                        .header("Authorization", "Bearer " + householdAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.farmName", is("Green Pastures Organics")))
                .andExpect(jsonPath("$.status", is("PENDING")));
    }
}
