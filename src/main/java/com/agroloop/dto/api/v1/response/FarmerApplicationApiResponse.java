package com.agroloop.dto.api.v1.response;

import com.agroloop.model.FarmerApplication;
import java.time.LocalDateTime;

public record FarmerApplicationApiResponse(
        Long id,
        Long userId,
        String userName,
        String userEmail,
        String farmName,
        String farmAddress,
        String notes,
        String status,
        String rejectionReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {
    public static FarmerApplicationApiResponse from(FarmerApplication app) {
        if (app == null) return null;
        return new FarmerApplicationApiResponse(
                app.getId(),
                app.getUser() != null ? app.getUser().getId() : null,
                app.getUser() != null ? app.getUser().getName() : null,
                app.getUser() != null ? app.getUser().getEmail() : null,
                app.getFarmName(),
                app.getFarmAddress(),
                app.getNotes(),
                app.getStatus() != null ? app.getStatus().name() : null,
                app.getRejectionReason(),
                app.getCreatedAt(),
                app.getReviewedAt()
        );
    }
}
