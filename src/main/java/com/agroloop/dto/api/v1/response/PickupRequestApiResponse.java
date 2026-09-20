package com.agroloop.dto.api.v1.response;

import com.agroloop.model.PickupRequest;
import java.time.LocalDateTime;

public record PickupRequestApiResponse(
    Long id,
    Long wasteSubmissionId,
    Long householdId,
    String householdName,
    Long assignedFarmerId,
    String assignedFarmerName,
    String status,
    String pickupAddress,
    LocalDateTime scheduledTime,
    LocalDateTime collectedAt,
    LocalDateTime cancelledAt,
    String cancellationReason,
    VerificationApiResponse verification,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static PickupRequestApiResponse from(PickupRequest pickup) {
        if (pickup == null) {
            return null;
        }
        Long submissionId = pickup.getWasteSubmission() != null ? pickup.getWasteSubmission().getId() : null;
        Long hId = (pickup.getWasteSubmission() != null && pickup.getWasteSubmission().getHousehold() != null)
                ? pickup.getWasteSubmission().getHousehold().getId() : null;
        String hName = (pickup.getWasteSubmission() != null && pickup.getWasteSubmission().getHousehold() != null)
                ? pickup.getWasteSubmission().getHousehold().getName() : null;
        String address = pickup.getWasteSubmission() != null ? pickup.getWasteSubmission().getPickupAddress() : null;
        Long farmerId = pickup.getAssignedFarmer() != null ? pickup.getAssignedFarmer().getId() : null;
        String farmerName = (pickup.getAssignedFarmer() != null)
                ? pickup.getAssignedFarmer().getName() : null;
        VerificationApiResponse verif = pickup.getVerification() != null ? VerificationApiResponse.from(pickup.getVerification()) : null;

        return new PickupRequestApiResponse(
                pickup.getId(),
                submissionId,
                hId,
                hName,
                farmerId,
                farmerName,
                pickup.getStatus() != null ? pickup.getStatus().name() : null,
                address,
                pickup.getScheduledTime(),
                pickup.getCollectedAt(),
                pickup.getCancelledAt(),
                pickup.getCancellationReason(),
                verif,
                pickup.getCreatedAt(),
                pickup.getUpdatedAt()
        );
    }
}
