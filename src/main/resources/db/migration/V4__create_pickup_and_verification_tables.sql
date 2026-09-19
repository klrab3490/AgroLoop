-- ====================================================================
-- Flyway Database Migration: V4__create_pickup_and_verification_tables.sql
-- Module: Pickup Management & Verification Engine (Phase 4)
-- Description: Creates tables for pickup requests and waste verifications
-- ====================================================================

-- 1. Pickup Requests Table
CREATE TABLE IF NOT EXISTS pickup_requests (
    id BIGSERIAL PRIMARY KEY,
    waste_submission_id BIGINT NOT NULL UNIQUE,
    farmer_id BIGINT,
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    scheduled_time TIMESTAMP WITHOUT TIME ZONE,
    collected_at TIMESTAMP WITHOUT TIME ZONE,
    cancelled_at TIMESTAMP WITHOUT TIME ZONE,
    cancellation_reason VARCHAR(500),
    decline_reason VARCHAR(500),
    declined_at TIMESTAMP WITHOUT TIME ZONE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_pickup_requests_waste_submission FOREIGN KEY (waste_submission_id) REFERENCES waste_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_pickup_requests_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pickup_requests_waste_submission_id ON pickup_requests(waste_submission_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_farmer_id ON pickup_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status ON pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_created_at ON pickup_requests(created_at DESC);

-- 2. Waste Verifications Table
CREATE TABLE IF NOT EXISTS waste_verifications (
    id BIGSERIAL PRIMARY KEY,
    pickup_request_id BIGINT NOT NULL UNIQUE,
    farmer_id BIGINT NOT NULL,
    verified_weight NUMERIC(10, 2) NOT NULL,
    quality_grade VARCHAR(30) NOT NULL,
    verification_notes VARCHAR(1000),
    verified_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_waste_verifications_pickup_request FOREIGN KEY (pickup_request_id) REFERENCES pickup_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_waste_verifications_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
    CONSTRAINT chk_waste_verifications_weight CHECK (verified_weight > 0)
);

CREATE INDEX IF NOT EXISTS idx_waste_verifications_pickup_request_id ON waste_verifications(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_waste_verifications_farmer_id ON waste_verifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_waste_verifications_verified_at ON waste_verifications(verified_at DESC);
