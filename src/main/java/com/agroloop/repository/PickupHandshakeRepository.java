package com.agroloop.repository;

import com.agroloop.model.PickupHandshake;
import com.agroloop.model.PickupHandshakeStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PickupHandshakeRepository extends JpaRepository<PickupHandshake, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM PickupHandshake h WHERE h.nonce = :nonce")
    Optional<PickupHandshake> findByNonceForUpdate(@Param("nonce") String nonce);

    Optional<PickupHandshake> findByNonce(String nonce);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PickupHandshake> findFirstByPickupIdAndStatusOrderByIssuedAtDesc(Long pickupId, PickupHandshakeStatus status);

    Optional<PickupHandshake> findFirstByPickupIdOrderByIssuedAtDesc(Long pickupId);

    @Modifying
    @Query("UPDATE PickupHandshake h SET h.status = com.agroloop.model.PickupHandshakeStatus.INVALIDATED, h.invalidatedAt = :now WHERE h.pickup.id = :pickupId AND h.status = com.agroloop.model.PickupHandshakeStatus.ISSUED")
    int invalidateActivePassesForPickup(@Param("pickupId") Long pickupId, @Param("now") Instant now);
}
