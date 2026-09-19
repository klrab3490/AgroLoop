package com.agroloop.repository;

import com.agroloop.model.PickupRequest;
import com.agroloop.model.PickupStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PickupRequestRepository extends JpaRepository<PickupRequest, Long> {

    /**
     * Finds the pickup request associated with a specific waste submission.
     */
    Optional<PickupRequest> findByWasteSubmissionId(Long wasteSubmissionId);

    /**
     * Finds all pickup requests in a specific status ordered chronologically.
     * Useful for retrieving available unassigned pickups (REQUESTED).
     */
    List<PickupRequest> findByStatusOrderByCreatedAtAsc(PickupStatus status);

    /**
     * Finds all pickup requests assigned to a farmer.
     */
    List<PickupRequest> findByAssignedFarmerIdOrderByCreatedAtDesc(Long farmerId);

    /**
     * Finds pickup requests assigned to a farmer in a specific status.
     */
    List<PickupRequest> findByAssignedFarmerIdAndStatusOrderByCreatedAtDesc(Long farmerId, PickupStatus status);

    /**
     * Finds pickup requests originating from a specific household's submissions.
     */
    List<PickupRequest> findByWasteSubmissionHouseholdIdOrderByCreatedAtDesc(Long householdId);
}
