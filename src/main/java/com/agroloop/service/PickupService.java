package com.agroloop.service;

import com.agroloop.dto.SchedulePickupRequest;
import com.agroloop.dto.WasteVerificationRequest;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;

import java.util.List;
import java.util.Optional;

/**
 * Service contract for pickup lifecycle operations, scheduling, and post-collection verification.
 */
public interface PickupService {

    /**
     * Creates and persists a new PickupRequest in REQUESTED status for a submitted waste batch.
     */
    PickupRequest createPickupRequest(WasteSubmission submission);

    /**
     * Finds a pickup request by its ID.
     */
    Optional<PickupRequest> getPickupById(Long id);

    /**
     * Finds the pickup request corresponding to a waste submission ID.
     */
    Optional<PickupRequest> getPickupByWasteSubmissionId(Long wasteSubmissionId);

    /**
     * Retrieves all available unclaimed pickups (status = REQUESTED).
     */
    List<PickupRequest> getAvailablePickups();

    /**
     * Retrieves all pickups across all lifecycle states for fleet telemetry and dispatch monitoring.
     */
    List<PickupRequest> getAllPickups();

    /**
     * Retrieves all pickups assigned to a specific farmer.
     */
    List<PickupRequest> getFarmerPickups(Long farmerId);

    /**
     * Retrieves all pickups originating from a specific household.
     */
    List<PickupRequest> getHouseholdPickups(Long householdId);

    /**
     * Farmer claims an available pickup request.
     */
    PickupRequest claimPickup(Long pickupId, Long farmerId);

    /**
     * Farmer schedules a collection appointment slot for an assigned pickup.
     */
    PickupRequest schedulePickup(Long pickupId, Long farmerId, SchedulePickupRequest request);

    /**
     * Farmer marks that physical collection of the waste has taken place.
     */
    PickupRequest collectPickup(Long pickupId, Long farmerId);

    /**
     * Farmer verifies the collected waste, entering actual weight and quality grade.
     */
    WasteVerification verifyPickup(Long pickupId, Long farmerId, WasteVerificationRequest request);

    /**
     * Farmer declines or relinquishes the assignment, returning the request to the available queue.
     */
    PickupRequest declinePickup(Long pickupId, Long farmerId, String reason);

    /**
     * Household cancels the pickup request prior to collection.
     */
    PickupRequest cancelPickup(Long pickupId, Long householdId, String reason);
}
