package com.agroloop.repository;

import com.agroloop.model.IdempotencyKey;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, Long> {

    Optional<IdempotencyKey> findByScopeKeyAndEndpointAndIdempotencyKey(String scopeKey, String endpoint, String idempotencyKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT k FROM IdempotencyKey k WHERE k.scopeKey = :scopeKey AND k.endpoint = :endpoint AND k.idempotencyKey = :idempotencyKey")
    Optional<IdempotencyKey> findForUpdate(
            @Param("scopeKey") String scopeKey,
            @Param("endpoint") String endpoint,
            @Param("idempotencyKey") String idempotencyKey
    );

    @Modifying
    @Query("DELETE FROM IdempotencyKey k WHERE k.createdAt < :cutoff AND k.status IN ('COMPLETED', 'FAILED')")
    int deleteOldRecords(@Param("cutoff") LocalDateTime cutoff);
}
