package com.agroloop.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"agroloop.demo-mode=false"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("AdminController Production Mode Integration Tests — Anti-Leak Credential Verification")
class AdminControllerProductionModeTest {

    @Autowired
    private MockMvc mockMvc;

    private static final List<String> FORBIDDEN_SECRETS_AND_PROPERTIES = List.of(
            "demoCredentials",
            "adminPassword",
            "householdPassword",
            "farmerPassword",
            "admin123",
            "household123",
            "farmer123"
    );

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("GET /admin/dashboard in production (demoMode=false) guarantees zero credential secrets in rendered HTML")
    void adminDashboard_demoModeFalse_comprehensiveLeakCheck() throws Exception {
        MvcResult result = mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().isOk())
                .andExpect(model().attribute("demoMode", false))
                .andExpect(model().attributeDoesNotExist("demoCredentials"))
                .andReturn();

        String html = result.getResponse().getContentAsString();

        for (String forbidden : FORBIDDEN_SECRETS_AND_PROPERTIES) {
            assertFalse(html.contains(forbidden),
                    "Rendered HTML on /admin/dashboard must NOT contain secret or property: " + forbidden);
        }
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("GET /admin/users in production (demoMode=false) guarantees zero credential secrets in rendered HTML")
    void adminUsers_demoModeFalse_comprehensiveLeakCheck() throws Exception {
        MvcResult result = mockMvc.perform(get("/admin/users"))
                .andExpect(status().isOk())
                .andExpect(model().attribute("demoMode", false))
                .andExpect(model().attributeDoesNotExist("demoCredentials"))
                .andReturn();

        String html = result.getResponse().getContentAsString();

        for (String forbidden : FORBIDDEN_SECRETS_AND_PROPERTIES) {
            assertFalse(html.contains(forbidden),
                    "Rendered HTML on /admin/users must NOT contain secret or property: " + forbidden);
        }
    }
}
