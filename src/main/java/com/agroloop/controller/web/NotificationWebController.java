package com.agroloop.controller.web;

import com.agroloop.dto.api.v1.response.NotificationApiResponse;
import com.agroloop.security.authorization.PickupSecurityEvaluator;
import com.agroloop.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationWebController {

    private final NotificationService notificationService;
    private final PickupSecurityEvaluator pickupSecurityEvaluator;

    public NotificationWebController(
            NotificationService notificationService,
            PickupSecurityEvaluator pickupSecurityEvaluator
    ) {
        this.notificationService = notificationService;
        this.pickupSecurityEvaluator = pickupSecurityEvaluator;
    }

    @GetMapping(value = "/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    @org.springframework.web.bind.annotation.ResponseBody
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter subscribeWebStream(Authentication auth) {
        Long userId = pickupSecurityEvaluator.extractUserId(auth);
        if (userId == null) {
            throw new com.agroloop.exception.ResourceNotFoundException("Authenticated user not found");
        }
        return notificationService.subscribeToStream(userId);
    }

    /**
     * Dedicated notification center inbox view.
     */
    @GetMapping
    public String notificationInbox(
            @RequestParam(defaultValue = "0") int page,
            Authentication auth,
            Model model
    ) {
        Long userId = pickupSecurityEvaluator.extractUserId(auth);
        if (userId == null) {
            return "redirect:/login";
        }

        Page<NotificationApiResponse> notifications = notificationService.getUserNotifications(
                userId, PageRequest.of(page, 20));
        long unreadCount = notificationService.getUnreadCount(userId);

        model.addAttribute("notifications", notifications);
        model.addAttribute("unreadCount", unreadCount);
        return "notifications/index";
    }

    /**
     * Mark a single notification as read.
     */
    @PostMapping("/{id}/read")
    public String markAsRead(
            @PathVariable Long id,
            Authentication auth,
            RedirectAttributes redirectAttributes
    ) {
        Long userId = pickupSecurityEvaluator.extractUserId(auth);
        if (userId != null) {
            notificationService.markAsRead(id, userId);
        }
        return "redirect:/notifications";
    }

    /**
     * Mark all notifications as read for current user.
     */
    @PostMapping("/read-all")
    public String markAllAsRead(
            Authentication auth,
            RedirectAttributes redirectAttributes
    ) {
        Long userId = pickupSecurityEvaluator.extractUserId(auth);
        if (userId != null) {
            notificationService.markAllAsRead(userId);
            redirectAttributes.addFlashAttribute("successMessage", "All notifications marked as read.");
        }
        return "redirect:/notifications";
    }
}
