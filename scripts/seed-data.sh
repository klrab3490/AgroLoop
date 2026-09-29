#!/usr/bin/env bash
# ==============================================================================
# AgroLoop Database Seed Script (scripts/seed-data.sh)
# Seeds rich Fleet & Marketplace dummy data directly into PostgreSQL
# ==============================================================================

set -euo pipefail

# Terminal colors
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
BOLD='\033[1m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_FILE="${ROOT_DIR}/docker/seed-dummy-data.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: Seed SQL file not found at ${SQL_FILE}${RESET}"
    exit 1
fi

echo -e "${BOLD}${CYAN}AgroLoop Database Seeder${RESET}"
echo -e "Target script: ${SQL_FILE}"
echo ""

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-agroloop}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-7200}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# 1. Try finding a running Docker postgres container
CONTAINER_NAME=""
if command -v docker >/dev/null 2>&1; then
    for candidate in enterprise_postgres agroloop-postgres agroloop_postgres postgres; do
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -qw "^${candidate}$"; then
            CONTAINER_NAME="$candidate"
            break
        fi
    done

    # If not found by exact name, look for any container running postgres
    if [ -z "$CONTAINER_NAME" ]; then
        CONTAINER_NAME=$(docker ps --filter "ancestor=pgvector/pgvector:pg18" --format '{{.Names}}' 2>/dev/null | head -n 1 || true)
    fi
    if [ -z "$CONTAINER_NAME" ]; then
        CONTAINER_NAME=$(docker ps --filter "name=postgres" --format '{{.Names}}' 2>/dev/null | head -n 1 || true)
    fi
fi

if [ -n "$CONTAINER_NAME" ]; then
    echo -e "${YELLOW}Detected running PostgreSQL container: ${BOLD}${CONTAINER_NAME}${RESET}"
    echo -e "${CYAN}Executing seed script inside container...${RESET}"
    docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SQL_FILE"
    echo ""
    echo -e "${BOLD}${GREEN}✓ Dummy data seeded successfully via Docker container [${CONTAINER_NAME}]!${RESET}"
elif command -v psql >/dev/null 2>&1; then
    echo -e "${YELLOW}No Docker postgres container detected. Attempting direct psql connection to localhost:${POSTGRES_PORT}...${RESET}"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SQL_FILE"
    echo ""
    echo -e "${BOLD}${GREEN}✓ Dummy data seeded successfully via host psql!${RESET}"
else
    echo -e "${RED}Error: Neither a running PostgreSQL Docker container nor host 'psql' binary was found.${RESET}"
    echo -e "Ensure PostgreSQL is running via ${CYAN}docker compose up -d postgres${RESET} or ${CYAN}make docker-db${RESET}."
    exit 1
fi

echo ""
echo -e "${BOLD}${CYAN}Summary of Database Records:${RESET}"
if [ -n "$CONTAINER_NAME" ]; then
    docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
        SELECT 'Users' AS entity, COUNT(*)::text AS count FROM users
        UNION ALL
        SELECT 'Households', COUNT(*)::text FROM households
        UNION ALL
        SELECT 'Farmers', COUNT(*)::text FROM farmers
        UNION ALL
        SELECT 'Marketplace Products', COUNT(*)::text FROM products
        UNION ALL
        SELECT 'Pickup Requests', COUNT(*)::text FROM pickup_requests
        UNION ALL
        SELECT 'Collection Routes', COUNT(*)::text FROM collection_routes
        UNION ALL
        SELECT 'Route Stops', COUNT(*)::text FROM route_stops
        UNION ALL
        SELECT 'Orders', COUNT(*)::text FROM orders
        UNION ALL
        SELECT 'EcoToken Transactions', COUNT(*)::text FROM ecotoken_transactions
        UNION ALL
        SELECT 'Reviews', COUNT(*)::text FROM reviews
        UNION ALL
        SELECT 'Notifications', COUNT(*)::text FROM notifications;
    "
fi
