-- ====================================================================
-- Flyway Database Migration: V5__create_ecotoken_transactions_table.sql
-- Module: EcoTokens & Reward Minting Engine (Phase 5)
-- Description: Creates immutable ledger table for EcoToken transactions
-- ====================================================================

CREATE TABLE IF NOT EXISTS ecotoken_transactions (
    id BIGSERIAL,
    household_id BIGINT NOT NULL,
    waste_verification_id BIGINT NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    balance_after NUMERIC(19, 2) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_ecotoken_transactions PRIMARY KEY (id),
    CONSTRAINT uq_ecotoken_transactions_verification UNIQUE (waste_verification_id),
    CONSTRAINT fk_ecotoken_transactions_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT fk_ecotoken_transactions_verification FOREIGN KEY (waste_verification_id) REFERENCES waste_verifications(id) ON DELETE RESTRICT,
    CONSTRAINT chk_ecotoken_transactions_balance_after CHECK (balance_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ecotoken_transactions_household_id ON ecotoken_transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_ecotoken_transactions_created_at ON ecotoken_transactions(created_at DESC);
