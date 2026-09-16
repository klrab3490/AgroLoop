-- ====================================================================
-- Flyway Database Migration: V2__create_farmer_applications_table.sql
-- Module: Farmer Role Conversion Requests & Admin Approval
-- ====================================================================

CREATE TABLE IF NOT EXISTS farmer_applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    farm_name VARCHAR(150) NOT NULL,
    farm_address VARCHAR(500) NOT NULL,
    notes VARCHAR(1000),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_farmer_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_farmer_applications_user_id ON farmer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_farmer_applications_status ON farmer_applications(status);
