-- ====================================================================
-- Flyway Database Migration: V9__pickup_handshake.sql
-- Module: Physical On-Site Pickup Handshake & Cryptographic Passes (Phase 8)
-- Description: Creates pickup_handshakes table for tamper-evident,
--              server-authenticated on-site handshakes with single-use nonces,
--              status lifecycle (ISSUED, CONSUMED, EXPIRED, INVALIDATED),
--              and production active-pass partial uniqueness index.
-- ====================================================================

CREATE TABLE IF NOT EXISTS pickup_handshakes (
    id BIGSERIAL PRIMARY KEY,
    pickup_id BIGINT NOT NULL REFERENCES pickup_requests(id) ON DELETE CASCADE,
    household_id BIGINT NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
    farmer_id BIGINT REFERENCES farmers(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ISSUED',
    nonce VARCHAR(64) UNIQUE NOT NULL,
    pass_code_hash VARCHAR(64) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    issued_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITHOUT TIME ZONE,
    invalidated_at TIMESTAMP WITHOUT TIME ZONE,
    verification_method VARCHAR(32),
    signature VARCHAR(128) NOT NULL,
    CONSTRAINT chk_handshake_status CHECK (status IN ('ISSUED', 'CONSUMED', 'EXPIRED', 'INVALIDATED')),
    CONSTRAINT chk_handshake_method CHECK (verification_method IS NULL OR verification_method IN ('QR_SCAN', 'MANUAL_PASSCODE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pickup_handshakes_nonce ON pickup_handshakes(nonce);
CREATE INDEX IF NOT EXISTS idx_pickup_handshakes_pickup_status ON pickup_handshakes(pickup_id, status);
CREATE INDEX IF NOT EXISTS idx_pickup_handshakes_farmer ON pickup_handshakes(farmer_id);

-- PostgreSQL partial unique index ensuring at most one active ISSUED handshake per pickup
CREATE UNIQUE INDEX IF NOT EXISTS uk_pickup_handshakes_active_issued 
ON pickup_handshakes(pickup_id) 
WHERE status = 'ISSUED';

-- Alter pickup_requests to store latest handshake convenience reference
ALTER TABLE pickup_requests ADD COLUMN IF NOT EXISTS latest_handshake_id BIGINT REFERENCES pickup_handshakes(id) ON DELETE SET NULL;
