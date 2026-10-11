package com.agroloop.security;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("DevAuthenticationFilter Integration Tests")
class DevAuthenticationFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    private Order order;

    @BeforeEach
    void setUp() {
        Household household = householdRepository.findByEmail("household@agroloop.com").orElseGet(() ->
                householdRepository.save(new Household("Default Household", "household@agroloop.com", "hash", "Address"))
        );

        Farmer farmer = farmerRepository.findByEmail("farmer@agroloop.com").orElseGet(() ->
                farmerRepository.save(new Farmer("Default Farmer", "farmer@agroloop.com", "hash", "Farm", "Address", "Bio"))
        );

        Product product = productRepository.save(new Product(
                farmer, "Test Vegetables", "Organic", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("10.00"), 50, null
        ));

        order = new Order(household, "Test Address", "Notes");
        order.addItem(product, 2);
        order = orderRepository.save(order);
    }

    @AfterEach
    void tearDown() {
        if (order != null && order.getId() != null) {
            orderRepository.deleteById(order.getId());
        }
    }

    @Test
    @DisplayName("Dev API Key header (X-API-Key: agroloop-dev-key) successfully updates order status")
    void updateOrderStatus_withDevApiKey_success() throws Exception {
        mockMvc.perform(post("/api/v1/orders/" + order.getId() + "/status")
                        .header("X-API-Key", "agroloop-dev-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PACKED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PACKED"));

        Order updated = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.PACKED, updated.getStatus());
    }

    @Test
    @DisplayName("Dev Bearer token (Authorization: Bearer dev-carrier-token) successfully updates order status")
    void updateOrderStatus_withDevBearerToken_success() throws Exception {
        mockMvc.perform(post("/api/v1/orders/" + order.getId() + "/status")
                        .header("Authorization", "Bearer dev-carrier-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_TRANSIT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_TRANSIT"));

        Order updated = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.IN_TRANSIT, updated.getStatus());
    }

    @Autowired
    private TokenService tokenService;

    @Test
    @DisplayName("Farmer JWT successfully updates order status to PACKED")
    void updateOrderStatus_withFarmerJwt_success() throws Exception {
        Farmer f = farmerRepository.findByEmail("farmer@agroloop.com").orElseThrow();
        String farmerJwt = tokenService.issueAccessToken(f);

        mockMvc.perform(post("/api/v1/orders/" + order.getId() + "/status")
                        .header("Authorization", "Bearer " + farmerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PACKED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PACKED"));
    }

    @Test
    @DisplayName("Farmer JWT successfully updates order status to IN_TRANSIT")
    void updateOrderStatus_withFarmerJwt_inTransit_success() throws Exception {
        Farmer f = farmerRepository.findByEmail("farmer@agroloop.com").orElseThrow();
        String farmerJwt = tokenService.issueAccessToken(f);

        mockMvc.perform(post("/api/v1/orders/" + order.getId() + "/status")
                        .header("Authorization", "Bearer " + farmerJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_TRANSIT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_TRANSIT"));

        Order updated = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.IN_TRANSIT, updated.getStatus());
    }

    @Test
    @DisplayName("Farmer not on order is forbidden from updating order status (403 Forbidden)")
    void updateOrderStatus_otherFarmer_returnsForbidden() throws Exception {
        Farmer otherFarmer = farmerRepository.findByEmail("priya.farmer@agroloop.com").orElseThrow();
        String priyaJwt = tokenService.issueAccessToken(otherFarmer);

        mockMvc.perform(post("/api/v1/orders/" + order.getId() + "/status")
                        .header("Authorization", "Bearer " + priyaJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PACKED\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("Missing auth header rejects request with 401 Unauthorized")
    void updateOrderStatus_unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/orders/" + order.getId() + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PACKED\"}"))
                .andExpect(status().isUnauthorized());
    }
}
