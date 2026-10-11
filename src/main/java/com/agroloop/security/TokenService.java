package com.agroloop.security;

import com.agroloop.exception.ExpiredTokenException;
import com.agroloop.exception.RevokedTokenException;
import com.agroloop.exception.TokenFamilyRevokedException;
import com.agroloop.model.AuthSession;
import com.agroloop.model.ClientType;
import com.agroloop.model.User;
import com.agroloop.repository.AuthSessionRepository;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class TokenService {

    private final AuthSessionRepository authSessionRepository;
    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;
    private final SecureRandom secureRandom = new SecureRandom();

    private final long accessExpiryMinutes;
    private final long refreshExpiryDays;

    public TokenService(
            AuthSessionRepository authSessionRepository,
            @Value("${agroloop.jwt.access-expiry-minutes:15}") long accessExpiryMinutes,
            @Value("${agroloop.jwt.refresh-expiry-days:30}") long refreshExpiryDays
    ) {
        this.authSessionRepository = authSessionRepository;
        this.accessExpiryMinutes = accessExpiryMinutes;
        this.refreshExpiryDays = refreshExpiryDays;

        // Initialize RSA 2048 key pair
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair keyPair = generator.generateKeyPair();
            this.publicKey = (RSAPublicKey) keyPair.getPublic();
            this.privateKey = (RSAPrivateKey) keyPair.getPrivate();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA key generation failed", e);
        }
    }

    public RSAPublicKey getPublicKey() {
        return this.publicKey;
    }

    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(accessExpiryMinutes, ChronoUnit.MINUTES);

        String roleName = user.getRole().name();
        String roleClaim = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .subject(user.getId().toString())
                .claim("uid", user.getId())
                .claim("email", user.getEmail())
                .claim("role", roleClaim)
                .jwtID(UUID.randomUUID().toString())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiry))
                .build();

        SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claimsSet);
        try {
            signedJWT.sign(new RSASSASigner(privateKey));
            return signedJWT.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Failed to sign access JWT", e);
        }
    }

    public long getAccessExpirySeconds() {
        return accessExpiryMinutes * 60;
    }

    public String generateRawRefreshToken() {
        byte[] randomBytes = new byte[64];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    @Transactional
    public TokenPair createInitialSession(User user, String deviceName, ClientType clientType) {
        String rawRefreshToken = generateRawRefreshToken();
        String hash = hashToken(rawRefreshToken);
        UUID familyId = UUID.randomUUID();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(refreshExpiryDays);

        AuthSession session = new AuthSession(
                user,
                hash,
                familyId,
                deviceName,
                clientType,
                expiresAt,
                null
        );
        session.touch();
        authSessionRepository.save(session);

        String accessToken = issueAccessToken(user);
        return new TokenPair(accessToken, rawRefreshToken, getAccessExpirySeconds(), session.getUser());
    }

    @Transactional
    public TokenPair rotateSession(String rawRefreshToken) {
        String tokenHash = hashToken(rawRefreshToken);

        // 1. Pessimistic lock on the matching session
        AuthSession session = authSessionRepository.findByRefreshTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new RevokedTokenException("Invalid refresh token"));

        // 2. Check revocation & replay detection
        if (session.isRevoked()) {
            // Check if this session was previously rotated (child session exists pointing to this session)
            boolean wasRotated = authSessionRepository.existsByRotatedFromSessionId(session.getId());
            if (wasRotated) {
                // Token reuse attack detected! Revoke entire token family
                authSessionRepository.revokeFamily(session.getFamilyId());
                throw new TokenFamilyRevokedException("Token family revoked due to replay detection");
            }
            throw new RevokedTokenException("Refresh token has been revoked");
        }

        // 3. Check expiration
        if (session.isExpired()) {
            session.revoke();
            authSessionRepository.save(session);
            throw new ExpiredTokenException("Refresh token has expired");
        }

        // 4. Revoke current parent session
        session.revoke();
        session.touch();
        authSessionRepository.save(session);

        // 5. Generate child session inheriting same familyId
        String newRawRefreshToken = generateRawRefreshToken();
        String newHash = hashToken(newRawRefreshToken);
        LocalDateTime newExpiresAt = LocalDateTime.now().plusDays(refreshExpiryDays);

        AuthSession childSession = new AuthSession(
                session.getUser(),
                newHash,
                session.getFamilyId(),
                session.getDeviceName(),
                session.getClientType(),
                newExpiresAt,
                session
        );
        childSession.touch();
        authSessionRepository.save(childSession);

        String newAccessToken = issueAccessToken(session.getUser());
        return new TokenPair(newAccessToken, newRawRefreshToken, getAccessExpirySeconds(), session.getUser());
    }

    @Transactional
    public TokenPair rotateRefreshToken(String rawRefreshToken, String deviceName, ClientType clientType) {
        return rotateSession(rawRefreshToken);
    }

    @Transactional
    public void revokeSession(String rawRefreshToken) {
        String hash = hashToken(rawRefreshToken);
        authSessionRepository.findByRefreshTokenHashForUpdate(hash).ifPresent(session -> {
            session.revoke();
            authSessionRepository.save(session);
        });
    }

    @Transactional
    public void revokeAllUserSessions(Long userId) {
        authSessionRepository.revokeAllUserSessions(userId);
    }

    public record TokenPair(String accessToken, String refreshToken, long expiresIn, User user) {
        public long expiresInSeconds() {
            return expiresIn;
        }

        public String email() {
            return user != null ? user.getEmail() : null;
        }
    }
}
