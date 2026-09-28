package com.agroloop.controller;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.repository.ReviewRepository;
import com.agroloop.repository.WasteSubmissionRepository;
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
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
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
@DisplayName("ReviewWebController Integration Tests — Server-Rendered UI Views")
class ReviewWebControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private PickupRequestRepository pickupRequestRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    private Household household;
    private Farmer farmer;
    private PickupRequest pickup;
    private Order order;

    @BeforeEach
    void setUp() {
        household = householdRepository.findByEmail("web_house@agroloop.com").orElseGet(() -> {
            Household h = new Household("Web Household", "web_house@agroloop.com", "pass", "123 Green Rd");
            return householdRepository.save(h);
        });

        farmer = farmerRepository.findByEmail("web_farm@agroloop.com").orElseGet(() -> {
            Farmer f = new Farmer("Web Farmer", "web_farm@agroloop.com", "pass", "Emerald Valley Farm", "345 Farm Rd", "Bio Organic");
            return farmerRepository.save(f);
        });

        WasteSubmission sub = new WasteSubmission(
                household,
                WasteCategory.FOOD_SCRAPS,
                new BigDecimal("6.00"),
                "123 Green Rd",
                null,
                "Scraps"
        );
        sub = wasteSubmissionRepository.save(sub);

        pickup = new PickupRequest(sub);
        pickup.accept(farmer);
        pickup.schedule(LocalDateTime.now().plusHours(1));
        pickup.markCollected();
        pickup = pickupRequestRepository.save(pickup);

        Product product = new Product(farmer, "Web Soil", "Soil", ProductCategory.COMPOST_AND_SOIL, "kg", new BigDecimal("12.00"), 40, null);
        product = productRepository.save(product);

        order = new Order(household, "123 Green Rd", "Leave at porch");
        order.addItem(product, 1);
        order.complete();
        order = orderRepository.save(order);
    }

    @AfterEach
    void tearDown() {
        reviewRepository.deleteAll();
        orderRepository.deleteAll();
        productRepository.deleteAll();
        pickupRequestRepository.deleteAll();
        wasteSubmissionRepository.deleteAll();
    }

    @Test
    @DisplayName("GET /reviews/farmer/{farmerId} renders public farmer reputation profile")
    void getFarmerProfile_rendersPublicProfile() throws Exception {
        mockMvc.perform(get("/reviews/farmer/" + farmer.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("reviews/farmer-profile"))
                .andExpect(model().attributeExists("farmer", "summary", "reviews"))
                .andExpect(content().string(containsString("Emerald Valley Farm")))
                .andExpect(content().string(containsString("Community Reviews")));
    }

    @Test
    @WithMockUser(username = "web_house@agroloop.com", roles = "HOUSEHOLD")
    @DisplayName("GET /reviews/pickup/{pickupId}/new renders review form for eligible household")
    void getNewPickupReviewForm_rendersForm() throws Exception {
        mockMvc.perform(get("/reviews/pickup/" + pickup.getId() + "/new"))
                .andExpect(status().isOk())
                .andExpect(view().name("reviews/submit-review"))
                .andExpect(model().attributeExists("form", "pickup", "isHousehold", "targetType"))
                .andExpect(content().string(containsString("Rate Your Experience")));
    }

    @Test
    @WithMockUser(username = "web_house@agroloop.com", roles = "HOUSEHOLD")
    @DisplayName("POST /reviews/pickup/{pickupId} submits review and redirects to household dashboard")
    void submitPickupReview_submitsAndRedirects() throws Exception {
        mockMvc.perform(post("/reviews/pickup/" + pickup.getId())
                        .with(csrf())
                        .param("rating", "5")
                        .param("comment", "Prompt arrival and friendly collector."))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/household/dashboard"))
                .andExpect(flash().attributeExists("successMessage"));

        Farmer updatedFarmer = farmerRepository.findById(farmer.getId()).orElseThrow();
        assertThat(updatedFarmer.getAverageRating()).isEqualTo(5.0);
        assertThat(updatedFarmer.getReviewCount()).isEqualTo(1);
    }

    @Test
    @WithMockUser(username = "web_house@agroloop.com", roles = "HOUSEHOLD")
    @DisplayName("GET /reviews/order/{orderId}/new renders review form for completed order")
    void getNewOrderReviewForm_rendersForm() throws Exception {
        mockMvc.perform(get("/reviews/order/" + order.getId() + "/new"))
                .andExpect(status().isOk())
                .andExpect(view().name("reviews/submit-review"))
                .andExpect(model().attributeExists("form", "order", "targetType"));
    }

    @Test
    @WithMockUser(username = "web_house@agroloop.com", roles = "HOUSEHOLD")
    @DisplayName("POST /reviews/order/{orderId} submits review and redirects to orders")
    void submitOrderReview_submitsAndRedirects() throws Exception {
        mockMvc.perform(post("/reviews/order/" + order.getId())
                        .with(csrf())
                        .param("rating", "5")
                        .param("comment", "Excellent compost packaging and quality."))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/marketplace/orders"))
                .andExpect(flash().attributeExists("successMessage"));
    }
}
