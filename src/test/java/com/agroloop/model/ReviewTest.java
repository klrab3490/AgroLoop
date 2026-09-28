package com.agroloop.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Review Entity Domain Tests")
class ReviewTest {

    @Test
    @DisplayName("Should create valid Review with rating between 1 and 5")
    void shouldCreateValidReview() {
        Household household = new Household("Alice", "alice@example.com", "hash", "123 Street");
        Farmer farmer = new Farmer("Bob", "bob@example.com", "hash", "Bob Farm", "456 Farm Rd", "Organic");

        Review review = new Review(
                household,
                farmer,
                ReviewType.PICKUP_EXPERIENCE,
                5,
                "Outstanding pickup service, on time and polite!",
                null,
                null
        );

        assertThat(review.getReviewer()).isEqualTo(household);
        assertThat(review.getReviewee()).isEqualTo(farmer);
        assertThat(review.getReviewType()).isEqualTo(ReviewType.PICKUP_EXPERIENCE);
        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).contains("Outstanding pickup service");
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when rating is less than 1 or greater than 5")
    void shouldRejectInvalidRatingRange() {
        Household household = new Household("Alice", "alice@example.com", "hash", "123 Street");
        Farmer farmer = new Farmer("Bob", "bob@example.com", "hash", "Bob Farm", "456 Farm Rd", "Organic");

        assertThatThrownBy(() -> new Review(household, farmer, ReviewType.PICKUP_EXPERIENCE, 0, "Bad", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 5 stars");

        assertThatThrownBy(() -> new Review(household, farmer, ReviewType.PICKUP_EXPERIENCE, 6, "Too good", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 5 stars");
    }

    @Test
    @DisplayName("Should reject self-reviews when reviewer and reviewee are identical")
    void shouldRejectSelfReview() {
        Household household = new Household("Alice", "alice@example.com", "hash", "123 Street");
        // Reflectively set ID if needed, or if IDs match
        try {
            var idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(household, 42L);

            Household sameHousehold = new Household("Alice Copy", "alice2@example.com", "hash", "123 Street");
            idField.set(sameHousehold, 42L);

            assertThatThrownBy(() -> new Review(household, sameHousehold, ReviewType.GENERAL, 5, "I am great", null, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("cannot review themselves");
        } catch (NoSuchFieldException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("Should update rating and comment with validation")
    void shouldUpdateReview() {
        Household household = new Household("Alice", "alice@example.com", "hash", "123 Street");
        Farmer farmer = new Farmer("Bob", "bob@example.com", "hash", "Bob Farm", "456 Farm Rd", "Organic");

        Review review = new Review(household, farmer, ReviewType.COMPOST_QUALITY, 4, "Good quality", null, null);
        review.update(5, "Updated to excellent quality after checking results");

        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).contains("Updated to excellent");
    }
}
