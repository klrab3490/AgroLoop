package com.agroloop.controller.api.v1;

import com.agroloop.dto.RegisterRequest;
import com.agroloop.dto.api.v1.request.LoginApiRequest;
import com.agroloop.dto.api.v1.request.RefreshTokenApiRequest;
import com.agroloop.dto.api.v1.request.RegisterApiRequest;
import com.agroloop.dto.api.v1.response.NativeAuthApiResponse;
import com.agroloop.dto.api.v1.response.UserApiResponse;
import com.agroloop.dto.api.v1.response.WebAuthApiResponse;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.ClientType;
import com.agroloop.model.Household;
import com.agroloop.model.User;
import com.agroloop.repository.UserRepository;
import com.agroloop.security.AuthenticationRateLimiter;
import com.agroloop.security.TokenService;
import com.agroloop.security.idempotency.IdempotencyScope;
import com.agroloop.security.idempotency.IdempotencyService;
import com.agroloop.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthApiController {

    private final TokenService tokenService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationRateLimiter rateLimiter;
    private final IdempotencyService idempotencyService;

    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final long refreshExpiryDays;

    public AuthApiController(
            TokenService tokenService,
            UserService userService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationRateLimiter rateLimiter,
            IdempotencyService idempotencyService,
            @Value("${agroloop.auth.cookie.secure:false}") boolean cookieSecure,
            @Value("${agroloop.auth.cookie.same-site:Lax}") String cookieSameSite,
            @Value("${agroloop.jwt.refresh-expiry-days:30}") long refreshExpiryDays
    ) {
        this.tokenService = tokenService;
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
        this.idempotencyService = idempotencyService;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = cookieSameSite;
        this.refreshExpiryDays = refreshExpiryDays;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginApiRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = getClientIp(httpRequest);
        rateLimiter.checkRateLimit("ip:" + clientIp);
        rateLimiter.checkRateLimit("login:" + request.email().toLowerCase());

        User user = userRepository.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> {
                    rateLimiter.recordFailure("login:" + request.email().toLowerCase());
                    rateLimiter.recordFailure("ip:" + clientIp);
                    return new BadCredentialsException("Invalid email or password");
                });

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            rateLimiter.recordFailure("login:" + request.email().toLowerCase());
            rateLimiter.recordFailure("ip:" + clientIp);
            throw new BadCredentialsException("Invalid email or password");
        }

        if (!user.isActive()) {
            throw new BadCredentialsException("User account is inactive or disabled");
        }

        ClientType clientType = request.clientType() != null ? request.clientType() : ClientType.WEB;
        TokenService.TokenPair tokenPair = tokenService.createInitialSession(user, request.deviceName(), clientType);
        UserApiResponse userResponse = UserApiResponse.from(user);

        if (clientType == ClientType.WEB) {
            ResponseCookie cookie = createRefreshTokenCookie(tokenPair.refreshToken(), refreshExpiryDays * 24 * 60 * 60);
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(new WebAuthApiResponse(userResponse, tokenPair.accessToken(), tokenPair.expiresInSeconds()));
        } else {
            return ResponseEntity.ok(new NativeAuthApiResponse(
                    userResponse,
                    tokenPair.accessToken(),
                    tokenPair.refreshToken(),
                    tokenPair.expiresInSeconds()
            ));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterApiRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = getClientIp(httpRequest);
        rateLimiter.checkRateLimit("ip:" + clientIp);
        rateLimiter.checkRateLimit("register:" + request.email().toLowerCase());

        RegisterRequest regReq = new RegisterRequest(
                request.fullName(),
                request.email(),
                request.password(),
                request.password(),
                request.address()
        );

        Household household = userService.registerHousehold(regReq);
        User user = household.getUser();

        ClientType clientType = request.clientType() != null ? request.clientType() : ClientType.WEB;
        TokenService.TokenPair tokenPair = tokenService.createInitialSession(user, request.deviceName(), clientType);
        UserApiResponse userResponse = UserApiResponse.from(user);

        if (clientType == ClientType.WEB) {
            ResponseCookie cookie = createRefreshTokenCookie(tokenPair.refreshToken(), refreshExpiryDays * 24 * 60 * 60);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(new WebAuthApiResponse(userResponse, tokenPair.accessToken(), tokenPair.expiresInSeconds()));
        } else {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new NativeAuthApiResponse(
                            userResponse,
                            tokenPair.accessToken(),
                            tokenPair.refreshToken(),
                            tokenPair.expiresInSeconds()
                    ));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody(required = false) RefreshTokenApiRequest request,
            HttpServletRequest httpRequest
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for token refresh");
        }

        String refreshToken = null;
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            refreshToken = request.refreshToken();
        } else {
            refreshToken = extractRefreshTokenFromCookie(httpRequest);
        }

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadCredentialsException("Refresh token is missing from both request body and cookies");
        }

        final String finalRefreshToken = refreshToken;
        final ClientType clientType = (request != null && request.clientType() != null) ? request.clientType() : ClientType.WEB;
        final String deviceName = request != null ? request.deviceName() : null;

        IdempotencyScope scope = new IdempotencyScope.RefreshScope(finalRefreshToken);

        Object responseDto = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/auth/refresh",
                request,
                Object.class,
                () -> {
                    TokenService.TokenPair tokenPair = tokenService.rotateRefreshToken(finalRefreshToken, deviceName, clientType);
                    User user = userRepository.findByEmail(tokenPair.email())
                            .orElseThrow(() -> new ResourceNotFoundException("User not found for session"));
                    UserApiResponse userResponse = UserApiResponse.from(user);

                    if (clientType == ClientType.WEB) {
                        return new WebAuthApiResponse(userResponse, tokenPair.accessToken(), tokenPair.expiresInSeconds());
                    } else {
                        return new NativeAuthApiResponse(
                                userResponse,
                                tokenPair.accessToken(),
                                tokenPair.refreshToken(),
                                tokenPair.expiresInSeconds()
                        );
                    }
                }
        );

        if (clientType == ClientType.WEB) {
            // Note: If rotated freshly, the tokenPair is inside the execution.
            // For Web clients, the new session's refresh token can be read from the latest session or rotated output.
            return ResponseEntity.ok(responseDto);
        } else {
            return ResponseEntity.ok(responseDto);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestBody(required = false) RefreshTokenApiRequest request,
            HttpServletRequest httpRequest
    ) {
        String refreshToken = null;
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            refreshToken = request.refreshToken();
        } else {
            refreshToken = extractRefreshTokenFromCookie(httpRequest);
        }

        if (refreshToken != null && !refreshToken.isBlank()) {
            tokenService.revokeSession(refreshToken);
        }

        ResponseCookie cookie = createRefreshTokenCookie("", 0);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    @PostMapping("/logout-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logoutAll(Authentication auth) {
        Long userId = extractUserId(auth);
        if (userId != null) {
            tokenService.revokeAllUserSessions(userId);
        }

        ResponseCookie cookie = createRefreshTokenCookie("", 0);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserApiResponse> getCurrentUser(Authentication auth) {
        Long userId = extractUserId(auth);
        if (userId == null) {
            throw new BadCredentialsException("Authenticated user not found");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return ResponseEntity.ok(UserApiResponse.from(user));
    }

    private Long extractUserId(Authentication auth) {
        if (auth == null) {
            return null;
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            Object uid = jwt.getClaim("uid");
            if (uid instanceof Number num) {
                return num.longValue();
            }
            try {
                return Long.parseLong(jwt.getSubject());
            } catch (NumberFormatException ignored) {}
        }
        String email = auth.getName();
        return userRepository.findByEmail(email).map(User::getId).orElse(null);
    }

    private ResponseCookie createRefreshTokenCookie(String value, long maxAge) {
        return ResponseCookie.from("refreshToken", value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .maxAge(maxAge)
                .path("/api/v1/auth")
                .build();
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> "refreshToken".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
