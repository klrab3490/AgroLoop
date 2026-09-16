-- ====================================================================
-- AgroLoop Initial Database Schema
-- Standalone PostgreSQL Initialization Script
-- ====================================================================

-- 1. Create Users Table (Base Entity)
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Create Households Table (Subtype)
CREATE TABLE IF NOT EXISTS households (
    id BIGINT PRIMARY KEY,
    token_balance NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    address VARCHAR(500),
    CONSTRAINT fk_households_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create Farmers Table (Subtype)
CREATE TABLE IF NOT EXISTS farmers (
    id BIGINT PRIMARY KEY,
    farm_name VARCHAR(150) NOT NULL,
    farm_address VARCHAR(500) NOT NULL,
    notes VARCHAR(1000),
    CONSTRAINT fk_farmers_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create Admins Table (Subtype)
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT PRIMARY KEY,
    CONSTRAINT fk_admins_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);
