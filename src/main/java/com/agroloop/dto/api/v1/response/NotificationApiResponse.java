package com.agroloop.dto.api.v1.response;

import com.agroloop.model.Notification;
import com.agroloop.model.NotificationType;

import java.time.LocalDateTime;

public record NotificationApiResponse(
        Long id,
        Long userId,
        String title,
        String message,
        NotificationType type,
        String typeDisplayName,
        String actionUrl,
        boolean isRead,
        LocalDateTime createdAt
) {
    public static NotificationApiResponse from(Notification notification) {
        if (notification == null) {
            return null;
        }

        Long userId = notification.getUser() != null ? notification.getUser().getId() : null;
        String typeDisplayName = notification.getType() != null ? notification.getType().getDisplayName() : null;

        return new NotificationApiResponse(
                notification.getId(),
                userId,
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                typeDisplayName,
                notification.getActionUrl(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
