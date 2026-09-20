package com.agroloop.security;

import com.agroloop.exception.RateLimitExceededException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthenticationRateLimiter {

    private final int maxAttempts;
    private final long windowSeconds;
    private final Map<String, AttemptTracker> attempts = new ConcurrentHashMap<>();

    public AuthenticationRateLimiter(
            @Value("${agroloop.rate-limit.auth.max-attempts:10}") int maxAttempts,
            @Value("${agroloop.rate-limit.auth.window-seconds:900}") long windowSeconds
    ) {
        this.maxAttempts = maxAttempts;
        this.windowSeconds = windowSeconds;
    }

    public void checkAllowed(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        AttemptTracker tracker = attempts.get(key);
        if (tracker != null && tracker.isBlocked(maxAttempts, windowSeconds)) {
            throw new RateLimitExceededException("Too many authentication attempts. Please try again later.");
        }
    }

    public void checkRateLimit(String key) {
        checkAllowed(key);
    }

    public void recordFailure(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        attempts.compute(key, (k, v) -> {
            if (v == null || v.isExpired(windowSeconds)) {
                return new AttemptTracker(1, Instant.now());
            }
            return new AttemptTracker(v.count + 1, v.firstAttempt);
        });
    }

    public void reset(String key) {
        if (key != null) {
            attempts.remove(key);
        }
    }

    private static class AttemptTracker {
        final int count;
        final Instant firstAttempt;

        AttemptTracker(int count, Instant firstAttempt) {
            this.count = count;
            this.firstAttempt = firstAttempt;
        }

        boolean isExpired(long windowSeconds) {
            return Instant.now().isAfter(firstAttempt.plusSeconds(windowSeconds));
        }

        boolean isBlocked(int maxAttempts, long windowSeconds) {
            if (isExpired(windowSeconds)) {
                return false;
            }
            return count >= maxAttempts;
        }
    }
}
