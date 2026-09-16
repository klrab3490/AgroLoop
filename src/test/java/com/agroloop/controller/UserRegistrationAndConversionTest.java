package com.agroloop.controller;

import com.agroloop.model.FarmerApplication;
import com.agroloop.model.FarmerApplicationStatus;
import com.agroloop.model.Role;
import com.agroloop.model.User;
import com.agroloop.repository.FarmerApplicationRepository;
import com.agroloop.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserRegistrationAndConversionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FarmerApplicationRepository farmerApplicationRepository;

    @Test
    @DisplayName("GET /register renders registration page with logo and default Household notice")
    void testRegisterPageRenders() throws Exception {
        mockMvc.perform(get("/register"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(content().string(containsString("Create an Account")))
                .andExpect(content().string(containsString("Household Member")))
                .andExpect(content().string(containsString("logo.png")));
    }

    @Test
    @DisplayName("POST /register creates a new Household account and redirects to login")
    void testSuccessfulRegistrationDefaultsToHousehold() throws Exception {
        mockMvc.perform(post("/register")
                        .with(csrf())
                        .param("name", "David Green")
                        .param("email", "david@agroloop.com")
                        .param("address", "456 Eco Avenue, Thrissur")
                        .param("password", "david123")
                        .param("confirmPassword", "david123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login?registered=true"));

        User created = userRepository.findByEmail("david@agroloop.com").orElse(null);
        assertNotNull(created);
        assertEquals("David Green", created.getName());
        assertEquals(Role.ROLE_HOUSEHOLD, created.getRole());
    }

    @Test
    @DisplayName("POST /register rejects password mismatch")
    void testRegistrationPasswordMismatch() throws Exception {
        mockMvc.perform(post("/register")
                        .with(csrf())
                        .param("name", "David Green")
                        .param("email", "david2@agroloop.com")
                        .param("address", "456 Eco Avenue, Thrissur")
                        .param("password", "david123")
                        .param("confirmPassword", "mismatch123"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(content().string(containsString("Passwords do not match.")));
    }

    @Test
    @DisplayName("POST /register rejects already registered email")
    void testRegistrationDuplicateEmail() throws Exception {
        mockMvc.perform(post("/register")
                        .with(csrf())
                        .param("name", "Alice Duplicate")
                        .param("email", "household@agroloop.com")
                        .param("address", "789 Another St")
                        .param("password", "secret123")
                        .param("confirmPassword", "secret123"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(content().string(containsString("already exists")));
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Household can submit application to become a Farmer")
    void testHouseholdApplyForFarmerRole() throws Exception {
        mockMvc.perform(post("/household/apply-farmer")
                        .with(csrf())
                        .param("farmName", "Alice's Organics")
                        .param("farmAddress", "Plot 7, Agro Sector, Kochi")
                        .param("notes", "Vegetable farming and vermicomposting"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"));

        User user = userRepository.findByEmail("household@agroloop.com").orElseThrow();
        FarmerApplication app = farmerApplicationRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .orElse(null);

        assertNotNull(app);
        assertEquals("Alice's Organics", app.getFarmName());
        assertEquals(FarmerApplicationStatus.PENDING, app.getStatus());
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("Admin can approve pending farmer application and convert role to ROLE_FARMER")
    void testAdminApproveFarmerApplication() throws Exception {
        // First register a new household
        mockMvc.perform(post("/register")
                        .with(csrf())
                        .param("name", "Farmer Applicant")
                        .param("email", "applicant@agroloop.com")
                        .param("address", "Farm Road 1")
                        .param("password", "app123456")
                        .param("confirmPassword", "app123456"))
                .andExpect(status().is3xxRedirection());

        User applicant = userRepository.findByEmail("applicant@agroloop.com").orElseThrow();

        // Create application
        FarmerApplication application = new FarmerApplication(
                applicant,
                "Applicant Agro Farm",
                "Farm Road 1, Wayanad",
                "High capacity composting"
        );
        FarmerApplication savedApp = farmerApplicationRepository.save(application);

        // Admin approves
        mockMvc.perform(post("/admin/applications/" + savedApp.getId() + "/approve")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/dashboard"));

        FarmerApplication refreshedApp = farmerApplicationRepository.findById(savedApp.getId()).orElseThrow();
        assertEquals(FarmerApplicationStatus.APPROVED, refreshedApp.getStatus());

        User convertedUser = userRepository.findByEmail("applicant@agroloop.com").orElseThrow();
        assertEquals(Role.ROLE_FARMER, convertedUser.getRole());
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("Non-admin user cannot approve farmer applications (Forbidden)")
    void testNonAdminCannotApproveApplications() throws Exception {
        mockMvc.perform(post("/admin/applications/1/approve")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }
}
