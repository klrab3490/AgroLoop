package com.agroloop.dto.api.v1.response;

import com.agroloop.model.Review;
import com.agroloop.model.ReviewType;

import java.time.LocalDateTime;

public record ReviewApiResponse(
        Long id,
        Long reviewerId,
        String reviewerName,
        String reviewerRole,
        Long revieweeId,
        String revieweeName,
        String revieweeRole,
        Long pickupId,
        Long orderId,
        ReviewType reviewType,
        int rating,
        String comment,
        LocalDateTime createdAt
) {
    public static ReviewApiResponse from(Review review) {
        if (review == null) {
            return null;
        }

        Long reviewerId = review.getReviewer() != null ? review.getReviewer().getId() : null;
        String reviewerName = review.getReviewer() != null ? review.getReviewer().getName() : null;
        String reviewerRole = (review.getReviewer() != null && review.getReviewer().getRole() != null)
                ? review.getReviewer().getRole().name() : null;

        Long revieweeId = review.getReviewee() != null ? review.getReviewee().getId() : null;
        String revieweeName = review.getReviewee() != null ? review.getReviewee().getName() : null;
        String revieweeRole = (review.getReviewee() != null && review.getReviewee().getRole() != null)
                ? review.getReviewee().getRole().name() : null;

        Long pickupId = review.getPickup() != null ? review.getPickup().getId() : null;
        Long orderId = review.getOrder() != null ? review.getOrder().getId() : null;

        return new ReviewApiResponse(
                review.getId(),
                reviewerId,
                reviewerName,
                reviewerRole,
                revieweeId,
                revieweeName,
                revieweeRole,
                pickupId,
                orderId,
                review.getReviewType(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
