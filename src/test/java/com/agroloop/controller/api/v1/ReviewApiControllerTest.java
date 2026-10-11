package com.agroloop.controller.api.v1;

import com.agroloop.model.ClientType;
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
import com.agroloop.security.TokenService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("ReviewApiController Integration Tests — REST Ratings, Reviews & Reputation")
class ReviewApiControllerTest {

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

    @Autowired
    private TokenService tokenService;

    private Household household;
    private Farmer farmer;
    private PickupRequest pickup;
    private Order order;
    private String householdToken;

    @BeforeEach
    void setUp() {
        household = householdRepository.findByEmail("rev_house@agroloop.com").orElseGet(() -> {
            Household h = new Household("Household Reviewer", "rev_house@agroloop.com", "pass", "100 Green Ave");
            return householdRepository.save(h);
        });

        farmer = farmerRepository.findByEmail("rev_farm@agroloop.com").orElseGet(() -> {
            Farmer f = new Farmer("Farmer Reviewee", "rev_farm@agroloop.com", "pass", "Sun Farm", "200 Agro Rd", "Bio Farm");
            return farmerRepository.save(f);
        });

        WasteSubmission sub = new WasteSubmission(
                household,
                WasteCategory.FOOD_SCRAPS,
                new BigDecimal("8.00"),
                "100 Green Ave",
                null,
                "Kitchen wastes"
        );
        sub = wasteSubmissionRepository.save(sub);

        pickup = new PickupRequest(sub);
        pickup.accept(farmer);
        pickup.schedule(LocalDateTime.now().plusHours(1));
        pickup.markCollected();
        pickup = pickupRequestRepository.save(pickup);

        Product product = new Product(farmer, "Eco Soil", "Rich soil", ProductCategory.COMPOST_AND_SOIL, "kg", new BigDecimal("10.00"), 50, null);
        product = productRepository.save(product);

        order = new Order(household, "100 Green Ave", "Deliver to gate");
        order.addItem(product, 2);
        order.complete();
        order = orderRepository.save(order);

        householdToken = tokenService.createInitialSession(household, "Household Device", ClientType.WEB).accessToken();
        tokenService.createInitialSession(farmer, "Farmer Device", ClientType.WEB);
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
    @DisplayName("POST /api/v1/reviews/pickups/{id} successfully creates pickup review")
    void submitPickupReview_success() throws Exception {
        String requestJson = """
                {
                    "rating": 5,
                    "comment": "Super fast pickup, friendly farmer!"
                }
                """;

        mockMvc.perform(post("/api/v1/reviews/pickups/" + pickup.getId())
                        .header("Authorization", "Bearer " + householdToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating", is(5)))
                .andExpect(jsonPath("$.comment", is("Super fast pickup, friendly farmer!")))
                .andExpect(jsonPath("$.reviewType", is("PICKUP_EXPERIENCE")))
                .andExpect(jsonPath("$.reviewerId", is(household.getId().intValue())))
                .andExpect(jsonPath("$.revieweeId", is(farmer.getId().intValue())));

        // Verify Farmer's reputation is updated
        Farmer updatedFarmer = farmerRepository.findById(farmer.getId()).orElseThrow();
        assertThat(updatedFarmer.getAverageRating()).isEqualTo(5.0);
        assertThat(updatedFarmer.getReviewCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("POST /api/v1/reviews/orders/{id} successfully creates order review")
    void submitOrderReview_success() throws Exception {
        String requestJson = """
                {
                    "rating": 5,
                    "comment": "Outstanding compost quality!"
                }
                """;

        mockMvc.perform(post("/api/v1/reviews/orders/" + order.getId())
                        .header("Authorization", "Bearer " + householdToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating", is(5)))
                .andExpect(jsonPath("$.reviewType", is("COMPOST_QUALITY")))
                .andExpect(jsonPath("$.orderId", is(order.getId().intValue())));
    }

    @Test
    @DisplayName("GET /api/v1/reviews/summary/{userId} returns reputation metrics and trust badge")
    void getReputationSummary_success() throws Exception {
        // Submit review first
        mockMvc.perform(post("/api/v1/reviews/pickups/" + pickup.getId())
                        .header("Authorization", "Bearer " + householdToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 5, \"comment\": \"Great!\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/reviews/summary/" + farmer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId", is(farmer.getId().intValue())))
                .andExpect(jsonPath("$.averageRating", is(5.0)))
                .andExpect(jsonPath("$.reviewCount", is(1)))
                .andExpect(jsonPath("$.fiveStarCount", is(1)));
    }

    @Test
    @DisplayName("GET /api/v1/reviews/eligibility/pickup/{id} checks review eligibility")
    void checkPickupEligibility() throws Exception {
        mockMvc.perform(get("/api/v1/reviews/eligibility/pickup/" + pickup.getId())
                        .header("Authorization", "Bearer " + householdToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canReview", is(true)));
    }
}
