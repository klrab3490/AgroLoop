package com.agroloop.controller;

import com.agroloop.model.Admin;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderItemRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.flash;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Marketplace & Farmer Order Lifecycle Web Security Integration Tests")
class MarketplaceOrderLifecycleSecurityTest {

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
    private EcoTokenTransactionRepository ecoTokenTransactionRepository;

    private Household household;
    private Farmer farmer;
    private Product product;
    private Order order;

    @BeforeEach
    void setUp() {
        tearDown();

        household = new Household("Household Buyer", "buyer@example.com", "hash", "123 Way");
        household.addTokens(new BigDecimal("100.00"));
        household = householdRepository.save(household);

        farmer = farmerRepository.save(new Farmer("Farmer Vendor", "vendor@example.com", "hash", "Vendor Farm", "Kochi", "Farm"));

        product = productRepository.save(new Product(
                farmer, "Fresh Carrots", "Organic", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("5.00"), 20, null
        ));

        order = new Order(household, "123 Way", "Leave at porch");
        order.addItem(product, 2);
        order = orderRepository.save(order);
    }

    @AfterEach
    void tearDown() {
        ecoTokenTransactionRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        productRepository.deleteAll();

        householdRepository.findByEmail("buyer@example.com").ifPresent(householdRepository::delete);
        farmerRepository.findByEmail("vendor@example.com").ifPresent(farmerRepository::delete);
    }

    @Test
    @WithMockUser(username = "buyer@example.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("POST /marketplace/orders/{id}/dispute files dispute by household buyer")
    void disputeOrder_asHousehold_success() throws Exception {
        mockMvc.perform(post("/marketplace/orders/" + order.getId() + "/dispute")
                        .param("disputeReason", "Items arrived crushed")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/marketplace/orders/" + order.getId()))
                .andExpect(flash().attributeExists("successMessage"));

        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.DISPUTED, reloaded.getStatus());
        assertEquals("Items arrived crushed", reloaded.getDisputeReason());
    }

    @Test
    @WithMockUser(username = "vendor@example.com", authorities = {"ROLE_FARMER"})
    @DisplayName("POST /farmer/products/orders/{id}/dispute files dispute by vendor farmer")
    void disputeOrder_asFarmer_success() throws Exception {
        mockMvc.perform(post("/farmer/products/orders/" + order.getId() + "/dispute")
                        .param("disputeReason", "Delivery refusal by household")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/products/orders"))
                .andExpect(flash().attributeExists("successMessage"));

        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.DISPUTED, reloaded.getStatus());
        assertEquals("Delivery refusal by household", reloaded.getDisputeReason());
    }

    @Test
    @WithMockUser(username = "stranger@example.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("POST /marketplace/orders/{id}/dispute by non-owning household sets flash error")
    void disputeOrder_unauthorizedHousehold_setsFlashError() throws Exception {
        mockMvc.perform(post("/marketplace/orders/" + order.getId() + "/dispute")
                        .param("disputeReason", "Unauthorized claim")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/marketplace/orders/" + order.getId()))
                .andExpect(flash().attributeExists("errorMessage"));

        Order reloaded = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.PLACED, reloaded.getStatus());
    }
}
