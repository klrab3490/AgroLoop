package com.agroloop.controller;

import com.agroloop.model.Admin;
import com.agroloop.model.DisputeResolution;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.model.TransactionDirection;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderItemRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.repository.UserRepository;
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

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.flash;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("AdminController Security & Web Layer Integration Tests")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private EcoTokenTransactionRepository ecoTokenTransactionRepository;

    private Admin admin;
    private Household household;
    private Farmer farmer;
    private Order order;

    @BeforeEach
    void setUp() {
        tearDown();

        admin = adminRepository.findByEmail("admin@agroloop.com").orElseGet(() ->
                adminRepository.save(new Admin("Admin User", "admin@agroloop.com", "hash")));

        household = new Household("Household User", "household.test@example.com", "hash", "123 Way");
        household.addTokens(new BigDecimal("100.00"));
        household = householdRepository.save(household);

        farmer = farmerRepository.save(new Farmer("Farmer User", "farmer.test@example.com", "hash", "Farm Test", "Kochi", "Compost"));

        Product product = productRepository.save(new Product(
                farmer, "Test Vegetables", "Fresh", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("10.00"), 20, null
        ));

        order = new Order(household, "123 Way", "Leave at door");
        order.addItem(product, 2);
        order = orderRepository.save(order);
    }

    @AfterEach
    void tearDown() {
        ecoTokenTransactionRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        productRepository.deleteAll();

        householdRepository.findAll().stream()
                .filter(h -> !"household@agroloop.com".equals(h.getEmail()))
                .forEach(householdRepository::delete);

        farmerRepository.findAll().stream()
                .filter(f -> !"farmer@agroloop.com".equals(f.getEmail()))
                .forEach(farmerRepository::delete);

        adminRepository.findAll().stream()
                .filter(a -> !"admin@agroloop.com".equals(a.getEmail()))
                .forEach(adminRepository::delete);
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("GET /admin/dashboard returns 200 with solvency metrics and platform totals")
    void adminDashboard_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/admin"))
                .andExpect(model().attributeExists("totalUsers", "totalHouseholds", "totalFarmers", "solvencyMetrics"))
                .andExpect(content().string(containsString("Tier-2 EcoToken Solvency Invariant")));
    }

    @Test
    @WithMockUser(username = "household.test@example.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("GET /admin/dashboard returns 403 Forbidden for non-admin household")
    void adminDashboard_asHousehold_returns403() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /admin/dashboard redirects unauthenticated visitor to login")
    void adminDashboard_unauthenticated_redirectsToLogin() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("http://localhost/login"));
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("GET /admin/users lists all users across platform")
    void listUsers_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/admin/users"))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/users"))
                .andExpect(model().attributeExists("users", "directions"))
                .andExpect(content().string(containsString("User Management")));
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("POST /admin/users/{id}/disable blocks self-disable and sets error flash")
    void disableUser_selfDisable_showsFlashError() throws Exception {
        mockMvc.perform(post("/admin/users/" + admin.getId() + "/disable")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/users"))
                .andExpect(flash().attributeExists("errorMessage"));

        assertTrue(userRepository.findById(admin.getId()).orElseThrow().isEnabled());
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("POST /admin/users/{id}/disable successfully disables household user")
    void disableUser_household_success() throws Exception {
        mockMvc.perform(post("/admin/users/" + household.getId() + "/disable")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/users"))
                .andExpect(flash().attributeExists("successMessage"));

        assertFalse(userRepository.findById(household.getId()).orElseThrow().isEnabled());
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("POST /admin/households/{id}/adjust-tokens adjusts balance and redirects")
    void adjustTokens_success() throws Exception {
        mockMvc.perform(post("/admin/households/" + household.getId() + "/adjust-tokens")
                        .param("amount", "25.00")
                        .param("direction", TransactionDirection.CREDIT.name())
                        .param("reason", "Community bonus")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/users"))
                .andExpect(flash().attributeExists("successMessage"));

        Household reloaded = householdRepository.findById(household.getId()).orElseThrow();
        // 100 + 25 = 125
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("125.00"), reloaded.getTokenBalance());
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("GET /admin/orders renders order list with status filter")
    void listOrders_success() throws Exception {
        mockMvc.perform(get("/admin/orders"))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/orders"))
                .andExpect(model().attributeExists("orders", "statuses", "disputeResolutions"))
                .andExpect(content().string(containsString("Marketplace Orders")));
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("GET /admin/ledger renders platform audit trail and pagination")
    void viewLedger_success() throws Exception {
        mockMvc.perform(get("/admin/ledger"))
                .andExpect(status().isOk())
                .andExpect(view().name("admin/ledger"))
                .andExpect(model().attributeExists("ledgerPage", "solvencyMetrics"))
                .andExpect(content().string(containsString("Global EcoToken Ledger")));
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("GET on state-mutating endpoints is rejected with 405 Method Not Allowed")
    void adminDashboard_mutations_rejectGet() throws Exception {
        mockMvc.perform(get("/admin/users/" + household.getId() + "/enable"))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/admin/users/" + household.getId() + "/disable"))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(get("/admin/households/" + household.getId() + "/adjust-tokens"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("POST mutations without CSRF token are blocked with 403 Forbidden")
    void adminDashboard_csrfProtection() throws Exception {
        mockMvc.perform(post("/admin/users/" + household.getId() + "/disable"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/admin/users/" + household.getId() + "/enable"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/admin/households/" + household.getId() + "/adjust-tokens")
                        .param("amount", "10.00")
                        .param("direction", TransactionDirection.CREDIT.name())
                        .param("reason", "Test without CSRF"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("In demo mode (default), GET /admin/dashboard supplies demoCredentials and renders demo secrets")
    void adminDashboard_demoModeTrue_showsDemoCredentials() throws Exception {
        mockMvc.perform(get("/admin/dashboard"))
                .andExpect(status().isOk())
                .andExpect(model().attribute("demoMode", true))
                .andExpect(model().attributeExists("demoCredentials"))
                .andExpect(content().string(containsString("Development / Demo Credentials")))
                .andExpect(content().string(containsString("admin123")));
    }

    @Test
    @WithMockUser(username = "admin@agroloop.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("POST /admin/users/{id}/disable with custom redirect URL redirects back to specified path")
    void adminDashboard_mutation_withRedirect_redirectsToSpecifiedUrl() throws Exception {
        mockMvc.perform(post("/admin/users/" + household.getId() + "/disable")
                        .param("redirect", "/admin/dashboard")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin/dashboard"))
                .andExpect(flash().attributeExists("successMessage"));
    }
}
