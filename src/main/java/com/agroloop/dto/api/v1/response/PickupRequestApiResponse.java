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
    Boolean handshakeVerified,
    Long latestHandshakeId,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    String category,
    Double estimatedWeight,
    Double latitude,
    Double longitude,
    String notes,
    String householdEmail,
    String userName,
    String userEmail
) {
    public PickupRequestApiResponse(
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
            Boolean handshakeVerified,
            Long latestHandshakeId,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String category,
            Double estimatedWeight,
            Double latitude,
            Double longitude,
            String notes
    ) {
        this(id, wasteSubmissionId, householdId, householdName, assignedFarmerId, assignedFarmerName, status,
                pickupAddress, scheduledTime, collectedAt, cancelledAt, cancellationReason, verification,
                handshakeVerified, latestHandshakeId, createdAt, updatedAt, category, estimatedWeight,
                latitude, longitude, notes, null, null, null);
    }

    public static PickupRequestApiResponse from(PickupRequest pickup) {
        return from(pickup, null);
    }

    public static PickupRequestApiResponse from(PickupRequest pickup, Boolean handshakeVerified) {
        if (pickup == null) {
            return null;
        }
        var sub = pickup.getWasteSubmission();
        Long submissionId = sub != null ? sub.getId() : null;
        Long hId = (sub != null && sub.getHousehold() != null)
                ? sub.getHousehold().getId() : null;
        String hName = (sub != null && sub.getHousehold() != null)
                ? sub.getHousehold().getName() : null;
        String hEmail = (sub != null && sub.getHousehold() != null)
                ? sub.getHousehold().getEmail() : null;
        String address = sub != null ? sub.getPickupAddress() : null;
        String category = (sub != null && sub.getCategory() != null) ? sub.getCategory().name() : null;
        Double estWeight = (sub != null && sub.getEstimatedWeight() != null) ? sub.getEstimatedWeight().doubleValue() : null;
        Double lat = sub != null ? sub.getLatitude() : null;
        Double lng = sub != null ? sub.getLongitude() : null;
        String notes = sub != null ? sub.getNotes() : null;

        Long farmerId = pickup.getAssignedFarmer() != null ? pickup.getAssignedFarmer().getId() : null;
        String farmerName = (pickup.getAssignedFarmer() != null)
                ? pickup.getAssignedFarmer().getName() : null;
        VerificationApiResponse verif = pickup.getVerification() != null ? VerificationApiResponse.from(pickup.getVerification()) : null;

        Boolean verifiedFlag = handshakeVerified;
        if (verifiedFlag == null && pickup.getLatestHandshakeId() != null) {
            verifiedFlag = true;
        }

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
                verifiedFlag != null && verifiedFlag,
                pickup.getLatestHandshakeId(),
                pickup.getCreatedAt(),
                pickup.getUpdatedAt(),
                category,
                estWeight,
                lat,
                lng,
                notes,
                hEmail,
                hName,
                hEmail
        );
    }
}
