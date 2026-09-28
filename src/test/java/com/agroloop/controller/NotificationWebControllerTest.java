package com.agroloop.controller;

import com.agroloop.model.Household;
import com.agroloop.model.Notification;
import com.agroloop.model.NotificationType;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.NotificationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("NotificationWebController Integration Tests — Web Inbox & SSE Stream")
class NotificationWebControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private Household testUser;
    private Notification notification;

    @BeforeEach
    void setUp() {
        testUser = householdRepository.findByEmail("web_notif@agroloop.com").orElseGet(() -> {
            Household h = new Household("Web Notif User", "web_notif@agroloop.com", "pass", "789 Bell St");
            return householdRepository.save(h);
        });

        notification = new Notification(
                testUser,
                "EcoTokens Earned",
                "You earned 25 tokens for organic recycling.",
                NotificationType.TOKENS_MINTED,
                "/household/dashboard"
        );
        notification = notificationRepository.save(notification);
    }

    @AfterEach
    void tearDown() {
        notificationRepository.deleteAll();
    }

    @Test
    @WithMockUser(username = "web_notif@agroloop.com", roles = "HOUSEHOLD")
    @DisplayName("GET /notifications renders notification center inbox")
    void getInbox_rendersView() throws Exception {
        mockMvc.perform(get("/notifications"))
                .andExpect(status().isOk())
                .andExpect(view().name("notifications/index"))
                .andExpect(model().attributeExists("notifications", "unreadCount"))
                .andExpect(content().string(containsString("Notification Center")))
                .andExpect(content().string(containsString("EcoTokens Earned")));
    }

    @Test
    @WithMockUser(username = "web_notif@agroloop.com", roles = "HOUSEHOLD")
    @DisplayName("POST /notifications/{id}/read marks notification and redirects to inbox")
    void markAsRead_redirects() throws Exception {
        mockMvc.perform(post("/notifications/" + notification.getId() + "/read")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/notifications"));

        Notification updated = notificationRepository.findById(notification.getId()).orElseThrow();
        assertThat(updated.isRead()).isTrue();
    }

    @Test
    @WithMockUser(username = "web_notif@agroloop.com", roles = "HOUSEHOLD")
    @DisplayName("POST /notifications/read-all marks all notifications and redirects")
    void markAllAsRead_redirects() throws Exception {
        mockMvc.perform(post("/notifications/read-all")
                        .with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/notifications"));

        Notification updated = notificationRepository.findById(notification.getId()).orElseThrow();
        assertThat(updated.isRead()).isTrue();
    }

    @Test
    @WithMockUser(username = "web_notif@agroloop.com", roles = "HOUSEHOLD")
    @DisplayName("GET /notifications/stream opens web SSE stream")
    void getWebStream_opensStream() throws Exception {
        mockMvc.perform(get("/notifications/stream"))
                .andExpect(status().isOk());
    }
}
