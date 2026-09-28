package com.agroloop.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Domain entity representing a trust review and rating exchanged between participants
 * (Households and Farmers) in the AgroLoop circular ecosystem.
 */
@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", nullable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewee_id", nullable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private User reviewee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private PickupRequest pickup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_type", nullable = false, length = 32)
    private ReviewType reviewType;

    @Column(nullable = false)
    private int rating;

    @Column(length = 1000)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Review() {
        // Required by JPA.
    }

    public Review(
            User reviewer,
            User reviewee,
            ReviewType reviewType,
            int rating,
            String comment,
            PickupRequest pickup,
            Order order
    ) {
        this.reviewer = Objects.requireNonNull(reviewer, "Reviewer must not be null");
        this.reviewee = Objects.requireNonNull(reviewee, "Reviewee must not be null");
        if (reviewer.getId() != null && reviewer.getId().equals(reviewee.getId())) {
            throw new IllegalArgumentException("User cannot review themselves");
        }
        this.reviewType = Objects.requireNonNull(reviewType, "ReviewType must not be null");
        validateRating(rating);
        this.rating = rating;
        this.comment = comment != null ? comment.trim() : null;
        if (this.comment != null && this.comment.length() > 1000) {
            throw new IllegalArgumentException("Review comment cannot exceed 1000 characters");
        }
        this.pickup = pickup;
        this.order = order;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    private void validateRating(int rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5 stars");
        }
    }

    public void update(int newRating, String newComment) {
        validateRating(newRating);
        this.rating = newRating;
        this.comment = newComment != null ? newComment.trim() : null;
        if (this.comment != null && this.comment.length() > 1000) {
            throw new IllegalArgumentException("Review comment cannot exceed 1000 characters");
        }
    }

    public Long getId() {
        return id;
    }

    public User getReviewer() {
        return reviewer;
    }

    public User getReviewee() {
        return reviewee;
    }

    public PickupRequest getPickup() {
        return pickup;
    }

    public Order getOrder() {
        return order;
    }

    public ReviewType getReviewType() {
        return reviewType;
    }

    public int getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
