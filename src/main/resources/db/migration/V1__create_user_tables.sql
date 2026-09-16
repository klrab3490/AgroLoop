-- ====================================================================
-- Flyway Database Migration: V1__create_user_tables.sql
-- Module: User Management & Authentication (Phase 2)
-- Architecture: JPA Joined Table Inheritance (User -> Household, Farmer, Admin)
-- ====================================================================

-- 1. Base Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups by email during authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Household Subtype Table
CREATE TABLE IF NOT EXISTS households (
    id BIGINT PRIMARY KEY,
    token_balance NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    address VARCHAR(500),
    CONSTRAINT fk_households_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Farmer Subtype Table
CREATE TABLE IF NOT EXISTS farmers (
    id BIGINT PRIMARY KEY,
    farm_name VARCHAR(150) NOT NULL,
    farm_address VARCHAR(500) NOT NULL,
    notes VARCHAR(1000),
    CONSTRAINT fk_farmers_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Admin Subtype Table
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT PRIMARY KEY,
    CONSTRAINT fk_admins_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);
