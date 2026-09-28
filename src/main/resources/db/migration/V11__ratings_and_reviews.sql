-- ====================================================================
-- Flyway Database Migration: V11__ratings_and_reviews.sql
-- Module: Ratings, Reviews & Farmer/Household Reputation System (Phase 10)
-- Description: Creates reviews table, adds reputation columns to farmers
--              and households, and adds indexing and integrity constraints.
-- ====================================================================

-- 1. Add reputation aggregate columns to farmers
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0;

-- 2. Add reputation aggregate columns to households
ALTER TABLE households ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE households ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0;

-- 3. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pickup_id BIGINT REFERENCES pickup_requests(id) ON DELETE SET NULL,
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    review_type VARCHAR(32) NOT NULL,
    rating INT NOT NULL,
    comment VARCHAR(1000),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT chk_reviewer_not_reviewee CHECK (reviewer_id <> reviewee_id),
    CONSTRAINT chk_review_type CHECK (review_type IN ('PICKUP_EXPERIENCE', 'COMPOST_QUALITY', 'GENERAL'))
);

-- 4. Unique constraints to prevent duplicate reviews per transaction
CREATE UNIQUE INDEX IF NOT EXISTS uk_reviews_pickup_reviewer 
    ON reviews(pickup_id, reviewer_id) 
    WHERE pickup_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_reviews_order_reviewer 
    ON reviews(order_id, reviewer_id) 
    WHERE order_id IS NOT NULL;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
