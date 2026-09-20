package com.agroloop.dto.api.v1.response;

import com.agroloop.model.SubmissionStatus;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WasteSubmissionApiResponse(
        Long id,
        Long householdId,
        WasteCategory category,
        BigDecimal estimatedWeight,
        SubmissionStatus status,
        String mediaId,
        String mediaUrl,
        String collectionAddress,
        LocalDateTime createdAt
) {
    public static WasteSubmissionApiResponse from(WasteSubmission submission) {
        if (submission == null) {
            return null;
        }
        Long householdId = submission.getHousehold() != null ? submission.getHousehold().getId() : null;
        return new WasteSubmissionApiResponse(
                submission.getId(),
                householdId,
                submission.getCategory(),
                submission.getEstimatedWeight(),
                submission.getStatus(),
                null,
                submission.getImagePath(),
                submission.getPickupAddress(),
                submission.getCreatedAt()
        );
    }
}
