package com.agroloop.controller.api.v1;

import com.agroloop.dto.api.v1.request.SubmitReviewApiRequest;
import com.agroloop.dto.api.v1.response.ReputationSummaryApiResponse;
import com.agroloop.dto.api.v1.response.ReviewApiResponse;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.Review;
import com.agroloop.security.authorization.PickupSecurityEvaluator;
import com.agroloop.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewApiController {

    private final ReviewService reviewService;
    private final PickupSecurityEvaluator pickupSecurityEvaluator;

    public ReviewApiController(
            ReviewService reviewService,
            PickupSecurityEvaluator pickupSecurityEvaluator
    ) {
        this.reviewService = reviewService;
        this.pickupSecurityEvaluator = pickupSecurityEvaluator;
    }

    @PostMapping("/pickups/{pickupId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewApiResponse> submitPickupReview(
            @PathVariable Long pickupId,
            @Valid @RequestBody SubmitReviewApiRequest request,
            Authentication auth
    ) {
        Long userId = extractUserId(auth);
        Review review = reviewService.submitPickupReview(
                userId,
                pickupId,
                request.getRating(),
                request.getComment()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ReviewApiResponse.from(review));
    }

    @PostMapping("/orders/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewApiResponse> submitOrderReview(
            @PathVariable Long orderId,
            @Valid @RequestBody SubmitReviewApiRequest request,
            Authentication auth
    ) {
        Long userId = extractUserId(auth);
        Review review = reviewService.submitOrderReview(
                userId,
                orderId,
                request.getRating(),
                request.getComment()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ReviewApiResponse.from(review));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<Page<ReviewApiResponse>> getReviewsForUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<ReviewApiResponse> response = reviewService.getReviewsForUser(userId, PageRequest.of(page, size));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/summary/{userId}")
    public ResponseEntity<ReputationSummaryApiResponse> getReputationSummary(
            @PathVariable Long userId
    ) {
        ReputationSummaryApiResponse summary = reviewService.getReputationSummary(userId);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/eligibility/pickup/{pickupId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> checkPickupEligibility(
            @PathVariable Long pickupId,
            Authentication auth
    ) {
        Long userId = extractUserId(auth);
        boolean canReview = reviewService.canReviewPickup(userId, pickupId);
        return ResponseEntity.ok(Map.of(
                "canReview", canReview,
                "pickupId", pickupId
        ));
    }

    @GetMapping("/eligibility/order/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> checkOrderEligibility(
            @PathVariable Long orderId,
            Authentication auth
    ) {
        Long userId = extractUserId(auth);
        boolean canReview = reviewService.canReviewOrder(userId, orderId);
        return ResponseEntity.ok(Map.of(
                "canReview", canReview,
                "orderId", orderId
        ));
    }

    private Long extractUserId(Authentication auth) {
        Long userId = pickupSecurityEvaluator.extractUserId(auth);
        if (userId == null) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }
        return userId;
    }
}
