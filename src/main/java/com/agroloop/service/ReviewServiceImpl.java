package com.agroloop.service;

import com.agroloop.dto.api.v1.response.ReputationSummaryApiResponse;
import com.agroloop.dto.api.v1.response.ReviewApiResponse;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.PickupStatus;
import com.agroloop.model.Review;
import com.agroloop.model.ReviewType;
import com.agroloop.model.User;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.ReviewRepository;
import com.agroloop.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class ReviewServiceImpl implements ReviewService {

    private static final Logger logger = LoggerFactory.getLogger(ReviewServiceImpl.class);

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final FarmerRepository farmerRepository;
    private final HouseholdRepository householdRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final OrderRepository orderRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public ReviewServiceImpl(
            ReviewRepository reviewRepository,
            UserRepository userRepository,
            FarmerRepository farmerRepository,
            HouseholdRepository householdRepository,
            PickupRequestRepository pickupRequestRepository,
            OrderRepository orderRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher
    ) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.farmerRepository = farmerRepository;
        this.householdRepository = householdRepository;
        this.pickupRequestRepository = pickupRequestRepository;
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public Review submitPickupReview(Long reviewerUserId, Long pickupId, int rating, String comment) {
        Objects.requireNonNull(reviewerUserId, "Reviewer ID must not be null");
        Objects.requireNonNull(pickupId, "Pickup ID must not be null");

        PickupRequest pickup = pickupRequestRepository.findById(pickupId)
                .orElseThrow(() -> new IllegalArgumentException("Pickup request not found: " + pickupId));

        if (pickup.getStatus() != PickupStatus.COLLECTED && pickup.getStatus() != PickupStatus.VERIFIED) {
            throw new IllegalStateException("Reviews are only permitted for COLLECTED or VERIFIED pickups");
        }

        Household household = pickup.getWasteSubmission().getHousehold();
        Farmer farmer = pickup.getAssignedFarmer();

        if (farmer == null) {
            throw new IllegalStateException("Pickup has no assigned farmer to review");
        }

        User reviewer;
        User reviewee;

        if (reviewerUserId.equals(household.getId())) {
            reviewer = household;
            reviewee = farmer;
        } else if (reviewerUserId.equals(farmer.getId())) {
            reviewer = farmer;
            reviewee = household;
        } else {
            throw new IllegalArgumentException("User " + reviewerUserId + " is not a participant in pickup " + pickupId);
        }

        if (reviewRepository.existsByPickupIdAndReviewerId(pickupId, reviewerUserId)) {
            throw new IllegalStateException("You have already submitted a review for pickup #" + pickupId);
        }

        Review review = new Review(
                reviewer,
                reviewee,
                ReviewType.PICKUP_EXPERIENCE,
                rating,
                comment,
                pickup,
                null
        );

        Review savedReview = reviewRepository.save(review);
        updateUserReputation(reviewee);

        try {
            eventPublisher.publishEvent(new com.agroloop.event.NotificationEvents.ReviewReceivedEvent(
                    savedReview.getId(),
                    reviewer.getId(),
                    reviewer.getName(),
                    reviewee.getId(),
                    rating,
                    review.getReviewType().getDisplayName()
            ));
        } catch (Exception ex) {
            logger.warn("Failed to publish ReviewReceivedEvent: {}", ex.getMessage());
        }

        logger.info("Saved pickup review id={} from reviewer={} to reviewee={} rating={}",
                savedReview.getId(), reviewer.getId(), reviewee.getId(), rating);
        return savedReview;
    }

    @Override
    @Transactional
    public Review submitOrderReview(Long reviewerUserId, Long orderId, int rating, String comment) {
        Objects.requireNonNull(reviewerUserId, "Reviewer ID must not be null");
        Objects.requireNonNull(orderId, "Order ID must not be null");

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new IllegalStateException("Reviews are only permitted for COMPLETED orders");
        }

        if (!reviewerUserId.equals(order.getHousehold().getId())) {
            throw new IllegalArgumentException("Only the purchasing household can review an order");
        }

        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new IllegalStateException("Order contains no line items to review");
        }

        Long farmerId = order.getItems().get(0).getFarmerId();
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new IllegalArgumentException("Seller farmer not found with ID: " + farmerId));

        if (reviewRepository.existsByOrderIdAndReviewerId(orderId, reviewerUserId)) {
            throw new IllegalStateException("You have already submitted a review for order #" + orderId);
        }

        Review review = new Review(
                order.getHousehold(),
                farmer,
                ReviewType.COMPOST_QUALITY,
                rating,
                comment,
                null,
                order
        );

        Review savedReview = reviewRepository.save(review);
        updateUserReputation(farmer);

        try {
            eventPublisher.publishEvent(new com.agroloop.event.NotificationEvents.ReviewReceivedEvent(
                    savedReview.getId(),
                    order.getHousehold().getId(),
                    order.getHousehold().getName(),
                    farmer.getId(),
                    rating,
                    review.getReviewType().getDisplayName()
            ));
        } catch (Exception ex) {
            logger.warn("Failed to publish ReviewReceivedEvent: {}", ex.getMessage());
        }

        logger.info("Saved order review id={} from reviewer={} to farmer={} rating={}",
                savedReview.getId(), reviewerUserId, farmerId, rating);
        return savedReview;
    }

    private void updateUserReputation(User user) {
        Double avgRating = reviewRepository.calculateAverageRatingByRevieweeId(user.getId());
        long count = reviewRepository.countByRevieweeId(user.getId());
        double rounded = avgRating != null ? Math.round(avgRating * 100.0) / 100.0 : 0.0;

        if (user instanceof Farmer || farmerRepository.existsById(user.getId())) {
            farmerRepository.findById(user.getId()).ifPresent(f -> {
                f.updateReputation(rounded, (int) count);
                farmerRepository.save(f);
            });
        } else if (user instanceof Household || householdRepository.existsById(user.getId())) {
            householdRepository.findById(user.getId()).ifPresent(h -> {
                h.updateReputation(rounded, (int) count);
                householdRepository.save(h);
            });
        }
    }

    @Override
    public ReputationSummaryApiResponse getReputationSummary(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Double avg = reviewRepository.calculateAverageRatingByRevieweeId(userId);
        long count = reviewRepository.countByRevieweeId(userId);
        double roundedAvg = avg != null ? Math.round(avg * 100.0) / 100.0 : 0.0;

        List<Object[]> stars = reviewRepository.countRatingsByStar(userId);
        Map<Integer, Long> starCounts = new HashMap<>();
        for (Object[] row : stars) {
            int star = ((Number) row[0]).intValue();
            long c = ((Number) row[1]).longValue();
            starCounts.put(star, c);
        }

        String role = user.getRole() != null ? user.getRole().name() : "USER";
        String trustBadge = ReputationSummaryApiResponse.computeTrustBadge(roundedAvg, count);

        return new ReputationSummaryApiResponse(
                user.getId(),
                user.getName(),
                role,
                roundedAvg,
                count,
                starCounts.getOrDefault(5, 0L),
                starCounts.getOrDefault(4, 0L),
                starCounts.getOrDefault(3, 0L),
                starCounts.getOrDefault(2, 0L),
                starCounts.getOrDefault(1, 0L),
                trustBadge
        );
    }

    @Override
    public Page<ReviewApiResponse> getReviewsForUser(Long userId, Pageable pageable) {
        return reviewRepository.findByRevieweeIdOrderByCreatedAtDesc(userId, pageable)
                .map(ReviewApiResponse::from);
    }

    @Override
    public List<ReviewApiResponse> getRecentReviewsForUser(Long userId) {
        Page<Review> page = reviewRepository.findByRevieweeIdOrderByCreatedAtDesc(
                userId, PageRequest.of(0, 10));
        return page.getContent().stream().map(ReviewApiResponse::from).toList();
    }

    @Override
    public boolean canReviewPickup(Long userId, Long pickupId) {
        if (userId == null || pickupId == null) {
            return false;
        }
        Optional<PickupRequest> pickupOpt = pickupRequestRepository.findById(pickupId);
        if (pickupOpt.isEmpty()) {
            return false;
        }
        PickupRequest pickup = pickupOpt.get();
        if (pickup.getStatus() != PickupStatus.COLLECTED && pickup.getStatus() != PickupStatus.VERIFIED) {
            return false;
        }
        Household household = pickup.getWasteSubmission().getHousehold();
        Farmer farmer = pickup.getAssignedFarmer();
        if (household == null || farmer == null) {
            return false;
        }
        boolean isParticipant = userId.equals(household.getId()) || userId.equals(farmer.getId());
        if (!isParticipant) {
            return false;
        }
        return !reviewRepository.existsByPickupIdAndReviewerId(pickupId, userId);
    }

    @Override
    public boolean canReviewOrder(Long userId, Long orderId) {
        if (userId == null || orderId == null) {
            return false;
        }
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return false;
        }
        Order order = orderOpt.get();
        if (order.getStatus() != OrderStatus.COMPLETED) {
            return false;
        }
        if (order.getHousehold() == null || !userId.equals(order.getHousehold().getId())) {
            return false;
        }
        return !reviewRepository.existsByOrderIdAndReviewerId(orderId, userId);
    }

    @Override
    public Optional<ReviewApiResponse> getExistingPickupReview(Long pickupId, Long userId) {
        return reviewRepository.findByPickupIdAndReviewerId(pickupId, userId)
                .map(ReviewApiResponse::from);
    }

    @Override
    public Optional<ReviewApiResponse> getExistingOrderReview(Long orderId, Long userId) {
        return reviewRepository.findByOrderIdAndReviewerId(orderId, userId)
                .map(ReviewApiResponse::from);
    }
}
