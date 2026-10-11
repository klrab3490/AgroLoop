package com.agroloop.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Set;

/**
 * Development authentication filter providing frictionless testing for local APIs,
 * external carrier webhooks, Postman, and automated integration scripts.
 *
 * Accepts either:
 * - Header: {@code X-API-Key: agroloop-dev-key} (or {@code dev-token}, {@code dev-carrier-key})
 * - Header: {@code Authorization: Bearer dev-carrier-token} (or {@code dev-token}, {@code dev-admin-token})
 * - Query parameter: {@code ?apiKey=agroloop-dev-key} or {@code ?devToken=agroloop-dev-key}
 *
 * Automatically grants simulated administrative & carrier privileges (admin@agroloop.com).
 */
@Component
public class DevAuthenticationFilter extends OncePerRequestFilter {

    public static final String DEV_API_KEY = "agroloop-dev-key";
    public static final String DEV_BEARER_TOKEN = "dev-carrier-token";

    private static final Set<String> DEV_API_KEYS = Set.of(
            "agroloop-dev-key",
            "dev-token",
            "dev-carrier-key",
            "dev-carrier-token"
    );

    private static final Set<String> DEV_BEARER_TOKENS = Set.of(
            "dev-token",
            "dev-carrier-token",
            "dev-admin-token",
            "agroloop-dev-token",
            "agroloop-dev-key"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String apiKey = request.getHeader("X-API-Key");
        String authHeader = request.getHeader("Authorization");
        String paramKey = request.getParameter("apiKey");
        if (paramKey == null) {
            paramKey = request.getParameter("devToken");
        }

        boolean isDevApiKey = (apiKey != null && DEV_API_KEYS.contains(apiKey.trim()))
                || (paramKey != null && DEV_API_KEYS.contains(paramKey.trim()));

        String bearerToken = null;
        if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            bearerToken = authHeader.substring(7).trim();
        }

        boolean isDevBearer = bearerToken != null && DEV_BEARER_TOKENS.contains(bearerToken);

        if (isDevApiKey || isDevBearer) {
            UserDetails devUser = new User(
                    "admin@agroloop.com",
                    "",
                    true,
                    true,
                    true,
                    true,
                    List.of(
                            new SimpleGrantedAuthority("ROLE_ADMIN"),
                            new SimpleGrantedAuthority("ROLE_FARMER"),
                            new SimpleGrantedAuthority("ROLE_HOUSEHOLD")
                    )
            );

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    devUser,
                    null,
                    devUser.getAuthorities()
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // When a client supplies a simulated dev token in Authorization header, wrap the request
            // to suppress the header downstream so BearerTokenAuthenticationFilter does not attempt
            // to decode it as an RSA JWT signature.
            if (isDevBearer) {
                HttpServletRequest wrappedRequest = new HttpServletRequestWrapper(request) {
                    @Override
                    public String getHeader(String name) {
                        if ("Authorization".equalsIgnoreCase(name)) {
                            return null;
                        }
                        return super.getHeader(name);
                    }

                    @Override
                    public Enumeration<String> getHeaders(String name) {
                        if ("Authorization".equalsIgnoreCase(name)) {
                            return Collections.emptyEnumeration();
                        }
                        return super.getHeaders(name);
                    }
                };
                filterChain.doFilter(wrappedRequest, response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
