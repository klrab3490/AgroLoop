package com.agroloop.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Notification Entity Domain Tests")
class NotificationTest {

    @Test
    @DisplayName("Should create valid notification with default unread state")
    void shouldCreateValidNotification() {
        Household user = new Household("Alice", "alice@example.com", "hash", "123 Green Way");

        Notification notification = new Notification(
                user,
                "Pickup Claimed",
                "Farmer Bob claimed your waste collection",
                NotificationType.PICKUP_CLAIMED,
                "/household/dashboard"
        );

        assertThat(notification.getUser()).isEqualTo(user);
        assertThat(notification.getTitle()).isEqualTo("Pickup Claimed");
        assertThat(notification.getMessage()).isEqualTo("Farmer Bob claimed your waste collection");
        assertThat(notification.getType()).isEqualTo(NotificationType.PICKUP_CLAIMED);
        assertThat(notification.getActionUrl()).isEqualTo("/household/dashboard");
        assertThat(notification.isRead()).isFalse();
        assertThat(notification.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should mark notification as read")
    void shouldMarkAsRead() {
        Household user = new Household("Alice", "alice@example.com", "hash", "123 Green Way");
        Notification notification = new Notification(user, "Title", "Message", NotificationType.TOKENS_MINTED, null);

        assertThat(notification.isRead()).isFalse();
        notification.markAsRead();
        assertThat(notification.isRead()).isTrue();
    }

    @Test
    @DisplayName("Should validate non-null required fields")
    void shouldValidateRequiredFields() {
        Household user = new Household("Alice", "alice@example.com", "hash", "123 Green Way");

        assertThatThrownBy(() -> new Notification(null, "Title", "Message", NotificationType.SYSTEM_ALERT, null))
                .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> new Notification(user, null, "Message", NotificationType.SYSTEM_ALERT, null))
                .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> new Notification(user, "Title", null, NotificationType.SYSTEM_ALERT, null))
                .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> new Notification(user, "Title", "Message", null, null))
                .isInstanceOf(NullPointerException.class);
    }
}
