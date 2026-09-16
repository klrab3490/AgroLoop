package com.agroloop.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /login renders login page with demo account hints")
    void loginPageRendersSuccessfully() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("login"))
                .andExpect(content().string(containsString("Welcome Back")))
                .andExpect(content().string(containsString("admin@agroloop.com")))
                .andExpect(content().string(containsString("household@agroloop.com")))
                .andExpect(content().string(containsString("farmer@agroloop.com")));
    }

    @Test
    @DisplayName("POST /login with valid Admin credentials redirects to /admin/dashboard")
    void adminLoginRedirectsToAdminDashboard() throws Exception {
        mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "admin@agroloop.com")
                        .param("password", "admin123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/dashboard"));
    }

    @Test
    @DisplayName("POST /login with valid Household credentials redirects to /household/dashboard")
    void householdLoginRedirectsToHouseholdDashboard() throws Exception {
        mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "household@agroloop.com")
                        .param("password", "household123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"));
    }

    @Test
    @DisplayName("POST /login with valid Farmer credentials redirects to /farmer/dashboard")
    void farmerLoginRedirectsToFarmerDashboard() throws Exception {
        mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "farmer@agroloop.com")
                        .param("password", "farmer123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/dashboard"));
    }

    @Test
    @DisplayName("POST /login with invalid credentials redirects to /login?error")
    void invalidLoginRedirectsToLoginError() throws Exception {
        mockMvc.perform(post("/login")
                        .with(csrf())
                        .param("email", "unknown@agroloop.com")
                        .param("password", "wrongpassword"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?error"));
    }

    @Test
    @DisplayName("Unauthenticated request to protected dashboard redirects to /login")
    void unauthenticatedAccessToDashboardRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household user is forbidden from accessing /admin/dashboard (HTTP 403)")
    void householdUserCannotAccessAdminDashboard() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household user can access /household/dashboard")
    void householdUserCanAccessHouseholdDashboard() throws Exception {
        mockMvc.perform(get("/household/dashboard"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/household"))
                .andExpect(content().string(containsString("Household Dashboard")));
    }
}

