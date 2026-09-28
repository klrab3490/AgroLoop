package com.agroloop.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ReviewSubmissionForm {

    private Long pickupId;
    private Long orderId;

    @NotNull(message = "Please select a rating from 1 to 5 stars")
    @Min(value = 1, message = "Rating must be at least 1 star")
    @Max(value = 5, message = "Rating cannot exceed 5 stars")
    private Integer rating = 5;

    @Size(max = 1000, message = "Feedback comment cannot exceed 1000 characters")
    private String comment;

    public ReviewSubmissionForm() {
    }

    public ReviewSubmissionForm(Long pickupId, Long orderId, Integer rating, String comment) {
        this.pickupId = pickupId;
        this.orderId = orderId;
        this.rating = rating;
        this.comment = comment;
    }

    public Long getPickupId() {
        return pickupId;
    }

    public void setPickupId(Long pickupId) {
        this.pickupId = pickupId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
