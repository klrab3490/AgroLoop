package com.agroloop.security.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Filter that enforces rate limits on public API endpoints to prevent DDoS and credential stuffing.
 * Attaches standard rate-limiting headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ApiRateLimitingFilter extends OncePerRequestFilter {

    private final int authMaxRequests;
    private final int generalMaxRequests;
    private final long windowSeconds;
    private final Map<String, WindowTracker> requestWindows = new ConcurrentHashMap<>();

    public ApiRateLimitingFilter(
            @Value("${agroloop.rate-limit.auth.max-requests:30}") int authMaxRequests,
            @Value("${agroloop.rate-limit.general.max-requests:120}") int generalMaxRequests,
            @Value("${agroloop.rate-limit.window-seconds:60}") long windowSeconds
    ) {
        this.authMaxRequests = authMaxRequests;
        this.generalMaxRequests = generalMaxRequests;
        this.windowSeconds = windowSeconds;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Only rate limit /api/v1/** endpoints
        return !path.startsWith("/api/v1/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();
        String clientIp = getClientIp(request);
        boolean isAuthEndpoint = path.startsWith("/api/v1/auth/");
        int limit = isAuthEndpoint ? authMaxRequests : generalMaxRequests;
        String key = (isAuthEndpoint ? "auth:" : "gen:") + clientIp;

        long now = Instant.now().getEpochSecond();
        WindowTracker tracker = requestWindows.compute(key, (k, existing) -> {
            if (existing == null || existing.isExpired(now, windowSeconds)) {
                return new WindowTracker(1, now);
            }
            return new WindowTracker(existing.count + 1, existing.windowStart);
        });

        int remaining = Math.max(0, limit - tracker.count);
        long resetSeconds = Math.max(1, (tracker.windowStart + windowSeconds) - now);

        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", String.valueOf(resetSeconds));

        if (tracker.count > limit) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(resetSeconds));
            response.getWriter().write(String.format(
                    "{\"error\":\"TOO_MANY_REQUESTS\",\"message\":\"Rate limit exceeded. Try again in %d seconds.\",\"status\":429}",
                    resetSeconds
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }

    private static class WindowTracker {
        final int count;
        final long windowStart;

        WindowTracker(int count, long windowStart) {
            this.count = count;
            this.windowStart = windowStart;
        }

        boolean isExpired(long now, long windowSeconds) {
            return (now - windowStart) >= windowSeconds;
        }
    }
}
