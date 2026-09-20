package com.agroloop.controller.api.v1;

import com.agroloop.dto.api.v1.request.LoginApiRequest;
import com.agroloop.dto.api.v1.request.RefreshTokenApiRequest;
import com.agroloop.dto.api.v1.request.RegisterApiRequest;
import com.agroloop.model.ClientType;
import com.agroloop.model.Household;
import com.agroloop.model.Role;
import com.agroloop.model.User;
import com.agroloop.repository.AuthSessionRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.security.TokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("AuthApiController Integration Tests — Login, Registration, Token Rotation & Revocation")
class AuthApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TokenService tokenService;

    private User testUser;

    @BeforeEach
    void setUp() {
        authSessionRepository.deleteAll();
        userRepository.findByEmail("authtest@agroloop.com").ifPresent(userRepository::delete);

        Household household = new Household(
                "Auth Test User",
                "authtest@agroloop.com",
                passwordEncoder.encode("SecurePass123!"),
                "123 Green St"
        );
        testUser = householdRepository.save(household);
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with WEB client returns WebAuthApiResponse and Set-Cookie")
    void testLoginWebClientSetsCookie() throws Exception {
        LoginApiRequest request = new LoginApiRequest(
                "authtest@agroloop.com",
                "SecurePass123!",
                "Chrome MacOS",
                ClientType.WEB
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Set-Cookie", containsString("refreshToken=")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("authtest@agroloop.com"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with MOBILE client returns NativeAuthApiResponse with refreshToken in body")
    void testLoginNativeClientReturnsRefreshTokenInBody() throws Exception {
        LoginApiRequest request = new LoginApiRequest(
                "authtest@agroloop.com",
                "SecurePass123!",
                "iPhone 15",
                ClientType.MOBILE
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("authtest@agroloop.com"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login with invalid password returns 401 Unauthorized")
    void testLoginInvalidPasswordFails() throws Exception {
        LoginApiRequest request = new LoginApiRequest(
                "authtest@agroloop.com",
                "WrongPassword!",
                "Desktop Client",
                ClientType.DESKTOP
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register creates new account and returns initial tokens")
    void testRegisterNewAccount() throws Exception {
        String uniqueEmail = "reg" + System.currentTimeMillis() + "@agroloop.com";
        RegisterApiRequest request = new RegisterApiRequest(
                "Newly Registered User",
                uniqueEmail,
                "ValidSecret123!",
                "456 Circular Way",
                "555-0199",
                "Mobile App",
                ClientType.MOBILE
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(uniqueEmail));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh without Idempotency-Key header returns 400 Bad Request")
    void testRefreshMissingIdempotencyKey() throws Exception {
        TokenService.TokenPair session = tokenService.createInitialSession(testUser, "Test Device", ClientType.MOBILE);
        RefreshTokenApiRequest request = new RefreshTokenApiRequest(session.refreshToken(), "Test Device", ClientType.MOBILE);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MISSING_IDEMPOTENCY_KEY"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh successfully rotates refresh token and invalidates old token")
    void testRefreshRotationSuccess() throws Exception {
        TokenService.TokenPair initialSession = tokenService.createInitialSession(testUser, "Test Device", ClientType.MOBILE);
        RefreshTokenApiRequest request = new RefreshTokenApiRequest(initialSession.refreshToken(), "Test Device", ClientType.MOBILE);
        String idempotencyKey = UUID.randomUUID().toString();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        String newRefreshToken = objectMapper.readTree(responseBody).get("refreshToken").asText();

        assertNotEquals(initialSession.refreshToken(), newRefreshToken, "Rotated refresh token must differ from old token");

        // Subsequent call with exact same idempotency key returns cached response
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refreshToken").value(newRefreshToken));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh replay of revoked token triggers token family revocation")
    void testRefreshReplayAttackRevokesFamily() throws Exception {
        TokenService.TokenPair session1 = tokenService.createInitialSession(testUser, "Test Device", ClientType.MOBILE);
        RefreshTokenApiRequest request1 = new RefreshTokenApiRequest(session1.refreshToken(), "Test Device", ClientType.MOBILE);

        // First rotation succeeds
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isOk());

        // Replay of original token with a NEW idempotency key triggers breach detection
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("TOKEN_FAMILY_REVOKED"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/logout revokes session and clears cookie")
    void testLogout() throws Exception {
        TokenService.TokenPair session = tokenService.createInitialSession(testUser, "Web Browser", ClientType.WEB);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new Cookie("refreshToken", session.refreshToken())))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns current user details with valid Bearer JWT")
    void testGetMeWithJwt() throws Exception {
        String jwt = tokenService.issueAccessToken(testUser);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("authtest@agroloop.com"))
                .andExpect(jsonPath("$.name").value("Auth Test User"))
                .andExpect(jsonPath("$.role").value("ROLE_HOUSEHOLD"));
    }
}
