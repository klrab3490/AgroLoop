-- ====================================================================
-- Flyway Database Migration: V8__api_sessions_idempotency_media.sql
-- Module: Multi-Platform API Boundary, Auth Sessions, Idempotency & Media (Phase 7.5)
-- Description: Creates auth_sessions for UUID family_id refresh token tracking,
--              idempotency_keys for atomic state mutation & replay safety,
--              and media_assets for managed upload verification & attachment.
-- ====================================================================

-- 1. Refresh Token Sessions with UUID Token Family Hierarchy
CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) UNIQUE NOT NULL,
    family_id UUID NOT NULL,
    device_name VARCHAR(128),
    client_type VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITHOUT TIME ZONE,
    last_used_at TIMESTAMP WITHOUT TIME ZONE,
    rotated_from_session_id BIGINT REFERENCES auth_sessions(id) ON DELETE SET NULL,
    CONSTRAINT chk_auth_client_type CHECK (client_type IN ('MOBILE', 'DESKTOP', 'WEB'))
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_hash ON auth_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_revoked ON auth_sessions(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_expires ON auth_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_family ON auth_sessions(family_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_rotated_from ON auth_sessions(rotated_from_session_id);

-- 2. Scoped Idempotency Keys with Encryption & Crash Recovery
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id BIGSERIAL PRIMARY KEY,
    scope_key VARCHAR(128) NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    response_status_code INT,
    response_body TEXT,
    response_body_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    encryption_key_id VARCHAR(64),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT uk_idempotency_scope_key_endpoint UNIQUE (scope_key, idempotency_key, endpoint),
    CONSTRAINT chk_idempotency_status CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
    CONSTRAINT chk_idempotency_encryption CHECK (NOT response_body_encrypted OR encryption_key_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(scope_key, endpoint, idempotency_key);

-- 3. Managed Media Assets with Checksums and Lifecycle States
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(64) PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    purpose VARCHAR(64) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    content_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(128),
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    attached_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT chk_media_status CHECK (status IN ('PENDING_UPLOAD', 'CONFIRMED', 'ATTACHED', 'EXPIRED')),
    CONSTRAINT chk_media_purpose CHECK (purpose IN ('WASTE_SUBMISSION', 'PICKUP_VERIFICATION', 'PRODUCT_IMAGE', 'USER_AVATAR'))
);

CREATE INDEX IF NOT EXISTS idx_media_assets_owner_status ON media_assets(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_media_assets_expires ON media_assets(expires_at);
