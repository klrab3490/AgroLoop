-- ====================================================================
-- Flyway Database Migration: V10__waste_matcher_and_routes.sql
-- Module: Dynamic Matching & Collection Route Planning (Phase 9)
-- Description: Adds geo-coordinates and capacity attributes to farmers and
--              waste submissions. Creates collection_routes and route_stops
--              tables for polymorphic WasteMatcher dispatch and TSP-ordered
--              multi-stop pickup routes.
-- ====================================================================

-- 1. Add GPS coordinates, service radius, and daily capacity to farmers
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) DEFAULT 10.8505;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT 76.2711;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC(6, 2) NOT NULL DEFAULT 25.0;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS max_daily_capacity_kg NUMERIC(10, 2) NOT NULL DEFAULT 200.0;

-- 2. Add GPS coordinates to waste submissions (pickup location coordinates)
ALTER TABLE waste_submissions ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) DEFAULT 10.8505;
ALTER TABLE waste_submissions ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT 76.2711;

-- 3. Create collection_routes table
CREATE TABLE IF NOT EXISTS collection_routes (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    route_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
    total_distance_km NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    total_estimated_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    notes VARCHAR(1000),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_route_status CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

-- 4. Create route_stops table (sequenced multi-stop pickup plan)
CREATE TABLE IF NOT EXISTS route_stops (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL REFERENCES collection_routes(id) ON DELETE CASCADE,
    pickup_id BIGINT NOT NULL REFERENCES pickup_requests(id) ON DELETE CASCADE,
    stop_order INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    estimated_distance_from_prev_km NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    notes VARCHAR(500),
    CONSTRAINT chk_stop_status CHECK (status IN ('PENDING', 'COMPLETED', 'SKIPPED')),
    CONSTRAINT uk_route_stop_order UNIQUE (route_id, stop_order),
    CONSTRAINT uk_route_pickup UNIQUE (route_id, pickup_id)
);

-- 5. Indexes for fast geospatial and route queries
CREATE INDEX IF NOT EXISTS idx_collection_routes_farmer_date ON collection_routes(farmer_id, route_date);
CREATE INDEX IF NOT EXISTS idx_collection_routes_status ON collection_routes(status);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_pickup ON route_stops(pickup_id);
