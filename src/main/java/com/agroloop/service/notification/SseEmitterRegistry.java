package com.agroloop.service.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Thread-safe registry managing real-time Server-Sent Events (SSE) connections
 * per authenticated user. Automatically purges dead or timed-out connections.
 */
@Component
public class SseEmitterRegistry {

    private static final Logger logger = LoggerFactory.getLogger(SseEmitterRegistry.class);
    private static final Long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L; // 30 minutes

    private final Map<Long, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    public SseEmitter registerEmitter(Long userId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError(e -> removeEmitter(userId, emitter));

        try {
            // Initial connect handshake event
            emitter.send(SseEmitter.event()
                    .name("CONNECT")
                    .data("Connected to AgroLoop Live Event Stream"));
        } catch (IOException e) {
            removeEmitter(userId, emitter);
        }

        logger.debug("Registered SSE emitter for user id={}, active count={}",
                userId, userEmitters.getOrDefault(userId, Collections.emptyList()).size());
        return emitter;
    }

    public void sendToUser(Long userId, Object eventData) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("NOTIFICATION")
                        .data(eventData));
            } catch (Exception ex) {
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
            if (emitters.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
        logger.debug("Removed SSE emitter for user id={}", userId);
    }

    public int getActiveConnectionCount(Long userId) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        return emitters != null ? emitters.size() : 0;
    }
}
