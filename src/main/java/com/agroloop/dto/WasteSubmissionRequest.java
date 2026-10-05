package com.agroloop.dto;

import com.agroloop.model.WasteCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

/**
 * Data Transfer Object backing the Household organic waste submission form.
 */
public class WasteSubmissionRequest {

    @NotNull(message = "Please select a valid waste category.")
    private WasteCategory category;

    @NotNull(message = "Estimated weight is required.")
    @DecimalMin(value = "0.10", message = "Minimum waste batch weight is 0.10 kg.")
    @DecimalMax(value = "1000.00", message = "Maximum waste batch weight is 1,000.00 kg.")
    private BigDecimal estimatedWeight;

    @Size(max = 500, message = "Pickup address cannot exceed 500 characters.")
    private String pickupAddress;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters.")
    private String notes;

    private MultipartFile photo;

    private Double latitude;

    private Double longitude;

    public WasteSubmissionRequest() {
    }

    public WasteSubmissionRequest(
            WasteCategory category,
            BigDecimal estimatedWeight,
            String pickupAddress,
            String notes,
            MultipartFile photo
    ) {
        this(category, estimatedWeight, pickupAddress, notes, photo, null, null);
    }

    public WasteSubmissionRequest(
            WasteCategory category,
            BigDecimal estimatedWeight,
            String pickupAddress,
            String notes,
            MultipartFile photo,
            Double latitude,
            Double longitude
    ) {
        this.category = category;
        this.estimatedWeight = estimatedWeight;
        this.pickupAddress = pickupAddress;
        this.notes = notes;
        this.photo = photo;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public WasteCategory getCategory() {
        return category;
    }

    public void setCategory(WasteCategory category) {
        this.category = category;
    }

    public BigDecimal getEstimatedWeight() {
        return estimatedWeight;
    }

    public void setEstimatedWeight(BigDecimal estimatedWeight) {
        this.estimatedWeight = estimatedWeight;
    }

    public String getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public MultipartFile getPhoto() {
        return photo;
    }

    public void setPhoto(MultipartFile photo) {
        this.photo = photo;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }
}

