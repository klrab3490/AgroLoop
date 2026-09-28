package com.agroloop.controller.api.v1;

import com.agroloop.model.Admin;
import com.agroloop.model.ClientType;
import com.agroloop.model.Household;
import com.agroloop.model.User;
import com.agroloop.repository.AdminRepository;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("AdminApiController Integration Tests — Status Mutation, Aliasing & Solvency")
class AdminApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private TokenService tokenService;

    private User adminUser;
    private User householdUser;
    private String adminAccessToken;
    private String householdAccessToken;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.findByEmail("admin@agroloop.com").orElseGet(() -> {
            Admin admin = new Admin("System Administrator", "admin@agroloop.com", "secret");
            return adminRepository.save(admin);
        });

        householdUser = userRepository.findByEmail("household@agroloop.com").orElseGet(() -> {
            Household household = new Household("Alice Green", "household@agroloop.com", "secret", "Green St");
            return householdRepository.save(household);
        });

        // Ensure householdUser is enabled initially
        if (!householdUser.isEnabled()) {
            householdUser.enable();
            userRepository.save(householdUser);
        }

        adminAccessToken = tokenService.createInitialSession(adminUser, "Admin Test Device", ClientType.WEB).accessToken();
        householdAccessToken = tokenService.createInitialSession(householdUser, "Household Test Device", ClientType.WEB).accessToken();
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{id}/status accepts canonical 'enabled' boolean property")
    void setUserStatus_withCanonicalEnabled_updatesStatus() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/" + householdUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(householdUser.getId().intValue())))
                .andExpect(jsonPath("$.enabled", is(false)));

        User reloaded = userRepository.findById(householdUser.getId()).orElseThrow();
        assertFalse(reloaded.isEnabled());

        // Re-enable
        mockMvc.perform(post("/api/v1/admin/users/" + householdUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled", is(true)));

        reloaded = userRepository.findById(householdUser.getId()).orElseThrow();
        assertTrue(reloaded.isEnabled());
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{id}/status accepts backward-compatible 'active' alias")
    void setUserStatus_withAliasActive_updatesStatus() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/" + householdUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(householdUser.getId().intValue())))
                .andExpect(jsonPath("$.enabled", is(false)));

        User reloaded = userRepository.findById(householdUser.getId()).orElseThrow();
        assertFalse(reloaded.isEnabled());

        // Re-enable with active alias
        mockMvc.perform(post("/api/v1/admin/users/" + householdUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled", is(true)));

        reloaded = userRepository.findById(householdUser.getId()).orElseThrow();
        assertTrue(reloaded.isEnabled());
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{id}/status is forbidden for non-admin household user")
    void setUserStatus_asHousehold_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/" + householdUser.getId() + "/status")
                        .header("Authorization", "Bearer " + householdAccessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\": false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/admin/users/{id}/status without token returns 401 Unauthorized")
    void setUserStatus_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/" + householdUser.getId() + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\": false}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/admin/orders returns 200 for admin")
    void listOrders_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/orders")
                        .header("Authorization", "Bearer " + adminAccessToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/v1/admin/solvency returns 200 with double-entry metrics")
    void getSolvency_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/solvency")
                        .header("Authorization", "Bearer " + adminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalHouseholdBalances").exists())
                .andExpect(jsonPath("$.solvent").isBoolean());
    }

    @Test
    @DisplayName("GET /api/v1/admin/storage/status returns 200 with diagnostics for admin")
    void getStorageDiagnostics_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/storage/status")
                        .header("Authorization", "Bearer " + adminAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeProvider").value("LOCAL"))
                .andExpect(jsonPath("$.healthy").value(true))
                .andExpect(jsonPath("$.latencyMs").isNumber());
    }

    @Test
    @DisplayName("GET /api/v1/admin/storage/status returns 403 Forbidden for non-admin")
    void getStorageDiagnostics_asHousehold_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/storage/status")
                        .header("Authorization", "Bearer " + householdAccessToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/v1/admin/storage/status returns 401 Unauthorized when unauthenticated")
    void getStorageDiagnostics_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/storage/status"))
                .andExpect(status().isUnauthorized());
    }
}
