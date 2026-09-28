package com.agroloop.controller.api.v1;

import com.agroloop.model.ClientType;
import com.agroloop.model.Household;
import com.agroloop.model.Notification;
import com.agroloop.model.NotificationType;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.NotificationRepository;
import com.agroloop.security.TokenService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("NotificationApiController Integration Tests — Real-Time Streaming & Alerts")
class NotificationApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private TokenService tokenService;

    private Household testUser;
    private String token;
    private Notification notification;

    @BeforeEach
    void setUp() {
        testUser = householdRepository.findByEmail("notif_user@agroloop.com").orElseGet(() -> {
            Household h = new Household("Notification Test User", "notif_user@agroloop.com", "pass", "456 Alert Lane");
            return householdRepository.save(h);
        });

        notification = new Notification(
                testUser,
                "Collection Scheduled",
                "Your waste pickup appointment is confirmed for tomorrow.",
                NotificationType.PICKUP_SCHEDULED,
                "/household/dashboard"
        );
        notification = notificationRepository.save(notification);

        token = tokenService.createInitialSession(testUser, "Test Device", ClientType.WEB).accessToken();
    }

    @AfterEach
    void tearDown() {
        notificationRepository.deleteAll();
    }

    @Test
    @DisplayName("GET /api/v1/notifications returns paged notifications for authenticated user")
    void getNotifications_returnsPagedList() throws Exception {
        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id", is(notification.getId().intValue())))
                .andExpect(jsonPath("$.content[0].title", is("Collection Scheduled")))
                .andExpect(jsonPath("$.content[0].type", is("PICKUP_SCHEDULED")))
                .andExpect(jsonPath("$.content[0].isRead", is(false)));
    }

    @Test
    @DisplayName("GET /api/v1/notifications/unread-count returns accurate count")
    void getUnreadCount_returnsCount() throws Exception {
        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount", is(1)));
    }

    @Test
    @DisplayName("PUT /api/v1/notifications/{id}/read marks notification as read")
    void markAsRead_marksNotification() throws Exception {
        mockMvc.perform(put("/api/v1/notifications/" + notification.getId() + "/read")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        Notification updated = notificationRepository.findById(notification.getId()).orElseThrow();
        assertThat(updated.isRead()).isTrue();
    }

    @Test
    @DisplayName("PUT /api/v1/notifications/read-all marks all notifications as read")
    void markAllAsRead_marksAll() throws Exception {
        mockMvc.perform(put("/api/v1/notifications/read-all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        Notification updated = notificationRepository.findById(notification.getId()).orElseThrow();
        assertThat(updated.isRead()).isTrue();
    }

    @Test
    @DisplayName("GET /api/v1/notifications/stream subscribes to SSE event stream")
    void subscribe_connectsToStream() throws Exception {
        mockMvc.perform(get("/api/v1/notifications/stream")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}
