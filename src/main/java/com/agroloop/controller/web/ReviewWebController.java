package com.agroloop.controller.web;

import com.agroloop.dto.ReviewSubmissionForm;
import com.agroloop.dto.api.v1.response.ReputationSummaryApiResponse;
import com.agroloop.dto.api.v1.response.ReviewApiResponse;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.Farmer;
import com.agroloop.model.Order;
import com.agroloop.model.PickupRequest;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.security.authorization.PickupSecurityEvaluator;
import com.agroloop.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequestMapping("/reviews")
public class ReviewWebController {

    private final ReviewService reviewService;
    private final FarmerRepository farmerRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final OrderRepository orderRepository;
    private final PickupSecurityEvaluator pickupSecurityEvaluator;

    public ReviewWebController(
            ReviewService reviewService,
            FarmerRepository farmerRepository,
            PickupRequestRepository pickupRequestRepository,
            OrderRepository orderRepository,
            PickupSecurityEvaluator pickupSecurityEvaluator
    ) {
        this.reviewService = reviewService;
        this.farmerRepository = farmerRepository;
        this.pickupRequestRepository = pickupRequestRepository;
        this.orderRepository = orderRepository;
        this.pickupSecurityEvaluator = pickupSecurityEvaluator;
    }

    /**
     * Public profile displaying farmer reputation, trust tier, star breakdown, and verified reviews.
     */
    @GetMapping("/farmer/{farmerId}")
    public String farmerProfile(
            @PathVariable Long farmerId,
            Model model
    ) {
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with ID: " + farmerId));

        ReputationSummaryApiResponse summary = reviewService.getReputationSummary(farmerId);
        List<ReviewApiResponse> reviews = reviewService.getRecentReviewsForUser(farmerId);

        model.addAttribute("farmer", farmer);
        model.addAttribute("summary", summary);
        model.addAttribute("reviews", reviews);
        return "reviews/farmer-profile";
    }

    /**
     * Form to submit review for a completed pickup.
     */
    @GetMapping("/pickup/{pickupId}/new")
    public String newPickupReviewForm(
            @PathVariable Long pickupId,
            Authentication auth,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        Long userId = extractUserId(auth);
        if (userId == null) {
            return "redirect:/login";
        }

        PickupRequest pickup = pickupRequestRepository.findById(pickupId)
                .orElseThrow(() -> new ResourceNotFoundException("Pickup not found with ID: " + pickupId));

        if (!reviewService.canReviewPickup(userId, pickupId)) {
            if (reviewService.getExistingPickupReview(pickupId, userId).isPresent()) {
                redirectAttributes.addFlashAttribute("infoMessage", "You have already reviewed this pickup.");
            } else {
                redirectAttributes.addFlashAttribute("errorMessage", "You are not eligible to review this pickup at this time.");
            }
            return resolveUserDashboardRedirect(auth);
        }

        ReviewSubmissionForm form = new ReviewSubmissionForm();
        form.setPickupId(pickupId);
        form.setRating(5);

        boolean isHousehold = userId.equals(pickup.getWasteSubmission().getHousehold().getId());

        model.addAttribute("form", form);
        model.addAttribute("pickup", pickup);
        model.addAttribute("isHousehold", isHousehold);
        model.addAttribute("targetType", "PICKUP");
        return "reviews/submit-review";
    }

    /**
     * Process review submission for a completed pickup.
     */
    @PostMapping("/pickup/{pickupId}")
    public String submitPickupReview(
            @PathVariable Long pickupId,
            @Valid @ModelAttribute("form") ReviewSubmissionForm form,
            BindingResult bindingResult,
            Authentication auth,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        Long userId = extractUserId(auth);
        if (userId == null) {
            return "redirect:/login";
        }

        if (bindingResult.hasErrors()) {
            PickupRequest pickup = pickupRequestRepository.findById(pickupId)
                    .orElseThrow(() -> new ResourceNotFoundException("Pickup not found with ID: " + pickupId));
            boolean isHousehold = userId.equals(pickup.getWasteSubmission().getHousehold().getId());
            model.addAttribute("pickup", pickup);
            model.addAttribute("isHousehold", isHousehold);
            model.addAttribute("targetType", "PICKUP");
            return "reviews/submit-review";
        }

        try {
            reviewService.submitPickupReview(userId, pickupId, form.getRating(), form.getComment());
            redirectAttributes.addFlashAttribute("successMessage", "Thank you! Your feedback has been recorded.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }

        return resolveUserDashboardRedirect(auth);
    }

    /**
     * Form to submit review for a completed marketplace order.
     */
    @GetMapping("/order/{orderId}/new")
    public String newOrderReviewForm(
            @PathVariable Long orderId,
            Authentication auth,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        Long userId = extractUserId(auth);
        if (userId == null) {
            return "redirect:/login";
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (!reviewService.canReviewOrder(userId, orderId)) {
            if (reviewService.getExistingOrderReview(orderId, userId).isPresent()) {
                redirectAttributes.addFlashAttribute("infoMessage", "You have already reviewed this order.");
            } else {
                redirectAttributes.addFlashAttribute("errorMessage", "You are not eligible to review this order at this time.");
            }
            return "redirect:/marketplace/orders";
        }

        ReviewSubmissionForm form = new ReviewSubmissionForm();
        form.setOrderId(orderId);
        form.setRating(5);

        model.addAttribute("form", form);
        model.addAttribute("order", order);
        model.addAttribute("targetType", "ORDER");
        return "reviews/submit-review";
    }

    /**
     * Process review submission for a completed marketplace order.
     */
    @PostMapping("/order/{orderId}")
    public String submitOrderReview(
            @PathVariable Long orderId,
            @Valid @ModelAttribute("form") ReviewSubmissionForm form,
            BindingResult bindingResult,
            Authentication auth,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        Long userId = extractUserId(auth);
        if (userId == null) {
            return "redirect:/login";
        }

        if (bindingResult.hasErrors()) {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
            model.addAttribute("order", order);
            model.addAttribute("targetType", "ORDER");
            return "reviews/submit-review";
        }

        try {
            reviewService.submitOrderReview(userId, orderId, form.getRating(), form.getComment());
            redirectAttributes.addFlashAttribute("successMessage", "Thank you! Your feedback for this order has been submitted.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }

        return "redirect:/marketplace/orders";
    }

    private Long extractUserId(Authentication auth) {
        if (auth == null) {
            return null;
        }
        return pickupSecurityEvaluator.extractUserId(auth);
    }

    private String resolveUserDashboardRedirect(Authentication auth) {
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_FARMER"))) {
            return "redirect:/farmer/dashboard";
        }
        return "redirect:/household/dashboard";
    }
}
