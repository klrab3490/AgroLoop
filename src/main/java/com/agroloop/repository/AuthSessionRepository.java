package com.agroloop.repository;

import com.agroloop.model.AuthSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {

    Optional<AuthSession> findByRefreshTokenHash(String refreshTokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM AuthSession s WHERE s.refreshTokenHash = :hash")
    Optional<AuthSession> findByRefreshTokenHashForUpdate(@Param("hash") String hash);

    @Query("SELECT COUNT(s) > 0 FROM AuthSession s WHERE s.rotatedFromSession.id = :sessionId")
    boolean existsByRotatedFromSessionId(@Param("sessionId") Long sessionId);

    List<AuthSession> findAllByUserIdAndRevokedAtIsNull(Long userId);

    @Modifying
    @Query("UPDATE AuthSession s SET s.revokedAt = CURRENT_TIMESTAMP WHERE s.familyId = :familyId AND s.revokedAt IS NULL")
    int revokeFamily(@Param("familyId") UUID familyId);

    @Modifying
    @Query("UPDATE AuthSession s SET s.revokedAt = CURRENT_TIMESTAMP WHERE s.user.id = :userId AND s.revokedAt IS NULL")
    int revokeAllUserSessions(@Param("userId") Long userId);
}
