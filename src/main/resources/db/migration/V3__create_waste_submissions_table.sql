-- ====================================================================
-- Flyway Database Migration: V3__create_waste_submissions_table.sql
-- Module: Waste Submission & Media Processing (Phase 3)
-- Description: Creates table for household organic waste submissions
-- ====================================================================

CREATE TABLE IF NOT EXISTS waste_submissions (
    id BIGSERIAL PRIMARY KEY,
    household_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    estimated_weight NUMERIC(10, 2) NOT NULL,
    pickup_address VARCHAR(500) NOT NULL,
    image_path VARCHAR(500),
    notes VARCHAR(1000),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    rejection_reason VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_waste_submissions_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT chk_waste_submissions_weight CHECK (estimated_weight > 0)
);

CREATE INDEX IF NOT EXISTS idx_waste_submissions_household_id ON waste_submissions(household_id);
CREATE INDEX IF NOT EXISTS idx_waste_submissions_status ON waste_submissions(status);
CREATE INDEX IF NOT EXISTS idx_waste_submissions_created_at ON waste_submissions(created_at DESC);
