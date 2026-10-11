package com.agroloop.service;

import com.agroloop.dto.api.v1.response.ReputationSummaryApiResponse;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.model.Review;
import com.agroloop.model.ReviewType;
import com.agroloop.model.User;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.ReviewRepository;
import com.agroloop.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReviewService Unit Tests")
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FarmerRepository farmerRepository;

    @Mock
    private HouseholdRepository householdRepository;

    @Mock
    private PickupRequestRepository pickupRequestRepository;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private ReviewServiceImpl reviewService;

    private Household household;
    private Farmer farmer;
    private PickupRequest pickupRequest;

    @BeforeEach
    void setUp() throws Exception {
        household = new Household("Alice", "alice@example.com", "hash", "123 Green Way");
        farmer = new Farmer("Bob", "bob@example.com", "hash", "Green Acres", "456 Farm Road", "Organic");

        var idField = User.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(household, 10L);
        idField.set(farmer, 20L);

        WasteSubmission submission = new WasteSubmission(
                household,
                WasteCategory.FOOD_SCRAPS,
                new BigDecimal("12.50"),
                "123 Green Way",
                null,
                "Kitchen organics"
        );

        pickupRequest = new PickupRequest(submission);
        pickupRequest.accept(farmer);
        pickupRequest.schedule(java.time.LocalDateTime.now().plusHours(2));
        pickupRequest.markCollected(); // Now status is COLLECTED
    }

    @Test
    @DisplayName("Household can review Farmer upon completed pickup collection")
    void shouldSubmitPickupReviewFromHouseholdToFarmer() {
        when(pickupRequestRepository.findById(1L)).thenReturn(Optional.of(pickupRequest));
        when(reviewRepository.existsByPickupIdAndReviewerId(1L, 10L)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviewRepository.calculateAverageRatingByRevieweeId(20L)).thenReturn(4.8);
        when(reviewRepository.countByRevieweeId(20L)).thenReturn(5L);
        when(farmerRepository.findById(20L)).thenReturn(Optional.of(farmer));

        Review review = reviewService.submitPickupReview(10L, 1L, 5, "Timely pickup and polite communication!");

        assertThat(review).isNotNull();
        assertThat(review.getReviewer().getId()).isEqualTo(10L);
        assertThat(review.getReviewee().getId()).isEqualTo(20L);
        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getReviewType()).isEqualTo(ReviewType.PICKUP_EXPERIENCE);

        verify(reviewRepository).save(any(Review.class));
        verify(farmerRepository).save(farmer);
        assertThat(farmer.getAverageRating()).isEqualTo(4.8);
        assertThat(farmer.getReviewCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("Farmer can review Household upon completed pickup collection")
    void shouldSubmitPickupReviewFromFarmerToHousehold() {
        when(pickupRequestRepository.findById(1L)).thenReturn(Optional.of(pickupRequest));
        when(reviewRepository.existsByPickupIdAndReviewerId(1L, 20L)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviewRepository.calculateAverageRatingByRevieweeId(10L)).thenReturn(5.0);
        when(reviewRepository.countByRevieweeId(10L)).thenReturn(3L);
        when(householdRepository.findById(10L)).thenReturn(Optional.of(household));

        Review review = reviewService.submitPickupReview(20L, 1L, 5, "Perfect sorting, zero contamination!");

        assertThat(review).isNotNull();
        assertThat(review.getReviewer().getId()).isEqualTo(20L);
        assertThat(review.getReviewee().getId()).isEqualTo(10L);
        assertThat(review.getRating()).isEqualTo(5);
        verify(householdRepository).save(household);
        assertThat(household.getAverageRating()).isEqualTo(5.0);
        assertThat(household.getReviewCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("Should reject review when pickup is not collected or verified")
    void shouldRejectWhenPickupNotCompleted() {
        // Create fresh requested pickup
        WasteSubmission submission = new WasteSubmission(household, WasteCategory.FOOD_SCRAPS, BigDecimal.TEN, "Addr", null, null);
        PickupRequest pendingPickup = new PickupRequest(submission);

        when(pickupRequestRepository.findById(99L)).thenReturn(Optional.of(pendingPickup));

        assertThatThrownBy(() -> reviewService.submitPickupReview(10L, 99L, 5, "Too early"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("COLLECTED or VERIFIED");
    }

    @Test
    @DisplayName("Should reject review when user is not a participant in pickup")
    void shouldRejectNonParticipantReview() {
        when(pickupRequestRepository.findById(1L)).thenReturn(Optional.of(pickupRequest));

        assertThatThrownBy(() -> reviewService.submitPickupReview(999L, 1L, 5, "I am an outsider"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a participant");
    }

    @Test
    @DisplayName("Should reject duplicate review for same pickup by same user")
    void shouldRejectDuplicateReview() {
        when(pickupRequestRepository.findById(1L)).thenReturn(Optional.of(pickupRequest));
        when(reviewRepository.existsByPickupIdAndReviewerId(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> reviewService.submitPickupReview(10L, 1L, 5, "Second review"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already submitted a review");
    }

    @Test
    @DisplayName("Should submit Order review and update seller Farmer reputation")
    void shouldSubmitOrderReview() throws Exception {
        Product product = new Product(farmer, "Organic Compost", "Rich compost", ProductCategory.COMPOST_AND_SOIL, "kg", new BigDecimal("15.00"), 100, null);
        Order order = new Order(household, "123 Street", "Leave at front door");

        var orderIdField = Order.class.getDeclaredField("id");
        orderIdField.setAccessible(true);
        orderIdField.set(order, 50L);

        order.addItem(product, 2);
        order.complete(); // OrderStatus.COMPLETED

        when(orderRepository.findById(50L)).thenReturn(Optional.of(order));
        when(farmerRepository.findById(20L)).thenReturn(Optional.of(farmer));
        when(reviewRepository.existsByOrderIdAndReviewerId(50L, 10L)).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviewRepository.calculateAverageRatingByRevieweeId(20L)).thenReturn(4.9);
        when(reviewRepository.countByRevieweeId(20L)).thenReturn(8L);

        Review review = reviewService.submitOrderReview(10L, 50L, 5, "High nutrient density compost, plants love it!");

        assertThat(review).isNotNull();
        assertThat(review.getReviewType()).isEqualTo(ReviewType.COMPOST_QUALITY);
        assertThat(review.getRating()).isEqualTo(5);
        verify(farmerRepository).save(farmer);
        assertThat(farmer.getAverageRating()).isEqualTo(4.9);
    }

    @Test
    @DisplayName("Should compute reputation summary with star breakdown and badges")
    void shouldComputeReputationSummary() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(farmer));
        when(reviewRepository.calculateAverageRatingByRevieweeId(20L)).thenReturn(4.85);
        when(reviewRepository.countByRevieweeId(20L)).thenReturn(12L);

        List<Object[]> stars = new ArrayList<>();
        stars.add(new Object[]{5, 10L});
        stars.add(new Object[]{4, 2L});
        when(reviewRepository.countRatingsByStar(20L)).thenReturn(stars);

        ReputationSummaryApiResponse summary = reviewService.getReputationSummary(20L);

        assertThat(summary).isNotNull();
        assertThat(summary.averageRating()).isEqualTo(4.85);
        assertThat(summary.reviewCount()).isEqualTo(12L);
        assertThat(summary.fiveStarCount()).isEqualTo(10L);
        assertThat(summary.fourStarCount()).isEqualTo(2L);
        assertThat(summary.threeStarCount()).isEqualTo(0L);
        assertThat(summary.trustBadge()).isEqualTo("ELITE_PARTNER");
    }

    @Test
    @DisplayName("Should accurately evaluate eligibility for reviewing pickup")
    void shouldEvaluatePickupEligibility() {
        when(pickupRequestRepository.findById(1L)).thenReturn(Optional.of(pickupRequest));
        when(reviewRepository.existsByPickupIdAndReviewerId(1L, 10L)).thenReturn(false);

        boolean eligible = reviewService.canReviewPickup(10L, 1L);
        assertThat(eligible).isTrue();

        // Already reviewed
        when(reviewRepository.existsByPickupIdAndReviewerId(1L, 10L)).thenReturn(true);
        boolean notEligible = reviewService.canReviewPickup(10L, 1L);
        assertThat(notEligible).isFalse();
    }
}
