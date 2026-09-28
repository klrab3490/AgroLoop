# Module 09: Route Planning & Dynamic Waste Matching

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 9: Route Planning & Dynamic Waste Matching**, AgroLoop introduces an automated logistics engine that bridges household waste submissions with farmer collection routes. Instead of requiring farmers to manually comb through unassigned pickups and manually plot navigation stops, Phase 9 provides:

1. **Polymorphic Matching Strategies (`WasteMatcher`):** High-extensibility strategy interface supporting distance-based matching (Haversine formula), capacity-balanced matching, and weighted composite scoring.
2. **Traveling Salesperson Problem (TSP) 2-Opt Optimizer (`RouteOptimizationService`):** Algorithmic stop sequencing minimizing total travel distance and carbon emissions for multi-stop collection routes.
3. **Collection Route Lifecycle & State Machine (`CollectionRoute`, `RouteStop`):** Domain aggregates governing the lifecycle from route creation (`DRAFT`), activation (`IN_PROGRESS`), to completion (`COMPLETED`) or cancellation (`CANCELLED`).
4. **Interactive Leaflet Route Mapping UI:** Full-screen responsive map interface displaying farmer base coordinates, active waypoints, polyline routes, estimated travel distance, and stop verification progress.
5. **REST API (`/api/v1/farmer/routes/**`):** Endpoints enabling mobile and web clients to generate optimal routes, claim matched submissions, and update stop completion status.

```text
       Household Submissions (SUBMITTED)
                     │
                     ▼
           WasteMatcher Strategy (Distance / Capacity / Composite)
                     │
                     ▼
         Candidate Pickups Ranked by Suitability
                     │
                     ▼
       Farmer Selects Pickups for Route
                     │
                     ▼
        RouteOptimizationService (TSP 2-Opt)
                     │
                     ▼
        CollectionRoute Created (DRAFT -> IN_PROGRESS)
                     │
                     ▼
        Farmer Dispatched with Interactive Map
```

---

## 2. Core Invariants & Architectural Guarantees

$$\text{Route Optimization Invariant} \iff \begin{cases}
\text{Total Distance} = \sum_{i=0}^{n-1} \text{Haversine}(\text{stop}_i, \text{stop}_{i+1}) \\
\text{Stop Sequence} = \text{argmin}_{\pi} \left( \sum_{i=0}^{n-1} d(\pi(i), \pi(i+1)) \right) \\
\text{Capacity Guard: } \sum_{s \in \text{Stops}} s.\text{weight} \le \text{farmer}.\text{maxCapacityKg} \\
\text{Farmer Isolation: Farmer can only claim submissions within configured } \text{maxRadiusKm}
\end{cases}$$

### 1. Polymorphic Matching Strategies

AgroLoop decouples waste matching using the Gang of Four **Strategy Pattern**:

* **[`WasteMatcher`](../../src/main/java/com/agroloop/service/matching/WasteMatcher.java):** Root strategy contract defining `List<WasteMatchResult> match(Farmer farmer, List<WasteSubmission> submissions, int limit)`.
* **[`DistanceBasedWasteMatcher`](../../src/main/java/com/agroloop/service/matching/DistanceBasedWasteMatcher.java):** Calculates geographic distance using the Great-Circle Haversine formula via [`GeoUtils`](../../src/main/java/com/agroloop/service/matching/GeoUtils.java). Submissions exceeding `farmer.serviceRadiusKm` are excluded.
* **[`CapacityBalancedWasteMatcher`](../../src/main/java/com/agroloop/service/matching/CapacityBalancedWasteMatcher.java):** Prioritizes submissions that fit within the farmer's remaining daily collection vehicle capacity, penalizing near-limit oversubscription.
* **[`CompositeWasteMatcher`](../../src/main/java/com/agroloop/service/matching/CompositeWasteMatcher.java):** Combines normalized distance score ($w_d = 0.6$) and category priority weight ($w_c = 0.4$) to produce a composite recommendation score.

### 2. Algorithmic Route Optimization (TSP 2-Opt)

The [`RouteOptimizationService`](../../src/main/java/com/agroloop/service/matching/RouteOptimizationService.java) implements a 2-Opt heuristic solver for the Traveling Salesperson Problem:

1. **Greedy Nearest Neighbor Initialization:** Starting at the farmer's farm coordinates, the algorithm iteratively visits the closest unvisited stop.
2. **2-Opt Edge Exchange:** Iteratively examines pairs of route edges $(A, B)$ and $(C, D)$ and swaps connections if $d(A, C) + d(B, D) < d(A, B) + d(C, D)$, eliminating route self-intersections until convergence or max iterations ($100$).

---

## 3. Database Schema (Flyway V10)

Flyway migration `V10__waste_matcher_and_routes.sql` adds spatial coordinates and collection route tables:

```sql
-- Farmer base location and service parameters
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC(5,2) DEFAULT 25.0;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS max_capacity_kg NUMERIC(8,2) DEFAULT 500.0;

-- Waste submission pickup coordinates
ALTER TABLE waste_submissions ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE waste_submissions ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

-- Collection routes
CREATE TABLE collection_routes (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT NOT NULL REFERENCES farmers(id),
    name VARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    total_distance_km NUMERIC(7,2) DEFAULT 0.0,
    estimated_duration_min INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Route stops
CREATE TABLE route_stops (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL REFERENCES collection_routes(id) ON DELETE CASCADE,
    pickup_request_id BIGINT REFERENCES pickup_requests(id),
    stop_order INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE INDEX idx_routes_farmer ON collection_routes(farmer_id, status);
CREATE INDEX idx_route_stops_route ON route_stops(route_id, stop_order);
```

---

## 4. Key Classes & Methods Catalog

| Class / Interface | Responsibility | Key Methods |
| :--- | :--- | :--- |
| [`WasteMatcher`](../../src/main/java/com/agroloop/service/matching/WasteMatcher.java) | Strategy contract for waste-to-farmer matching | `match(Farmer, List<WasteSubmission>, int)` |
| [`DistanceBasedWasteMatcher`](../../src/main/java/com/agroloop/service/matching/DistanceBasedWasteMatcher.java) | Matches by Haversine distance within service radius | `calculateDistance(lat1, lon1, lat2, lon2)` |
| [`RouteOptimizationService`](../../src/main/java/com/agroloop/service/matching/RouteOptimizationService.java) | TSP 2-Opt route order optimization | `optimizeStopOrder(startLat, startLon, stops)` |
| [`CollectionRoute`](../../src/main/java/com/agroloop/model/CollectionRoute.java) | Aggregate root for scheduled route | `start()`, `complete()`, `cancel()`, `addStop()` |
| [`RouteStop`](../../src/main/java/com/agroloop/model/RouteStop.java) | Individual pickup stop within a route | `markArrived()`, `markCompleted()` |
| [`RouteService`](../../src/main/java/com/agroloop/service/RouteService.java) | Route orchestration & state transitions | `createOptimizedRoute()`, `startRoute()`, `completeStop()` |
| [`FarmerRouteController`](../../src/main/java/com/agroloop/controller/web/FarmerRouteController.java) | Thymeleaf web controller with Leaflet map | `getRouteMap()`, `createRoute()`, `updateStopStatus()` |
| [`FarmerApiController`](../../src/main/java/com/agroloop/controller/api/v1/FarmerApiController.java) | REST endpoints for route planning & execution | `getOptimizedRoute()`, `createRoute()`, `getMatchedSubmissions()` |

---

## 5. Verification & Test Coverage

* **[`RouteServiceTest`](../../src/test/java/com/agroloop/service/RouteServiceTest.java):** Tests route creation, stop ordering, distance calculations, state transitions (`DRAFT` $\to$ `IN_PROGRESS` $\to$ `COMPLETED`), and unauthorized access rejections.
* **[`WasteMatcherTest`](../../src/test/java/com/agroloop/service/matching/WasteMatcherTest.java):** Validates distance bounds, capacity bounds, and composite scoring algorithms.
* **[`RouteOptimizationServiceTest`](../../src/test/java/com/agroloop/service/matching/RouteOptimizationServiceTest.java):** Verifies TSP 2-Opt permutation convergence and non-worsening distance guarantees.
* **[`FarmerRouteControllerTest`](../../src/test/java/com/agroloop/controller/FarmerRouteControllerTest.java):** Verifies web endpoints, Leaflet payload rendering, and flash message feedback.
