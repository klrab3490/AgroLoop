package com.agroloop.dto;

import com.agroloop.model.QualityGrade;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Form backing object for recording post-collection waste verification and grading.
 */
public class WasteVerificationRequest {

    @NotNull(message = "Verified weight is required")
    @DecimalMin(value = "0.01", message = "Verified weight must be greater than zero kg")
    private BigDecimal verifiedWeight;

    @NotNull(message = "Quality grade is required")
    private QualityGrade qualityGrade;

    @Size(max = 1000, message = "Verification notes cannot exceed 1000 characters")
    private String notes;

    public WasteVerificationRequest() {
    }

    public WasteVerificationRequest(BigDecimal verifiedWeight, QualityGrade qualityGrade, String notes) {
        this.verifiedWeight = verifiedWeight;
        this.qualityGrade = qualityGrade;
        this.notes = notes;
    }

    public BigDecimal getVerifiedWeight() {
        return verifiedWeight;
    }

    public void setVerifiedWeight(BigDecimal verifiedWeight) {
        this.verifiedWeight = verifiedWeight;
    }

    public QualityGrade getQualityGrade() {
        return qualityGrade;
    }

    public void setQualityGrade(QualityGrade qualityGrade) {
        this.qualityGrade = qualityGrade;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
