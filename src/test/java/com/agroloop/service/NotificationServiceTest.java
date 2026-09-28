package com.agroloop.service;

import com.agroloop.dto.api.v1.response.NotificationApiResponse;
import com.agroloop.model.Household;
import com.agroloop.model.Notification;
import com.agroloop.model.NotificationType;
import com.agroloop.model.User;
import com.agroloop.repository.NotificationRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.service.notification.SseEmitterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService Unit Tests")
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SseEmitterRegistry sseEmitterRegistry;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private Household user;

    @BeforeEach
    void setUp() throws Exception {
        user = new Household("Alice", "alice@example.com", "hash", "123 Green Way");
        var idField = User.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(user, 15L);
    }

    @Test
    @DisplayName("Should persist notification and broadcast via SSE emitter registry")
    void shouldSendNotificationAndBroadcast() {
        when(userRepository.findById(15L)).thenReturn(Optional.of(user));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Notification notification = notificationService.sendNotification(
                15L,
                "Pickup Claimed",
                "Farmer claimed your pickup",
                NotificationType.PICKUP_CLAIMED,
                "/household/dashboard"
        );

        assertThat(notification).isNotNull();
        assertThat(notification.getUser()).isEqualTo(user);
        assertThat(notification.getTitle()).isEqualTo("Pickup Claimed");

        verify(notificationRepository).save(any(Notification.class));
        verify(sseEmitterRegistry).sendToUser(eq(15L), any(NotificationApiResponse.class));
    }

    @Test
    @DisplayName("Should retrieve paged notifications for user")
    void shouldGetUserNotifications() {
        Notification notif = new Notification(user, "Title", "Message", NotificationType.TOKENS_MINTED, null);
        Page<Notification> page = new PageImpl<>(List.of(notif));

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(15L, PageRequest.of(0, 10)))
                .thenReturn(page);

        Page<NotificationApiResponse> result = notificationService.getUserNotifications(15L, PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).title()).isEqualTo("Title");
    }

    @Test
    @DisplayName("Should get unread count and trigger markAsRead updates")
    void shouldManageReadStates() {
        when(notificationRepository.countByUserIdAndIsReadFalse(15L)).thenReturn(4L);

        long unread = notificationService.getUnreadCount(15L);
        assertThat(unread).isEqualTo(4L);

        notificationService.markAsRead(101L, 15L);
        verify(notificationRepository).markAsReadByIdAndUserId(101L, 15L);

        notificationService.markAllAsRead(15L);
        verify(notificationRepository).markAllAsReadByUserId(15L);
    }

    @Test
    @DisplayName("Should register SSE stream emitter for user")
    void shouldSubscribeToStream() {
        SseEmitter mockEmitter = new SseEmitter();
        when(sseEmitterRegistry.registerEmitter(15L)).thenReturn(mockEmitter);

        SseEmitter emitter = notificationService.subscribeToStream(15L);
        assertThat(emitter).isNotNull();
        verify(sseEmitterRegistry).registerEmitter(15L);
    }
}
