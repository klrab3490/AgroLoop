package com.agroloop.service;

import com.agroloop.dto.api.v1.response.NotificationApiResponse;
import com.agroloop.model.Notification;
import com.agroloop.model.NotificationType;
import com.agroloop.model.User;
import com.agroloop.repository.NotificationRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.service.notification.SseEmitterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SseEmitterRegistry sseEmitterRegistry;

    public NotificationServiceImpl(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            SseEmitterRegistry sseEmitterRegistry
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.sseEmitterRegistry = sseEmitterRegistry;
    }

    @Override
    @Transactional
    public Notification sendNotification(Long userId, String title, String message, NotificationType type, String actionUrl) {
        Objects.requireNonNull(userId, "Target userId must not be null");
        Objects.requireNonNull(title, "Title must not be null");
        Objects.requireNonNull(message, "Message must not be null");
        Objects.requireNonNull(type, "NotificationType must not be null");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        Notification notification = new Notification(user, title, message, type, actionUrl);
        Notification saved = notificationRepository.save(notification);

        // Real-time broadcast to active SSE connections
        NotificationApiResponse apiResponse = NotificationApiResponse.from(saved);
        try {
            sseEmitterRegistry.sendToUser(userId, apiResponse);
        } catch (Exception ex) {
            logger.warn("Failed to deliver SSE notification to user id={}: {}", userId, ex.getMessage());
        }

        logger.info("Created notification id={} for user id={} type={}", saved.getId(), userId, type);
        return saved;
    }

    @Override
    public Page<NotificationApiResponse> getUserNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationApiResponse::from);
    }

    @Override
    public List<NotificationApiResponse> getRecentNotifications(Long userId) {
        return notificationRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationApiResponse::from)
                .toList();
    }

    @Override
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public void markAsRead(Long id, Long userId) {
        notificationRepository.markAsReadByIdAndUserId(id, userId);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Override
    public SseEmitter subscribeToStream(Long userId) {
        Objects.requireNonNull(userId, "UserId must not be null");
        return sseEmitterRegistry.registerEmitter(userId);
    }
}
