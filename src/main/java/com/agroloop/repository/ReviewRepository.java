package com.agroloop.repository;

import com.agroloop.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Page<Review> findByRevieweeIdOrderByCreatedAtDesc(Long revieweeId, Pageable pageable);

    List<Review> findByRevieweeIdOrderByCreatedAtDesc(Long revieweeId);

    Page<Review> findByReviewerIdOrderByCreatedAtDesc(Long reviewerId, Pageable pageable);

    Optional<Review> findByPickupIdAndReviewerId(Long pickupId, Long reviewerId);

    Optional<Review> findByOrderIdAndReviewerId(Long orderId, Long reviewerId);

    boolean existsByPickupIdAndReviewerId(Long pickupId, Long reviewerId);

    boolean existsByOrderIdAndReviewerId(Long orderId, Long reviewerId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.reviewee.id = :revieweeId")
    Double calculateAverageRatingByRevieweeId(@Param("revieweeId") Long revieweeId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.reviewee.id = :revieweeId")
    long countByRevieweeId(@Param("revieweeId") Long revieweeId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.reviewee.id = :revieweeId GROUP BY r.rating")
    List<Object[]> countRatingsByStar(@Param("revieweeId") Long revieweeId);
}
