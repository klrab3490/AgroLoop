package com.agroloop.repository;

import com.agroloop.model.WasteVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WasteVerificationRepository extends JpaRepository<WasteVerification, Long> {

    /**
     * Finds the verification record for a given pickup request.
     */
    Optional<WasteVerification> findByPickupRequestId(Long pickupRequestId);

    /**
     * Finds all verifications performed by a specific farmer ordered by newest first.
     */
    List<WasteVerification> findByVerifiedByFarmerIdOrderByVerifiedAtDesc(Long farmerId);
}
