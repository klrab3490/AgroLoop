package com.agroloop.service;

import com.agroloop.dto.api.v1.response.ReputationSummaryApiResponse;
import com.agroloop.dto.api.v1.response.ReviewApiResponse;
import com.agroloop.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface ReviewService {

    Review submitPickupReview(Long reviewerUserId, Long pickupId, int rating, String comment);

    Review submitOrderReview(Long reviewerUserId, Long orderId, int rating, String comment);

    ReputationSummaryApiResponse getReputationSummary(Long userId);

    Page<ReviewApiResponse> getReviewsForUser(Long userId, Pageable pageable);

    List<ReviewApiResponse> getRecentReviewsForUser(Long userId);

    boolean canReviewPickup(Long userId, Long pickupId);

    boolean canReviewOrder(Long userId, Long orderId);

    Optional<ReviewApiResponse> getExistingPickupReview(Long pickupId, Long userId);

    Optional<ReviewApiResponse> getExistingOrderReview(Long orderId, Long userId);
}
