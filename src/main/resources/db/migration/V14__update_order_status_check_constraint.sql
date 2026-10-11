-- ====================================================================
-- Flyway Database Migration: V14__update_order_status_check_constraint.sql
-- Module: Marketplace Order Lifecycle & Farmer Fulfillment
-- Description: Updates the chk_orders_status constraint on the orders table
--              to include PACKED and IN_TRANSIT statuses required for producer
--              packing and courier dispatch.
-- ====================================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;

ALTER TABLE orders 
    ADD CONSTRAINT chk_orders_status 
    CHECK (status IN ('PLACED', 'PACKED', 'IN_TRANSIT', 'COMPLETED', 'DISPUTED', 'CANCELLED'));
