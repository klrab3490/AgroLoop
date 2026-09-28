package com.agroloop.controller.api.v1;

import com.agroloop.dto.api.v1.response.NotificationApiResponse;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.security.authorization.PickupSecurityEvaluator;
import com.agroloop.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationApiController {

    private final NotificationService notificationService;
    private final PickupSecurityEvaluator pickupSecurityEvaluator;

    public NotificationApiController(
            NotificationService notificationService,
            PickupSecurityEvaluator pickupSecurityEvaluator
    ) {
        this.notificationService = notificationService;
        this.pickupSecurityEvaluator = pickupSecurityEvaluator;
    }

    /**
     * Subscribe to real-time Server-Sent Events (SSE) notification stream.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(Authentication auth) {
        Long userId = extractUserId(auth);
        return notificationService.subscribeToStream(userId);
    }

    /**
     * Paged user notifications.
     */
    @GetMapping
    public ResponseEntity<Page<NotificationApiResponse>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth
    ) {
        Long userId = extractUserId(auth);
        Page<NotificationApiResponse> notifications = notificationService.getUserNotifications(
                userId, PageRequest.of(page, size));
        return ResponseEntity.ok(notifications);
    }

    /**
     * Current count of unread notifications for badge counters.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(Authentication auth) {
        Long userId = extractUserId(auth);
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * Mark a single notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, Authentication auth) {
        Long userId = extractUserId(auth);
        notificationService.markAsRead(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Mark all notifications as read for current user.
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication auth) {
        Long userId = extractUserId(auth);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    private Long extractUserId(Authentication auth) {
        Long userId = pickupSecurityEvaluator.extractUserId(auth);
        if (userId == null) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }
        return userId;
    }
}
