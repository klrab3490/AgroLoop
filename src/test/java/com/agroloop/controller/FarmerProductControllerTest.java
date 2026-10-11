package com.agroloop.controller;

import com.agroloop.model.Farmer;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.FarmerRepository;
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

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
@DisplayName("FarmerProductController Integration Tests — Farmer Inventory & Ownership Guards")
class FarmerProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private ProductRepository productRepository;

    private Farmer farmerBob;
    private Product bobsProduct;

    @BeforeEach
    void setUp() {
        tearDown();

        farmerBob = farmerRepository.save(new Farmer("Bob Farmer", "bob.farmer@example.com", "hash", "Bob Farm", "Wayanad", "Bio"));
        farmerRepository.save(new Farmer("Charlie Farmer", "charlie.farmer@example.com", "hash", "Charlie Farm", "Idukki", "Agro"));

        bobsProduct = productRepository.save(new Product(
                farmerBob, "Farm Carrots", "Crisp organic carrots", ProductCategory.ORGANIC_VEGETABLES, "kg", new BigDecimal("4.00"), 30, null
        ));
    }

    @AfterEach
    void tearDown() {
        productRepository.deleteAll();

        farmerRepository.findAll().stream()
                .filter(f -> !"farmer@agroloop.com".equals(f.getEmail()))
                .forEach(farmerRepository::delete);
    }

    @Test
    @WithMockUser(username = "bob.farmer@example.com", authorities = {"ROLE_FARMER"})
    @DisplayName("GET /farmer/products lists products for the authenticated farmer")
    void listFarmerProductsSuccess() throws Exception {
        mockMvc.perform(get("/farmer/products"))
                .andExpect(status().isOk())
                .andExpect(view().name("farmer/products"))
                .andExpect(model().attributeExists("products"))
                .andExpect(content().string(containsString("Farm Carrots")))
                .andExpect(content().string(containsString("30 kg")));
    }

    @Test
    @WithMockUser(username = "alice.household@example.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("GET /farmer/products without ROLE_FARMER is forbidden (403)")
    void accessForbiddenForNonFarmerRole() throws Exception {
        mockMvc.perform(get("/farmer/products"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "bob.farmer@example.com", authorities = {"ROLE_FARMER"})
    @DisplayName("POST /farmer/products/new creates new listing and redirects")
    void createProductSuccess() throws Exception {
        mockMvc.perform(post("/farmer/products/new")
                        .with(csrf())
                        .param("name", "Bio Compost 10kg")
                        .param("category", "COMPOST_AND_SOIL")
                        .param("unit", "bag")
                        .param("priceInTokens", "15.00")
                        .param("stock", "20")
                        .param("description", "High quality compost"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/farmer/products"));

        assertEquals(2, productRepository.findAll().size());
    }

    @Test
    @WithMockUser(username = "charlie.farmer@example.com", authorities = {"ROLE_FARMER"})
    @DisplayName("Ownership Guard: Farmer Charlie cannot edit Bob's product (403 Forbidden)")
    void crossFarmerEditDenied() throws Exception {
        mockMvc.perform(get("/farmer/products/" + bobsProduct.getId() + "/edit"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "charlie.farmer@example.com", authorities = {"ROLE_FARMER"})
    @DisplayName("Ownership Guard: Farmer Charlie cannot restock Bob's product (403 Forbidden)")
    void crossFarmerRestockDenied() throws Exception {
        mockMvc.perform(post("/farmer/products/" + bobsProduct.getId() + "/restock")
                        .with(csrf())
                        .param("additionalStock", "10"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "charlie.farmer@example.com", authorities = {"ROLE_FARMER"})
    @DisplayName("Ownership Guard: Farmer Charlie cannot toggle Bob's product status (403 Forbidden)")
    void crossFarmerToggleDenied() throws Exception {
        mockMvc.perform(post("/farmer/products/" + bobsProduct.getId() + "/toggle")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }
}
