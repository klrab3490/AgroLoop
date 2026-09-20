package com.agroloop.dto.api.v1.response;

import com.agroloop.model.QualityGrade;
import com.agroloop.model.WasteVerification;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VerificationApiResponse(
        BigDecimal verifiedWeight,
        QualityGrade qualityGrade,
        BigDecimal tokensAwarded,
        LocalDateTime verifiedAt,
        String mediaId,
        String notes
) {
    public static VerificationApiResponse from(WasteVerification v) {
        if (v == null) {
            return null;
        }
        return new VerificationApiResponse(
                v.getVerifiedWeight(),
                v.getQualityGrade(),
                BigDecimal.ZERO,
                v.getVerifiedAt(),
                null,
                v.getVerificationNotes()
        );
    }
}
