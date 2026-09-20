-- ====================================================================
-- Flyway Database Migration: V7__create_admin_and_refund_governance.sql
-- Module: Order Lifecycle, Atomic Refund Engine & Admin Governance (Phase 7)
-- Description: Enforces financial ledger invariants, partial unique indexes,
--              physical ledger immutability trigger, non-negative balances,
--              staged farmer snapshot on order items, and dispute audit columns.
-- ====================================================================

-- 1. Non-Negative Balance Safety Constraint on Households
ALTER TABLE households 
    ADD CONSTRAINT chk_households_token_balance CHECK (token_balance >= 0);

-- 2. Order Audit, Status & Dispute Columns
ALTER TABLE orders 
    ADD COLUMN cancellation_reason VARCHAR(500),
    ADD COLUMN cancelled_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN cancellation_actor_id BIGINT REFERENCES users(id),
    ADD COLUMN dispute_reason VARCHAR(500),
    ADD COLUMN disputed_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN dispute_actor_id BIGINT REFERENCES users(id),
    ADD COLUMN resolution_type VARCHAR(50),
    ADD COLUMN resolution_notes VARCHAR(1000),
    ADD COLUMN resolved_by BIGINT REFERENCES users(id),
    ADD COLUMN resolved_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE orders 
    ADD CONSTRAINT chk_orders_status 
    CHECK (status IN ('PLACED', 'COMPLETED', 'DISPUTED', 'CANCELLED'));

ALTER TABLE orders 
    ADD CONSTRAINT chk_orders_resolution_type CHECK (
        resolution_type IS NULL 
        OR resolution_type IN ('APPROVED_REFUND', 'DISMISSED')
    );

-- 3. Staged OrderItem Historical Snapshot Reference (farmer_id)
ALTER TABLE order_items 
    ADD COLUMN farmer_id BIGINT;

UPDATE order_items oi
SET farmer_id = p.farmer_id
FROM products p
WHERE oi.product_id = p.id;

-- Assertion guard: abort migration if unresolvable
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM order_items WHERE farmer_id IS NULL) THEN
        RAISE EXCEPTION 'Migration failed: found order_items with unresolvable farmer_id';
    END IF;
END $$;

ALTER TABLE order_items 
    ALTER COLUMN farmer_id SET NOT NULL;

ALTER TABLE order_items 
    ADD CONSTRAINT fk_order_items_farmer 
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_order_items_farmer_id ON order_items(farmer_id);

-- 4. Historical Ledger Assertion Guard & Defensive Refactoring
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM ecotoken_transactions 
        WHERE (transaction_type = 'REWARD_MINTED' AND (waste_verification_id IS NULL OR order_id IS NOT NULL))
           OR (transaction_type = 'MARKETPLACE_PURCHASE' AND (order_id IS NULL OR waste_verification_id IS NOT NULL))
           OR (amount < 0 OR (amount = 0 AND transaction_type != 'REWARD_MINTED'))
           OR balance_after < 0
    ) THEN
        RAISE EXCEPTION 'Migration failed: found inconsistent historical ecotoken_transactions';
    END IF;
END $$;

ALTER TABLE ecotoken_transactions 
    ADD COLUMN direction VARCHAR(20);

UPDATE ecotoken_transactions
SET direction = CASE transaction_type
    WHEN 'REWARD_MINTED' THEN 'CREDIT'
    WHEN 'MARKETPLACE_PURCHASE' THEN 'DEBIT'
    ELSE NULL
END;

-- Assertion guard: abort migration if unresolvable direction
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM ecotoken_transactions WHERE direction IS NULL) THEN
        RAISE EXCEPTION 'Migration failed: found ecotoken_transactions with unresolvable direction';
    END IF;
END $$;

ALTER TABLE ecotoken_transactions 
    ALTER COLUMN direction SET NOT NULL;

ALTER TABLE ecotoken_transactions 
    ADD CONSTRAINT chk_ecotoken_transactions_direction CHECK (direction IN ('CREDIT', 'DEBIT'));

ALTER TABLE ecotoken_transactions 
    ADD COLUMN actor_id BIGINT NULL REFERENCES users(id);

-- For historical MARKETPLACE_PURCHASE rows, backfill actor_id from order's household_id (which is users.id)
UPDATE ecotoken_transactions t
SET actor_id = o.household_id
FROM orders o
WHERE t.order_id = o.id
  AND t.actor_id IS NULL
  AND t.transaction_type = 'MARKETPLACE_PURCHASE';

ALTER TABLE ecotoken_transactions 
    ADD CONSTRAINT chk_ecotoken_transactions_amount CHECK (amount > 0 OR (transaction_type = 'REWARD_MINTED' AND amount = 0));

-- Actor constraint: automated rewards may have null actor, all other transactions require an actor
ALTER TABLE ecotoken_transactions 
    ADD CONSTRAINT chk_ecotoken_transactions_actor CHECK (
        transaction_type = 'REWARD_MINTED'
        OR actor_id IS NOT NULL
    );

-- Drop Phase 6 singular order uniqueness constraint
ALTER TABLE ecotoken_transactions 
    DROP CONSTRAINT IF EXISTS uq_ecotoken_transactions_order;

-- Single refund guarantee via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecotoken_transactions_order_refund 
    ON ecotoken_transactions (order_id) 
    WHERE transaction_type = 'ORDER_REFUND';

-- Single purchase guarantee via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecotoken_transactions_order_purchase 
    ON ecotoken_transactions (order_id) 
    WHERE transaction_type = 'MARKETPLACE_PURCHASE';

-- Complete transaction type & direction matrix check
ALTER TABLE ecotoken_transactions 
    DROP CONSTRAINT IF EXISTS chk_ecotoken_transactions_relationship;

ALTER TABLE ecotoken_transactions 
    ADD CONSTRAINT chk_ecotoken_transactions_relationship CHECK (
        (transaction_type = 'REWARD_MINTED' AND direction = 'CREDIT' AND waste_verification_id IS NOT NULL AND order_id IS NULL)
        OR
        (transaction_type = 'MARKETPLACE_PURCHASE' AND direction = 'DEBIT' AND waste_verification_id IS NULL AND order_id IS NOT NULL)
        OR
        (transaction_type = 'ORDER_REFUND' AND direction = 'CREDIT' AND waste_verification_id IS NULL AND order_id IS NOT NULL)
        OR
        (transaction_type = 'ADMIN_ADJUSTMENT' AND direction IN ('CREDIT', 'DEBIT') AND waste_verification_id IS NULL AND order_id IS NULL)
    );

-- 5. Physical Immutability: Prevent UPDATE or DELETE on ledger entries
CREATE OR REPLACE FUNCTION prevent_ecotoken_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ecotoken_transactions rows are immutable: updates and deletes are strictly prohibited';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ecotoken_transactions_immutable ON ecotoken_transactions;
CREATE TRIGGER trg_ecotoken_transactions_immutable
BEFORE UPDATE OR DELETE ON ecotoken_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_ecotoken_transaction_mutation();
