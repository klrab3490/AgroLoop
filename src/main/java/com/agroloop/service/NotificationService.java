package com.agroloop.service;

import com.agroloop.dto.api.v1.response.NotificationApiResponse;
import com.agroloop.model.Notification;
import com.agroloop.model.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

public interface NotificationService {

    Notification sendNotification(Long userId, String title, String message, NotificationType type, String actionUrl);

    Page<NotificationApiResponse> getUserNotifications(Long userId, Pageable pageable);

    List<NotificationApiResponse> getRecentNotifications(Long userId);

    long getUnreadCount(Long userId);

    void markAsRead(Long id, Long userId);

    void markAllAsRead(Long userId);

    SseEmitter subscribeToStream(Long userId);
}
