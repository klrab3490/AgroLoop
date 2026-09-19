-- ====================================================================
-- Flyway Database Migration: V6__create_marketplace_tables.sql
-- Module: Sustainable Marketplace & Commerce (Phase 6)
-- Description: Creates orders, products, and order_items tables, and
--              evolves ecotoken_transactions for purchase debit ledgers.
-- ====================================================================

-- 1. Relax waste_verification_id nullability to allow non-reward transactions
ALTER TABLE ecotoken_transactions ALTER COLUMN waste_verification_id DROP NOT NULL;

-- 2. Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    household_id BIGINT NOT NULL,
    total_tokens NUMERIC(19, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    delivery_address VARCHAR(500) NOT NULL,
    notes VARCHAR(1000),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE RESTRICT,
    CONSTRAINT chk_orders_total_tokens CHECK (total_tokens > 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_household_id ON orders(household_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 3. Create products table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(1000),
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price_in_tokens NUMERIC(19, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_products_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_products_price CHECK (price_in_tokens > 0),
    CONSTRAINT chk_products_stock CHECK (stock >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_farmer_id ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- 4. Create order_items table (capturing immutable historical snapshots)
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    unit_price NUMERIC(19, 2) NOT NULL,
    quantity INT NOT NULL,
    subtotal NUMERIC(19, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    farmer_name VARCHAR(150) NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_items_unit_price CHECK (unit_price > 0),
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_items_subtotal CHECK (subtotal > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 5. Add order_id column and foreign key to ecotoken_transactions
ALTER TABLE ecotoken_transactions ADD COLUMN IF NOT EXISTS order_id BIGINT;

ALTER TABLE ecotoken_transactions 
    ADD CONSTRAINT fk_ecotoken_transactions_order 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

ALTER TABLE ecotoken_transactions 
    ADD CONSTRAINT uq_ecotoken_transactions_order 
    UNIQUE (order_id);

CREATE INDEX IF NOT EXISTS idx_ecotoken_transactions_order_id ON ecotoken_transactions(order_id);

-- 6. Enforce transaction type matrix invariant at database level
ALTER TABLE ecotoken_transactions 
    ADD CONSTRAINT chk_ecotoken_transactions_relationship CHECK (
        (transaction_type = 'REWARD_MINTED' AND waste_verification_id IS NOT NULL AND order_id IS NULL)
        OR
        (transaction_type = 'MARKETPLACE_PURCHASE' AND waste_verification_id IS NULL AND order_id IS NOT NULL)
    );
