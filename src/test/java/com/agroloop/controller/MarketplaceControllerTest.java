package com.agroloop.controller;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CartItemDto;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderItemRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.service.CartServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("MarketplaceController Integration Tests — Web Routes, Cart & Checkout")
class MarketplaceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private EcoTokenTransactionRepository ecoTokenTransactionRepository;

    private Farmer farmer;
    private Product product;
    private Household household;

    @BeforeEach
    void setUp() {
        tearDown();

        farmer = farmerRepository.save(new Farmer("Farmer John", "john@example.com", "hash", "John Farm", "Kochi", "Farm"));

        product = productRepository.save(new Product(
                farmer, "Fresh Strawberries", "Sweet organic strawberries", ProductCategory.FRESH_FRUITS, "box", new BigDecimal("7.50"), 20, null
        ));

        household = new Household("Alice Member", "alice.member@example.com", "hash", "123 Palm Grove");
        household.addTokens(new BigDecimal("50.00"));
        household = householdRepository.save(household);
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
    }

    @Test
    @DisplayName("GET /marketplace renders public catalog with available products")
    void publicCatalogRendersSuccessfully() throws Exception {
        mockMvc.perform(get("/marketplace"))
                .andExpect(status().isOk())
                .andExpect(view().name("marketplace/index"))
                .andExpect(model().attributeExists("products"))
                .andExpect(model().attributeExists("categories"))
                .andExpect(content().string(containsString("Fresh Strawberries")))
                .andExpect(content().string(containsString("7.50")));
    }

    @Test
    @DisplayName("GET /marketplace/products/{id} renders product detail view")
    void productDetailsRendersSuccessfully() throws Exception {
        mockMvc.perform(get("/marketplace/products/" + product.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("marketplace/details"))
                .andExpect(model().attributeExists("product"))
                .andExpect(content().string(containsString("Fresh Strawberries")))
                .andExpect(content().string(containsString("Farmer John")));
    }

    @Test
    @DisplayName("POST /marketplace/cart/add adds item to session and redirects to /marketplace/cart")
    void addToCartRedirectsToCart() throws Exception {
        mockMvc.perform(post("/marketplace/cart/add")
                        .with(csrf())
                        .param("productId", product.getId().toString())
                        .param("quantity", "2"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/marketplace/cart"));
    }

    @Test
    @DisplayName("GET /marketplace/cart displays shopping cart summary")
    void viewCartRendersSuccessfully() throws Exception {
        mockMvc.perform(get("/marketplace/cart"))
                .andExpect(status().isOk())
                .andExpect(view().name("marketplace/cart"))
                .andExpect(model().attributeExists("cart"));
    }

    @Test
    @WithMockUser(username = "alice.member@example.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("POST /marketplace/checkout executes purchase, redirects to receipt, and clears session cart")
    void checkoutSuccessClearsCart() throws Exception {
        MockHttpSession session = new MockHttpSession();
        CartItemDto item = new CartItemDto(
                product.getId(), product.getName(), product.getPriceInTokens(), product.getUnit(), product.getCategory(), farmer.getName(), null, 2
        );
        CartDto cart = new CartDto(List.of(item));
        session.setAttribute(CartServiceImpl.CART_SESSION_KEY, cart);

        mockMvc.perform(post("/marketplace/checkout")
                        .with(csrf())
                        .session(session)
                        .param("deliveryAddress", "123 Palm Grove, Kochi")
                        .param("notes", "Leave with security"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("/marketplace/orders/*?success=true"));

        // Verify that the session cart was cleared post-commit
        assertNull(session.getAttribute(CartServiceImpl.CART_SESSION_KEY), "Session cart must be cleared after successful checkout");
    }

    @Test
    @WithMockUser(username = "alice.member@example.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("GET /marketplace/orders renders household purchase history")
    void orderHistoryRenders() throws Exception {
        mockMvc.perform(get("/marketplace/orders"))
                .andExpect(status().isOk())
                .andExpect(view().name("marketplace/orders"))
                .andExpect(model().attributeExists("orders"));
    }
}
