package com.agroloop.security;

import com.agroloop.model.*;
import com.agroloop.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("API Authorization & IDOR Access Control Tests (/api/v1/**)")
class ApiAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private PickupRequestRepository pickupRequestRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TokenService tokenService;

    private Household householdA;
    private Household householdB;
    private Farmer farmer;
    private Admin admin;
    private Order orderB;
    private PickupRequest pickupB;

    @BeforeEach
    void setUp() {
        tearDown();

        // Admin
        admin = adminRepository.findByEmail("admin@agroloop.com").orElseGet(() -> {
            Admin a = new Admin("System Admin", "admin@agroloop.com", passwordEncoder.encode("admin123"));
            return adminRepository.save(a);
        });

        // Household A
        householdA = householdRepository.findByEmail("household_a@agroloop.com").orElseGet(() -> {
            Household ha = new Household("Household A", "household_a@agroloop.com", passwordEncoder.encode("Pass123!"), "123 Street A");
            ha.addTokens(new BigDecimal("500.00"));
            return householdRepository.save(ha);
        });

        // Household B
        householdB = householdRepository.findByEmail("household_b@agroloop.com").orElseGet(() -> {
            Household hb = new Household("Household B", "household_b@agroloop.com", passwordEncoder.encode("Pass123!"), "456 Street B");
            hb.addTokens(new BigDecimal("500.00"));
            return householdRepository.save(hb);
        });

        // Farmer
        farmer = farmerRepository.findByEmail("farmer_a@agroloop.com").orElseGet(() -> {
            Farmer f = new Farmer("Farmer Green", "farmer_a@agroloop.com", passwordEncoder.encode("Pass123!"), "Green Farm", "Acres Lane", "Organic");
            return farmerRepository.save(f);
        });

        // Product
        Product product = productRepository.findAll().stream().findFirst().orElseGet(() ->
                productRepository.save(new Product(
                        farmer, "Fresh Carrots", "Organic", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("5.00"), 20, null
                ))
        );

        // Order belonging to Household B
        Order order = new Order(householdB, "456 Street B", "Leave at front gate");
        order.addItem(product, 2);
        orderB = orderRepository.save(order);

        // Waste submission & pickup belonging to Household B
        WasteSubmission submission = householdB.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("8.50"), "456 Street B", null, "Organic kitchen scraps");
        wasteSubmissionRepository.save(submission);

        pickupB = pickupRequestRepository.save(new PickupRequest(submission));
    }

    @AfterEach
    void tearDown() {
        pickupRequestRepository.deleteAll();
        wasteSubmissionRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
    }

    @Test
    @DisplayName("Public endpoints are accessible without authentication (permitAll)")
    void testPublicEndpointsAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/marketplace/products"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/marketplace/categories"))
                .andExpect(status().isOk());

        // Direct binary PUT upload endpoint is accessible without Authorization header (returns 404 for nonexistent id, not 401)
        mockMvc.perform(put("/api/v1/media/upload/non-existent-media-id"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Protected endpoint without Authorization header returns 401 Unauthorized")
    void testProtectedEndpointsRequireAuth() throws Exception {
        mockMvc.perform(get("/api/v1/orders"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/v1/household/balance"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("Role boundary: HOUSEHOLD cannot access Admin or Farmer endpoints (403 Forbidden)")
    void testHouseholdCannotAccessAdminOrFarmerEndpoints() throws Exception {
        String tokenA = tokenService.issueAccessToken(householdA);

        // Cannot access Admin solvency
        mockMvc.perform(get("/api/v1/admin/solvency")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        // Cannot access Farmer available pickups
        mockMvc.perform(get("/api/v1/farmer/pickups/available")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("Role boundary: FARMER cannot access Admin endpoints (403 Forbidden)")
    void testFarmerCannotAccessAdminEndpoints() throws Exception {
        String farmerToken = tokenService.issueAccessToken(farmer);

        mockMvc.perform(get("/api/v1/admin/solvency")
                        .header("Authorization", "Bearer " + farmerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Role boundary: ADMIN can access Admin endpoints (200 OK)")
    void testAdminCanAccessAdminEndpoints() throws Exception {
        String adminToken = tokenService.issueAccessToken(admin);

        mockMvc.perform(get("/api/v1/admin/solvency")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("IDOR Prevention: Household A cannot view Household B's order (403 Forbidden)")
    void testHouseholdCannotViewOtherHouseholdOrder() throws Exception {
        String tokenA = tokenService.issueAccessToken(householdA);

        mockMvc.perform(get("/api/v1/orders/" + orderB.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("IDOR Prevention: Household B can view their own order (200 OK)")
    void testHouseholdCanViewOwnOrder() throws Exception {
        String tokenB = tokenService.issueAccessToken(householdB);

        mockMvc.perform(get("/api/v1/orders/" + orderB.getId())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderB.getId()));
    }

    @Test
    @DisplayName("IDOR Prevention: Household A cannot cancel Household B's order (403 Forbidden)")
    void testHouseholdCannotCancelOtherHouseholdOrder() throws Exception {
        String tokenA = tokenService.issueAccessToken(householdA);

        mockMvc.perform(post("/api/v1/orders/" + orderB.getId() + "/cancel")
                        .header("Authorization", "Bearer " + tokenA)
                        .header("Idempotency-Key", "test-cancel-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"Illegal attempt\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("IDOR Prevention: Household A cannot view Household B's pickup (403 Forbidden)")
    void testHouseholdCannotViewOtherHouseholdPickup() throws Exception {
        String tokenA = tokenService.issueAccessToken(householdA);

        mockMvc.perform(get("/api/v1/pickups/" + pickupB.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Admin has universal read access to orders (200 OK)")
    void testAdminCanViewAnyOrder() throws Exception {
        String adminToken = tokenService.issueAccessToken(admin);

        mockMvc.perform(get("/api/v1/orders/" + orderB.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderB.getId()));
    }
}
