# AgroLoop — Comprehensive Developer & Integration Hub

Welcome to the **AgroLoop Developer Documentation Hub**. This central directory serves as the definitive single source of truth for the project's architecture, object-oriented design standards, onboarding tutorials for freshers, exhaustive repository catalog, and dedicated deep-dive documentation for every feature, API, and cross-platform client in the ecosystem.

---

> 🎤 **Presenting AgroLoop?** Check out the [**Presenter's Pitch & Project Reference Guide (PRESENTATION_GUIDE.md)**](./PRESENTATION_GUIDE.md) for quick talking points, architecture diagrams, OOP concepts, 3-minute pitch scripts, and Q&A defense.

---

## Quick Navigation

- [1. Freshers Onboarding & Installation Guide](#1-freshers-onboarding--installation-guide)
  - [Prerequisites Checklist](#prerequisites-checklist)
  - [Step 1: Installing Java (JDK 21+)](#step-1-installing-java-jdk-21)
  - [Step 2: Installing Docker & Docker Compose](#step-2-installing-docker--docker-compose)
  - [Step 3: Installing Node.js & pnpm (Multi-Client Monorepo)](#step-3-installing-nodejs--pnpm-multi-client-monorepo)
  - [Step 4: Starting the Project Locally](#step-4-starting-the-project-locally)
    - [Option A: Local JVM + Docker PostgreSQL (Recommended for Backend Dev)](#option-a-run-postgresql-in-docker--app-on-local-jvm-recommended-for-fast-development)
    - [Option B: Full Docker Stack (App + Database Containerized)](#option-b-run-full-docker-stack-app--database-containerized)
    - [Option C: Postgres-Free Local Docker Stack (Host PostgreSQL)](#option-c-run-postgres-free-local-docker-stack-connect-to-host-postgresql)
    - [Option D: Modern Multi-Client Workspace (Web, Mobile & Desktop)](#option-d-running-the-modern-multi-client-monorepo-web-mobile-and-desktop)
  - [Step 5: Default Credentials Reference](#step-5-default-credentials-reference)
- [2. Object-Oriented Architecture Master Guide](#2-object-oriented-architecture-master-guide)
  - [The Four Pillars in AgroLoop](#the-four-pillars-in-agroloop)
  - [Master UML Class Diagram](#master-uml-class-diagram)
- [3. End-to-End System Architecture & Data Flow Mapping](#3-end-to-end-system-architecture--data-flow-mapping)
  - [Full Multi-Tier Ecosystem Architecture](#full-multi-tier-ecosystem-architecture)
  - [Core Architectural Workflows & Sequence Diagrams](#core-architectural-workflows--sequence-diagrams)
    - [Workflow 1: Public Registration & Farmer Role Conversion](#workflow-1-public-registration--farmer-role-conversion)
    - [Workflow 2: Ephemeral Server-Authoritative QR Pickup Handshake](#workflow-2-ephemeral-server-authoritative-qr-pickup-handshake)
    - [Workflow 3: Deterministic Dual-Phase Marketplace Checkout & Atomic Refunds](#workflow-3-deterministic-dual-phase-marketplace-checkout--atomic-refunds)
- [4. Master Repository File Structure & Function Catalog](#4-master-repository-file-structure--function-catalog)
  - [4.1 Build, Infrastructure & Automation](#41-build-infrastructure--automation)
  - [4.2 Backend Entrypoint & Spring Configuration](#42-backend-entrypoint--spring-configuration)
  - [4.3 Security, Authentication & Infrastructure Services](#43-security-authentication--infrastructure-services)
  - [4.4 Domain Models & Enums (JPA Entities & Value Objects)](#44-domain-models--enums-jpa-entities--value-objects)
  - [4.5 Spring Data JPA Repositories](#45-spring-data-jpa-repositories)
  - [4.6 Domain Service Interfaces & Business Logic](#46-domain-service-interfaces--business-logic)
  - [4.7 REST API v1 Controllers & Error Handling](#47-rest-api-v1-controllers--error-handling)
  - [4.8 Web (Thymeleaf) Controllers](#48-web-thymeleaf-controllers)
  - [4.9 Flyway Database Migrations](#49-flyway-database-migrations)
  - [4.10 Thymeleaf UI Views & Static Assets](#410-thymeleaf-ui-views--static-assets)
  - [4.11 Multi-Client Monorepo: Core Config & Shared Packages](#411-multi-client-monorepo-core-config--shared-packages)
  - [4.12 Multi-Client Monorepo: Next.js 15 Web Portal (`@agroloop/web`)](#412-multi-client-monorepo-nextjs-15-web-portal-agroloopweb)
  - [4.13 Multi-Client Monorepo: React Native / Expo Mobile App (`@agroloop/mobile`)](#413-multi-client-monorepo-react-native--expo-mobile-app-agroloopmobile)
  - [4.14 Multi-Client Monorepo: Tauri v2 Desktop Operations Console (`@agroloop/desktop`)](#414-multi-client-monorepo-tauri-v2-desktop-operations-console-agroloopdesktop)
  - [4.15 Backend Test Suites & Quality Verification](#415-backend-test-suites--quality-verification)
  - [4.16 Frontend & Cross-Platform Client Test Suites](#416-frontend--cross-platform-client-test-suites)
- [5. Dedicated Integration Modules](#5-dedicated-integration-modules)
- [6. Git & Pull Request (PR) Workflow](#6-git--pull-request-pr-workflow)

---

## 1. Freshers Onboarding & Installation Guide

This section helps you get up and running on your local machine (macOS, Linux, or Windows) from a clean clone.

### Prerequisites Checklist

| Component | Minimum Version | Recommended Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Java JDK** | Java 21 | Eclipse Temurin 21 or 26 | Backend runtime & Spring Boot execution |
| **Build Tool** | Maven 3.9+ | Included via `./mvnw` wrapper | Backend dependency resolution & compilation |
| **Docker Desktop** | Docker 24+ / Compose v2 | Docker Desktop latest | Local PostgreSQL & full-stack containerization |
| **Node.js** | Node.js 20+ LTS | Node.js 22 LTS | Next.js Web, Expo Mobile, & Monorepo tooling |
| **pnpm** | pnpm 9+ | pnpm 9.12+ | Fast workspace package manager for `clients/` |
| **Rust & Cargo** | 1.77+ | Latest stable | Building Tauri v2 Desktop Operations Console |
| **Git** | Git 2.30+ | Latest | Version control & branch management |

---

### Step 1: Installing Java (JDK 21+)

#### On macOS:
Using [Homebrew](https://brew.sh/) (recommended):
```bash
# 1. Update brew
brew update

# 2. Install OpenJDK (Temurin)
brew install --cask temurin

# 3. Verify installation
java --version
```
*Manual Download:* Visit [Adoptium Temurin Releases](https://adoptium.net/temurin/releases/?version=21), select **macOS (aarch64 for Apple Silicon / x64 for Intel)**, download the `.pkg` installer, and run it.

#### On Windows:
Using `winget` in Command Prompt / PowerShell:
```cmd
winget install EclipseAdoptium.Temurin.21.JDK
```
*Manual Download:* Visit [Adoptium Temurin Releases](https://adoptium.net/temurin/releases/?version=21), select **Windows x64**, download the `.msi` installer, ensure the checkbox **"Set JAVA_HOME variable"** is checked during installation, and restart your terminal. Verify:
```cmd
java -version
```

---

### Step 2: Installing Docker & Docker Compose

Docker runs PostgreSQL and optionally containerizes the entire AgroLoop multi-tier stack.

#### On macOS:
1. Download **Docker Desktop for Mac**: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) (choose Apple Silicon or Intel chip).
2. Drag `Docker.app` into your `Applications` folder and launch it.
3. Verify in your terminal:
   ```bash
   docker --version
   docker compose version
   ```

#### On Windows:
1. Ensure WSL 2 (Windows Subsystem for Linux) is enabled. Run PowerShell as Administrator:
   ```cmd
   wsl --install
   ```
2. Download and run **Docker Desktop for Windows**: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) (ensure **"Use WSL 2 instead of Hyper-V"** is checked).
3. Restart your PC, launch Docker Desktop, and verify:
   ```cmd
   docker --version
   docker compose version
   ```

---

### Step 3: Installing Node.js & pnpm (Multi-Client Monorepo)

To build or develop the Next.js Web Portal, Expo React Native mobile client, or Tauri desktop console:

1. **Install Node.js 20+**:
   - macOS: `brew install node`
   - Windows: `winget install OpenJS.NodeJS.LTS`
2. **Install pnpm**:
   ```bash
   npm install -g pnpm
   ```
3. **Verify versions**:
   ```bash
   node -v
   pnpm -v
   ```

---

### Step 4: Starting the Project Locally

Clone the repository and enter the directory:
```bash
git clone git@github-personal:AgnaMariya/AgroLoop.git
cd AgroLoop
```

#### Option A: Run PostgreSQL in Docker + App on Local JVM (Recommended for Fast Development)
1. **Start PostgreSQL**:
   ```bash
   docker compose up -d postgres
   ```
   *(Default connection: `postgresql://postgres:postgres@localhost:5432/agroloop`)*

2. **Run the Spring Boot Backend**:
   - **macOS / Linux:**
     ```bash
     ./run.sh
     # or: ./mvnw spring-boot:run
     ```
   - **Windows:**
     ```cmd
     run.bat
     :: or: mvnw.cmd spring-boot:run
     ```

3. **Open in Browser**:
   Navigate to [http://localhost:8080](http://localhost:8080) for the server-rendered portal, or access the Swagger UI at [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html).

#### Option B: Run Full Docker Stack (App + Database Containerized)
```bash
docker compose up --build -d
```
- Logs: `docker compose logs -f app`
- Stop: `docker compose down`

#### Option C: Run Postgres-Free Local Docker Stack (Connect to Host PostgreSQL)
If you already have PostgreSQL installed and running natively on your machine:
```bash
docker compose -f docker-compose.local.yml up --build -d
```
This builds and starts the Spring Boot backend (`app`) and Next.js frontend (`web`) without spinning up a PostgreSQL container, securely routing database traffic to your host machine via `host.docker.internal:5432`.

#### Option D: Running the Modern Multi-Client Monorepo (Web, Mobile, and Desktop)
The `clients/` directory contains a high-performance Turborepo monorepo:

1. **Install Monorepo Dependencies & Build Shared Packages**:
   ```bash
   cd clients
   pnpm install
   pnpm build
   ```

2. **Run Next.js 15 Web Portal (`@agroloop/web`)**:
   ```bash
   pnpm --filter @agroloop/web dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Features server-side single-flight token refresh, HttpOnly cookies, and dynamic role routing.

3. **Run React Native / Expo Mobile App (`@agroloop/mobile`)**:
   ```bash
   pnpm --filter @agroloop/mobile start
   ```
   Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR with Expo Go on a physical device.

4. **Run Tauri v2 Desktop Operations Console (`@agroloop/desktop`)**:
   ```bash
   pnpm --filter @agroloop/desktop tauri dev
   ```
   Launches the native desktop management app with live Tier-1/Tier-2 solvency auditing, user governance, and fleet dispatch.

5. **Run End-to-End (E2E) Browser Tests with Playwright**:
   ```bash
   cd clients
   pnpm test:e2e
   ```
   Runs the automated Playwright test suite against both Web UI (Next.js on port 3100) and Desktop Operator UI (Vite on port 1420), validating authentication gates, cart drawer, role badges ("Farmer", "Household", "Admin"), and routing.
   - Run Web tests only: `pnpm --dir clients test:e2e:web`
   - Run Desktop tests only: `pnpm --dir clients test:e2e:desktop`
   - Interactive UI Mode: `pnpm --dir clients test:e2e:ui`

---

### Step 5: Default Credentials Reference

| Service / Role | Username / Email | Password | Port / URL | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | `postgres` | `postgres` | `localhost:5432` / `agroloop` | Pre-configured in `.env` & Docker |
| **pgAdmin (Optional)** | `admin@agroloop.local` | `admin` | `http://localhost:5055` | Run with `--profile tools` |
| **App: Admin (Seeded)** | `admin@agroloop.com` | `admin123` | `http://localhost:8080/login` | Full system administration & solvency |
| **App: Household (Demo)** | `household@agroloop.com` | `household123` | `http://localhost:8080/login` | Waste submission & token spending |
| **App: Farmer (Demo)** | `farmer@agroloop.com` | `farmer123` | `http://localhost:8080/login` | Pickup verification & marketplace |

---

## 2. Object-Oriented Architecture Master Guide

AgroLoop is strictly architected around Object-Oriented Programming (OOP) principles. Domain classes are self-encapsulated aggregates responsible for their internal state, business invariants, and validation.

### The Four Pillars in AgroLoop

1. **Encapsulation:**
   - All entity attributes use `private` access modifiers.
   - Raw public setters are strictly prohibited for sensitive state (`passwordHash`, `tokenBalance`, `status`, `balanceAfter`).
   - State mutations occur exclusively through expressive domain methods (e.g. `Household.addTokens()`, `Household.spendTokens()`, `Product.deductStock()`, `Product.restock()`, `PickupRequest.accept()`, `PickupHandshake.consume()`, `Order.markCompleted()`, `Order.markRefunded()`).
   - Immutable financial ledgers (`EcoTokenTransaction`) enforce database-level physical immutability triggers (`BEFORE UPDATE OR DELETE RAISE EXCEPTION`).

2. **Inheritance:**
   - A polymorphic `User` abstract parent class mapped with `@Inheritance(strategy = InheritanceType.JOINED)`.
   - Common identity, credentials, timestamps, and security authorities live in `User`.
   - Concrete subclasses (`Household`, `Farmer`, `Admin`) extend `User` and map to joined database tables (`households`, `farmers`, `admins`).

3. **Polymorphism:**
   - Strategy pattern decoupling business rules: `TokenCalculator` strategy interface with interchangeable `StandardTokenCalculator` and `PromotionalTokenCalculator` implementations.
   - Storage abstraction: `FileStorageService` contract implemented by `LocalFileStorageServiceImpl` with UUID isolation and path-traversal prevention.
   - Cross-client security abstraction: `TokenStorage` contract polymorphic across Web (cookies), Mobile (SecureStore), and Desktop (OS Keychain).

4. **Abstraction:**
   - Controllers never execute database queries directly; services expose high-level transactional domain contracts (`UserService`, `WasteSubmissionService`, `PickupHandshakeService`, `MarketplaceService`, `AdminGovernanceService`).
   - Dual security boundary: Stateless RSA-2048 Bearer JWT filter chain for mobile/web/desktop `/api/v1/**` cleanly abstracted from server-side session cookie authentication for SSR views.

---

### Master UML Class Diagram

```mermaid
classDiagram
    class User {
        <<abstract>>
        -Long id
        -String name
        -String email
        -String passwordHash
        -Role role
        -boolean enabled
        -LocalDateTime createdAt
        +login()
        +hasRole(role)
    }

    class Household {
        -BigDecimal tokenBalance
        -String address
        +addTokens(amount)
        +spendTokens(amount)
        +hasSufficientTokens(amount)
    }

    class Farmer {
        -String farmName
        -String farmAddress
        -String notes
        +updateFarmDetails(name, address, notes)
    }

    class Admin {
        +manageUsers()
        +adjustTokens()
        +adjudicateDispute()
    }

    class FarmerApplication {
        -Long id
        -User user
        -String farmName
        -String farmAddress
        -String notes
        -FarmerApplicationStatus status
        +approve()
        +reject(reason)
    }

    class AuthSession {
        -Long id
        -User user
        -String refreshTokenHash
        -String familyId
        -ClientType clientType
        -boolean revoked
        -LocalDateTime expiresAt
        +revoke()
        +isExpired()
    }

    class WasteSubmission {
        -Long id
        -Household household
        -WasteCategory category
        -BigDecimal estimatedWeight
        -String pickupAddress
        -SubmissionStatus status
        -MediaAsset photo
        +markClaimed()
        +markCollected()
        +markVerified()
    }

    class MediaAsset {
        -Long id
        -String storagePath
        -String mimeType
        -long fileSizeBytes
        -MediaPurpose purpose
        -MediaStatus status
        +confirm()
    }

    class PickupRequest {
        -Long id
        -WasteSubmission wasteSubmission
        -Farmer assignedFarmer
        -PickupStatus status
        -LocalDateTime scheduledTime
        -Long version
        +accept(farmer)
        +schedule(farmer, time)
        +markCollected(farmer)
        +recordVerification(farmer, weight, grade, notes)
        +decline(farmer)
        +cancel(user)
    }

    class PickupHandshake {
        -Long id
        -PickupRequest pickupRequest
        -String tokenHash
        -PickupHandshakeStatus status
        -LocalDateTime expiresAt
        -HandshakeVerificationMethod method
        +consume(method)
        +isExpired()
    }

    class WasteVerification {
        -Long id
        -PickupRequest pickupRequest
        -Farmer verifyingFarmer
        -BigDecimal verifiedWeight
        -QualityGrade qualityGrade
        -String notes
    }

    class EcoTokenTransaction {
        <<immutable>>
        -Long id
        -Household household
        -BigDecimal amount
        -TransactionDirection direction
        -TransactionType type
        -BigDecimal balanceAfter
        -WasteVerification wasteVerification
        -Order order
        -LocalDateTime createdAt
    }

    class Product {
        -Long id
        -Farmer farmer
        -String name
        -String description
        -BigDecimal priceInTokens
        -int stock
        -String unit
        -ProductCategory category
        -boolean active
        -Long version
        +deductStock(qty)
        +restock(qty)
        +deactivate()
        +activate()
    }

    class Order {
        -Long id
        -String orderNumber
        -Household buyer
        -BigDecimal totalTokens
        -OrderStatus status
        -String deliveryAddress
        -RefundReason refundReason
        -DisputeResolution disputeResolution
        +addItem(item)
        +markCompleted()
        +markCancelled(reason)
        +markRefunded(reason)
        +dispute(notes)
    }

    class OrderItem {
        -Long id
        -Order order
        -Product product
        -String productName
        -BigDecimal unitPrice
        -int quantity
        -BigDecimal subtotal
        -String farmerName
    }

    class IdempotencyKey {
        -Long id
        -String key
        -String userEmail
        -IdempotencyScope scope
        -IdempotencyStatus status
        -String responseBodyEncrypted
        -int responseStatusCode
        +complete(code, body)
    }

    class TokenCalculator {
        <<interface>>
        +calculateTokens(weight, category, grade) BigDecimal
    }

    class StandardTokenCalculator {
        +calculateTokens(weight, category, grade) BigDecimal
    }

    class PromotionalTokenCalculator {
        -BigDecimal surgeMultiplier
        +calculateTokens(weight, category, grade) BigDecimal
    }

    User <|-- Household
    User <|-- Farmer
    User <|-- Admin
    TokenCalculator <|.. StandardTokenCalculator
    TokenCalculator <|.. PromotionalTokenCalculator

    User "1" --> "*" AuthSession
    User "1" --> "0..1" FarmerApplication
    Household "1" --> "*" WasteSubmission
    Household "1" --> "*" EcoTokenTransaction
    Household "1" --> "*" Order
    Farmer "1" --> "*" Product
    Farmer "1" --> "*" PickupRequest : assigned
    Farmer "1" --> "*" WasteVerification : verifiedBy

    WasteSubmission "1" --> "0..1" MediaAsset
    WasteSubmission "1" --> "*" PickupRequest
    PickupRequest "1" --> "0..1" PickupHandshake
    PickupRequest "1" --> "0..1" WasteVerification
    WasteVerification "1" --> "0..1" EcoTokenTransaction

    Order "1" --> "1..*" OrderItem
    Order "1" --> "0..1" EcoTokenTransaction : purchase
    Order "1" --> "0..1" EcoTokenTransaction : refund
    OrderItem "*" --> "1" Product
```

---

## 3. End-to-End System Architecture & Data Flow Mapping

### Full Multi-Tier Ecosystem Architecture

The modern AgroLoop ecosystem accommodates four distinct client runtimes interfacing with a high-assurance Spring Boot 3 backend and PostgreSQL 16 database:

```mermaid
flowchart TD
    subgraph Clients["Client Tier"]
        WebClient["Next.js 15 Web Portal (@agroloop/web)
BFF Proxy • HttpOnly Cookies • SSR/Tailwind"]
        MobileClient["React Native / Expo App (@agroloop/mobile)
HMAC QR Pass • Offline Sync • Camera Scanner"]
        DesktopClient["Tauri v2 Desktop App (@agroloop/desktop)
Rust FFI • OS Keychain • Solvency Audit Console"]
        ThymeleafClient["Server-Rendered Views
HTML5 • Bootstrap/Tailwind • Thymeleaf SSR"]
    end

    subgraph SecurityLayer["Security & Gateway Perimeter"]
        direction TB
        subgraph APISecurity["REST API Filter Chain (/api/v1/**)"]
            RateLimit["AuthenticationRateLimiter
IP & Account Brute Force Defenses"]
            ReqFilter["RequestIdFilter
X-Request-ID Distributed Tracing"]
            JWTFilter["JwtAuthenticationFilter
RSA-2048 Asymmetric Signature Verification"]
            IdempFilter["IdempotencyService
AES-GCM-256 Encrypted Payload Cache"]
        end
        subgraph WebSecurity["Web SSR Filter Chain (/**)"]
            SessionAuth["DaoAuthenticationProvider
BCrypt • Stateful Cookie • CSRF"]
        end
    end

    subgraph Controllers["Controller Tier"]
        ApiCtrl["REST Controllers (/api/v1/*)
Auth • Household • Farmer • Pickup
Marketplace • Order • Media • Admin • System"]
        WebCtrl["Web Controllers
HomeController • AuthController • DashboardController
MarketplaceController • AdminController"]
    end

    subgraph Services["Domain Service Tier"]
        UserSvc["UserService & CustomUserDetailsService"]
        WasteSvc["WasteSubmissionService & StorageService"]
        PickupSvc["PickupService & PickupHandshakeService"]
        MediaSvc["MediaService & LocalFileStorageServiceImpl"]
        TokenSvc["TokenRewardService & TokenCalculators"]
        MarketSvc["MarketplaceService & CartService & ProductService"]
        AdminSvc["AdminGovernanceService (Tier-1/Tier-2 Solvency)"]
    end

    subgraph Persistence["Persistence & Database Tier"]
        Repos["Spring Data JPA Repositories (16 Interfaces)
Pessimistic Locking (FOR UPDATE) • Joined Inheritance"]
        FlywayMig["Flyway Migration Engine (V1 -> V9 Scripts)"]
        Postgres[("PostgreSQL 16 Engine
Immutable Ledger Triggers • Partial Unique Indexes
Check Constraints • Joined Tables")]
    end

    WebClient -->|"/api/proxy/**" HttpOnly| APISecurity
    MobileClient -->|"Bearer JWT (RSA-2048)"| APISecurity
    DesktopClient -->|"Bearer JWT (OS Keychain)"| APISecurity
    ThymeleafClient -->|"Session Cookie"| WebSecurity

    APISecurity --> ApiCtrl
    WebSecurity --> WebCtrl

    ApiCtrl --> Services
    WebCtrl --> Services

    Services --> Repos
    Repos --> Postgres
    FlywayMig --> Postgres
```

---

### Core Architectural Workflows & Sequence Diagrams

#### Workflow 1: Public Registration & Farmer Role Conversion

Citizens default to the `ROLE_HOUSEHOLD` role upon registration. To become a supplier, households submit an application reviewed by platform administrators:

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as New User
    actor HouseholdUser as Household User
    actor AdminUser as Platform Admin
    participant Client as Web / Mobile Client
    participant AuthApi as AuthApiController
    participant AdminApi as AdminApiController
    participant UserSvc as UserServiceImpl
    participant DB as PostgreSQL 16

    Note over Citizen,DB: Phase 1: Self-Service Registration
    Citizen->>Client: Enter registration credentials (name, email, password, address)
    Client->>AuthApi: POST /api/v1/auth/register
    AuthApi->>UserSvc: registerHousehold(RegisterRequest)
    UserSvc->>DB: INSERT INTO users & households (role = ROLE_HOUSEHOLD)
    UserSvc-->>AuthApi: User Details & Initial 0.00 Balance
    AuthApi-->>Client: 201 Created (Tokens & AuthSession)

    Note over HouseholdUser,DB: Phase 2: Farmer Conversion Application
    HouseholdUser->>Client: Fill Farmer Application (farmName, address, notes)
    Client->>AuthApi: POST /api/v1/household/apply-farmer
    AuthApi->>UserSvc: submitFarmerApplication(userId, dto)
    UserSvc->>DB: INSERT INTO farmer_applications (status = PENDING)
    UserSvc-->>AuthApi: FarmerApplication #ID
    AuthApi-->>Client: 202 Accepted ("Application Under Review")

    Note over AdminUser,DB: Phase 3: Administrative Moderation & Atomic Role Promotion
    AdminUser->>Client: Open Operations Console -> Review Pending Applications
    Client->>AdminApi: GET /api/v1/admin/applications?status=PENDING
    AdminApi->>DB: SELECT * FROM farmer_applications WHERE status = 'PENDING'
    DB-->>AdminApi: List of applications
    AdminApi-->>Client: Display applications
    AdminUser->>Client: Click "Approve Application #ID"
    Client->>AdminApi: POST /api/v1/admin/applications/{id}/approve
    AdminApi->>UserSvc: approveFarmerApplication(id)
    rect rgb(240, 248, 255)
        Note over UserSvc,DB: Atomic Transactional Role Conversion
        UserSvc->>DB: UPDATE farmer_applications SET status = 'APPROVED'
        UserSvc->>DB: UPDATE users SET role = 'ROLE_FARMER' WHERE id = userId
        UserSvc->>DB: INSERT INTO farmers (id, farm_name, farm_address, notes)
    end
    UserSvc-->>AdminApi: Conversion Confirmed
    AdminApi-->>Client: 200 OK (User promoted to ROLE_FARMER)
```

---

#### Workflow 2: Ephemeral Server-Authoritative QR Pickup Handshake

Physical waste handoffs use an offline-capable, server-authoritative HMAC-SHA256 dynamic QR handshake with pessimistic locking to prevent double-claiming and verify weights on-site:

```mermaid
sequenceDiagram
    autonumber
    actor Household as Household
    actor Farmer as Farmer
    participant H_App as Household Mobile/Web
    participant F_App as Farmer Mobile (Scanner)
    participant Api as PickupApiController
    participant HandshakeSvc as PickupHandshakeService
    participant RewardSvc as TokenRewardService
    participant DB as PostgreSQL 16

    Note over Household,F_App: 1. Dynamic Pass Generation (5-minute TTL)
    Household->>H_App: Tap "Show Pickup QR"
    H_App->>Api: POST /api/v1/household/pickups/{id}/handshake/pass
    Api->>HandshakeSvc: generatePass(pickupId, householdUser)
    HandshakeSvc->>HandshakeSvc: Compute HMAC-SHA256(pickupId + timestamp + secret)
    HandshakeSvc->>DB: INSERT INTO pickup_handshakes (token_hash, expires_at, status='ACTIVE')
    HandshakeSvc-->>Api: Compact QR Payload: { "pId": 12, "sig": "a7b8c...", "exp": 1718000000 }
    Api-->>H_App: Render Kazuhiko Arase QR Matrix

    Note over Household,F_App: 2. Physical Inspection & Camera Scan
    Farmer->>F_App: Inspect organic waste & weigh container (e.g. 14.5 kg)
    Farmer->>F_App: Open QR Scanner -> Scan Household Screen
    F_App->>Api: POST /api/v1/farmer/pickups/handshake/verify
{ qrPayload, verifiedWeight: 14.5, grade: "GRADE_A" }

    Note over Api,DB: 3. Authoritative Locked Verification & Reward Minting
    rect rgb(235, 255, 235)
        Api->>HandshakeSvc: verifyAndComplete(payload, farmerUser)
        HandshakeSvc->>DB: SELECT * FROM pickup_requests WHERE id = pId FOR UPDATE
        HandshakeSvc->>HandshakeSvc: Validate HMAC signature & ensure NOT expired
        HandshakeSvc->>DB: UPDATE pickup_handshakes SET status = 'CONSUMED'
        HandshakeSvc->>DB: UPDATE pickup_requests SET status = 'VERIFIED'
        HandshakeSvc->>DB: INSERT INTO waste_verifications (weight=14.5, grade='GRADE_A')
        HandshakeSvc->>RewardSvc: mintReward(verification)
        RewardSvc->>DB: SELECT * FROM households WHERE id = hId FOR UPDATE
        RewardSvc->>RewardSvc: Calculate reward (Standard: 14.5 * 1.5 * 1.2 = 26.10 tokens)
        RewardSvc->>DB: UPDATE households SET token_balance = token_balance + 26.10
        RewardSvc->>DB: INSERT INTO ecotoken_transactions (amount=26.10, direction='CREDIT', type='REWARD_MINTED')
    end
    RewardSvc-->>Api: Handshake Completed (Tokens Minted: 26.10)
    Api-->>F_App: 200 OK: "Handoff Verified! 26.10 EcoTokens awarded to household"
    Api-->>H_App: Push/Socket Alert: "Pickup Verified & Tokens Credited!"
```

---

#### Workflow 3: Deterministic Dual-Phase Marketplace Checkout & Atomic Refunds

Marketplace checkout uses strict lock ordering to avoid database deadlocks, followed by an atomic refund engine handling cancellations and dispute resolutions:

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Household Buyer
    actor Admin as Admin / Dispute Arbiter
    participant Client as Next.js Web / Mobile
    participant MarketApi as MarketplaceApiController
    participant OrderApi as OrderApiController
    participant MarketSvc as MarketplaceServiceImpl
    participant GovSvc as AdminGovernanceServiceImpl
    participant DB as PostgreSQL 16

    Note over Buyer,DB: Phase 1: Atomic Deterministic Checkout
    Buyer->>Client: Click "Checkout Cart" (Items: A, B)
    Client->>MarketApi: POST /api/v1/marketplace/checkout
{ Idempotency-Key: "uuid-v4", items: [{pId: 1, qty: 2}, {pId: 5, qty: 1}] }
    MarketApi->>MarketSvc: checkout(householdUser, request)
    rect rgb(255, 248, 240)
        Note over MarketSvc,DB: Deterministic Lock Hierarchy
        MarketSvc->>DB: 1. SELECT * FROM households WHERE id = buyerId FOR UPDATE
        MarketSvc->>DB: 2. SELECT * FROM products WHERE id IN (1, 5) ORDER BY id ASC FOR UPDATE
        MarketSvc->>MarketSvc: Authoritative DB price sum & stock sufficiency verification
        MarketSvc->>DB: Deduct stock from products: Product#1 (-2), Product#5 (-1)
        MarketSvc->>DB: Deduct tokens: Household (-45.00)
        MarketSvc->>DB: INSERT INTO orders & order_items
        MarketSvc->>DB: INSERT INTO ecotoken_transactions (amount=45.00, direction='DEBIT', type='MARKETPLACE_PURCHASE')
    end
    MarketSvc-->>MarketApi: Order #ORD-12345 Created
    MarketApi-->>Client: 201 Created (Order Receipt)

    Note over Admin,DB: Phase 2: Order Dispute Adjudication & Atomic Restock Refund
    Buyer->>Client: Raise Dispute on #ORD-12345 ("Item arrived spoiled")
    Client->>OrderApi: POST /api/v1/orders/{id}/dispute { reason: "Damaged produce" }
    OrderApi->>DB: UPDATE orders SET status = 'DISPUTED'
    Admin->>Client: Review Dispute in Desktop Console -> Click "Approve Full Refund"
    Client->>OrderApi: POST /api/v1/admin/orders/{id}/adjudicate { resolution: "APPROVED_REFUND" }
    OrderApi->>GovSvc: refundOrder(orderId, "DISPUTE_APPROVED")
    rect rgb(240, 255, 240)
        Note over GovSvc,DB: Atomic Restock & Solvency Reconciliation
        GovSvc->>DB: SELECT * FROM orders WHERE id = orderId FOR UPDATE
        GovSvc->>DB: SELECT * FROM households WHERE id = buyerId FOR UPDATE
        GovSvc->>DB: SELECT * FROM products WHERE id IN (orderItems) ORDER BY id ASC FOR UPDATE
        GovSvc->>DB: Restock product inventories
        GovSvc->>DB: Credit tokens back to household (+45.00)
        GovSvc->>DB: INSERT INTO ecotoken_transactions (amount=45.00, direction='CREDIT', type='ORDER_REFUND')
        GovSvc->>DB: UPDATE orders SET status = 'REFUNDED', dispute_resolution = 'APPROVED_REFUND'
    end
    GovSvc-->>OrderApi: Refund Processed
    OrderApi-->>Client: 200 OK: "Order refunded, inventory restocked, and tokens restored."
```

---

## 4. Master Repository File Structure & Function Catalog

The tables below provide a catalog of key files in the AgroLoop codebase. Every entry contains a clickable relative link, architectural layer, declared classes/interfaces, core responsibilities, and mapped documentation module.

### 4.1 Build, Infrastructure & Automation

| File Path | Component Layer | Core Entities / Formats | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`pom.xml`](../pom.xml)** | Build & Dependencies | Maven POM | Declares project dependencies: Spring Boot 3.3.4, Security, JPA, PostgreSQL, Flyway, H2 (test), JJWT 0.12.6, SpringDoc OpenAPI 2.6.0, Thymeleaf. | [01. Setup](modules/01_project_setup.md) |
| **[`Dockerfile`](../Dockerfile)** | Containerization | Multi-stage Dockerfile | Optimized multi-stage build packaging the Spring Boot backend into an immutable Distroless/Alpine container. | [01. Setup](modules/01_project_setup.md) |
| **[`docker-compose.yml`](../docker-compose.yml)** | Infrastructure | Docker Compose | Orchestrates local PostgreSQL 16, pgAdmin 4, and containerized Spring Boot backend with persistent healthchecks. | [01. Setup](modules/01_project_setup.md) |
| **[`docker-compose.local.yml`](../docker-compose.local.yml)** | Infrastructure | Docker Compose | Runs backend and web frontend containers connecting directly to a native host PostgreSQL database without running a Postgres container. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`run.sh`](../run.sh)** | Dev Runner | Shell Script | Automates local execution on macOS/Linux with environment validation and PostgreSQL readiness probe. | [01. Setup](modules/01_project_setup.md) |
| **[`run.bat`](../run.bat)** | Dev Runner | Batch Script | Automates local execution on Windows Command Prompt. | [01. Setup](modules/01_project_setup.md) |
| **[`setup.sh`](../setup.sh)** | Environment Bootstrapper | Shell Script | Interactive bash setup assistant checking Java 21, Docker, pnpm, node, generating `.env`, and spinning up dependencies. | [01. Setup](modules/01_project_setup.md) |
| **[`setup.bat`](../setup.bat)** | Environment Bootstrapper | Batch Script | Windows equivalent setup assistant for environment verification. | [01. Setup](modules/01_project_setup.md) |
| **[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)** | CI / Automation | GitHub Actions | Continuous integration executing Maven compilation and Java 21 test suites on PRs and dev branches. | [01. Setup](modules/01_project_setup.md) |
| **[`.github/workflows/main-release.yml`](../.github/workflows/main-release.yml)** | CI / Packaging | GitHub Actions | Production release pipeline building backend and web Docker images and packaging standalone Android APK + Expo bundle. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`.github/pull_request_template.md`](../.github/pull_request_template.md)** | Code Review | PR Template | Standardized PR template enforcing OOP principles, test coverage, and documentation parity. | [01. Setup](modules/01_project_setup.md) |
| **[`docker/init.sql`](../docker/init.sql)** | Database Schema | SQL Script | Standalone PostgreSQL schema initialization script for Docker container bootstrap. | [01. Setup](modules/01_project_setup.md) |

---

### 4.2 Backend Entrypoint & Spring Configuration

| File Path | Component Layer | Core Classes / Interfaces | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`application.properties`](../src/main/resources/application.properties)** | Configuration | Spring Properties | Configures datasource, Flyway migrations, multipart limits (10MB), JWT expiration, and OpenAPI metadata. | [01. Setup](modules/01_project_setup.md) |
| **[`AgroLoopApplication.java`](../src/main/java/com/agroloop/AgroLoopApplication.java)** | Application Entrypoint | `class AgroLoopApplication` | Bootstraps the Spring Boot application context (`main` method). | [01. Setup](modules/01_project_setup.md) |
| **[`SecurityConfig.java`](../src/main/java/com/agroloop/config/SecurityConfig.java)** | Security Architecture | `class SecurityConfig` | Configures dual filter chains: stateless Bearer JWT for `/api/v1/**` and stateful session-based form login for `/**`. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`ApiCorsConfiguration.java`](../src/main/java/com/agroloop/config/ApiCorsConfiguration.java)** | Security Policy | `class ApiCorsConfiguration` | Defines permissive CORS origins and methods for Next.js Web, Expo Mobile, and Tauri Desktop clients. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`OpenApiConfig.java`](../src/main/java/com/agroloop/config/OpenApiConfig.java)** | API Documentation | `class OpenApiConfig` | Configures SpringDoc OpenAPI 3.1 specification, Bearer JWT scheme, and endpoint groupings. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`WebMvcConfig.java`](../src/main/java/com/agroloop/config/WebMvcConfig.java)** | Resource Mapping | `class WebMvcConfig` | Maps `/uploads/**` static resource handler to the physical local upload storage directory. | [03. Submissions](modules/03_waste_submission.md) |
| **[`DataInitializer.java`](../src/main/java/com/agroloop/config/DataInitializer.java)** | Data Bootstrap | `class DataInitializer` | `CommandLineRunner` idempotently seeding default demo accounts (`admin@`, `household@`, `farmer@`) on startup. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`CustomAuthenticationSuccessHandler.java`](../src/main/java/com/agroloop/config/CustomAuthenticationSuccessHandler.java)** | Security Routing | `CustomAuthenticationSuccessHandler` | Dynamically redirects authenticated SSR users based on role (`/admin/dashboard`, `/farmer/dashboard`, `/household/dashboard`). | [02. Auth](modules/02_user_management_and_auth.md) |

---

### 4.3 Security, Authentication & Infrastructure Services

| File Path | Component Layer | Core Classes / Interfaces | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`TokenService.java`](../src/main/java/com/agroloop/security/TokenService.java)** | Cryptography / JWT | `class TokenService` | Signs and parses RSA-2048 JWT access tokens, rotates refresh tokens, and enforces replay attack family revocation. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`AuthenticationRateLimiter.java`](../src/main/java/com/agroloop/security/AuthenticationRateLimiter.java)** | API Defense | `class AuthenticationRateLimiter` | Sliding-window IP and email brute-force defense throttling abuse on authentication and QR endpoints. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`RequestIdFilter.java`](../src/main/java/com/agroloop/security/RequestIdFilter.java)** | Observability | `class RequestIdFilter` | Injects and propagates unique `X-Request-ID` across HTTP requests, MDC logging, and error envelopes. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`RestAuthenticationEntryPoint.java`](../src/main/java/com/agroloop/security/RestAuthenticationEntryPoint.java)** | API Security | `RestAuthenticationEntryPoint` | Converts unauthenticated REST requests into structured 401 JSON envelopes with RFC 7807 problem details. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`RestAccessDeniedHandler.java`](../src/main/java/com/agroloop/security/RestAccessDeniedHandler.java)** | API Security | `class RestAccessDeniedHandler` | Emits structured 403 Forbidden JSON envelopes on unauthorized role access. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`OrderSecurityEvaluator.java`](../src/main/java/com/agroloop/security/authorization/OrderSecurityEvaluator.java)** | Method Security | `class OrderSecurityEvaluator` | SpEL security evaluator asserting household ownership and farmer order item authorization. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`PickupSecurityEvaluator.java`](../src/main/java/com/agroloop/security/authorization/PickupSecurityEvaluator.java)** | Method Security | `class PickupSecurityEvaluator` | SpEL security evaluator asserting household pickup cancellation rights and farmer claim authorization. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`IdempotencyService.java`](../src/main/java/com/agroloop/security/idempotency/IdempotencyService.java)** | Infrastructure | `class IdempotencyService` | Coordinates `Idempotency-Key` tracking, duplicate suppression, and cached response replay. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`IdempotencyEncryptionService.java`](../src/main/java/com/agroloop/security/idempotency/IdempotencyEncryptionService.java)** | Cryptography | `class IdempotencyEncryptionService` | Encrypts cached response payloads at rest using AES-GCM-256 with authenticated additional data (AAD). | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`IdempotencyScope.java`](../src/main/java/com/agroloop/security/idempotency/IdempotencyScope.java)** | Security Model | `enum IdempotencyScope` | Scopes idempotency keys across `CHECKOUT`, `PICKUP_HANDSHAKE`, and `ORDER_ACTION`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |

---

### 4.4 Domain Models & Enums (JPA Entities & Value Objects)

| File Path | Component Layer | Core Classes / Enums | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`Role.java`](../src/main/java/com/agroloop/model/Role.java)** | Domain Enum | `enum Role` | Ecosystem security authorities: `ROLE_HOUSEHOLD`, `ROLE_FARMER`, `ROLE_ADMIN`. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`User.java`](../src/main/java/com/agroloop/model/User.java)** | Domain Aggregate | `abstract class User` | Base JPA entity with Joined Table inheritance (`users`). Encapsulates identity, email, password hash, role, enabled flag. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`Household.java`](../src/main/java/com/agroloop/model/Household.java)** | Domain Subclass | `class Household extends User` | Joined subtype for households (`households`). Encapsulates `tokenBalance`, `address`, `addTokens()`, `spendTokens()`. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`Farmer.java`](../src/main/java/com/agroloop/model/Farmer.java)** | Domain Subclass | `class Farmer extends User` | Joined subtype for farmers (`farmers`). Encapsulates `farmName`, `farmAddress`, `notes`, `updateFarmDetails()`. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`Admin.java`](../src/main/java/com/agroloop/model/Admin.java)** | Domain Subclass | `class Admin extends User` | Joined subtype for system administrators (`admins`). Holds administrative governance authority. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`FarmerApplication.java`](../src/main/java/com/agroloop/model/FarmerApplication.java)** | Domain Entity | `class FarmerApplication` | Captures farmer conversion requests with status lifecycle, approval, and rejection reason tracking. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`FarmerApplicationStatus.java`](../src/main/java/com/agroloop/model/FarmerApplicationStatus.java)** | Domain Enum | `enum FarmerApplicationStatus` | Status lifecycle for role conversion: `PENDING`, `APPROVED`, `REJECTED`. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`AuthSession.java`](../src/main/java/com/agroloop/model/AuthSession.java)** | Security Entity | `class AuthSession` | Tracks active client refresh token families, hashes, revocation status, client type, and expiration. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`ClientType.java`](../src/main/java/com/agroloop/model/ClientType.java)** | Security Enum | `enum ClientType` | Distinguishes connecting client runtimes: `WEB`, `MOBILE`, `DESKTOP`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`WasteCategory.java`](../src/main/java/com/agroloop/model/WasteCategory.java)** | Domain Enum | `enum WasteCategory` | Waste classification taxonomy (`FOOD_SCRAPS`, `GARDEN_WASTE`, `AGRICULTURAL_ORGANIC`, `COFFEE_GROUNDS`) with reward multipliers. | [03. Submissions](modules/03_waste_submission.md) |
| **[`SubmissionStatus.java`](../src/main/java/com/agroloop/model/SubmissionStatus.java)** | Domain Enum | `enum SubmissionStatus` | Waste submission lifecycle (`SUBMITTED`, `CLAIMED`, `COLLECTED`, `VERIFIED`, `REJECTED`). | [03. Submissions](modules/03_waste_submission.md) |
| **[`WasteSubmission.java`](../src/main/java/com/agroloop/model/WasteSubmission.java)** | Domain Entity | `class WasteSubmission` | Encapsulates category, estimated weight, address inheritance, photo media link, and state transitions. | [03. Submissions](modules/03_waste_submission.md) |
| **[`MediaAsset.java`](../src/main/java/com/agroloop/model/MediaAsset.java)** | Domain Entity | `class MediaAsset` | Tracks uploaded files, MIME verification, physical storage paths, ownership, and upload confirmation status. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`MediaPurpose.java`](../src/main/java/com/agroloop/model/MediaPurpose.java)** | Domain Enum | `enum MediaPurpose` | Scopes upload tickets: `WASTE_SUBMISSION_PHOTO`, `PRODUCT_IMAGE`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`MediaStatus.java`](../src/main/java/com/agroloop/model/MediaStatus.java)** | Domain Enum | `enum MediaStatus` | Media asset lifecycle: `PENDING_CONFIRMATION`, `CONFIRMED`, `ABANDONED`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`PickupStatus.java`](../src/main/java/com/agroloop/model/PickupStatus.java)** | Domain Enum | `enum PickupStatus` | Pickup lifecycle (`REQUESTED`, `ASSIGNED`, `SCHEDULED`, `COLLECTED`, `VERIFIED`, `CANCELLED`). | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`QualityGrade.java`](../src/main/java/com/agroloop/model/QualityGrade.java)** | Domain Enum | `enum QualityGrade` | Quality grading taxonomy (`GRADE_A`, `GRADE_B`, `GRADE_C`, `REJECTED`) with multiplier calculation. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`PickupRequest.java`](../src/main/java/com/agroloop/model/PickupRequest.java)** | Domain Entity | `class PickupRequest` | Encapsulates farmer claims, scheduling, optimistic lock `@Version`, and verification recording. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`PickupHandshake.java`](../src/main/java/com/agroloop/model/PickupHandshake.java)** | Domain Entity | `class PickupHandshake` | Ephemeral server-authoritative handshake entity storing token hashes, TTL, and consumption status. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`PickupHandshakeStatus.java`](../src/main/java/com/agroloop/model/PickupHandshakeStatus.java)** | Domain Enum | `enum PickupHandshakeStatus` | Handshake status machine: `ACTIVE`, `CONSUMED`, `EXPIRED`. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`HandshakeVerificationMethod.java`](../src/main/java/com/agroloop/model/HandshakeVerificationMethod.java)** | Domain Enum | `enum HandshakeVerificationMethod` | Verification audit trail method: `QR_SCAN`, `MANUAL_FALLBACK`. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`WasteVerification.java`](../src/main/java/com/agroloop/model/WasteVerification.java)** | Domain Entity | `class WasteVerification` | Captures verified weight, quality grade, inspection notes, and verifying farmer association. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`TransactionType.java`](../src/main/java/com/agroloop/model/TransactionType.java)** | Domain Enum | `enum TransactionType` | Financial transaction classification: `REWARD_MINTED`, `MARKETPLACE_PURCHASE`, `ORDER_REFUND`, `ADMIN_ADJUSTMENT`. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`TransactionDirection.java`](../src/main/java/com/agroloop/model/TransactionDirection.java)** | Domain Enum | `enum TransactionDirection` | Financial flow indicators: `CREDIT`, `DEBIT`. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`EcoTokenTransaction.java`](../src/main/java/com/agroloop/model/EcoTokenTransaction.java)** | Domain Entity | `class EcoTokenTransaction` | Immutable financial ledger entry recording token amounts, balance snapshots, and order/verification foreign keys. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`ProductCategory.java`](../src/main/java/com/agroloop/model/ProductCategory.java)** | Domain Enum | `enum ProductCategory` | Farm goods taxonomy (`ORGANIC_VEGETABLES`, `FRESH_FRUITS`, `COMPOST_AND_SOIL`, `SEEDS_AND_PLANTS`, etc.). | [06. Marketplace](modules/06_marketplace.md) |
| **[`Product.java`](../src/main/java/com/agroloop/model/Product.java)** | Domain Aggregate | `class Product` | Manages stock deductions (`deductStock`), replenishment (`restock`), pricing, soft archival, and `@Version` locking. | [06. Marketplace](modules/06_marketplace.md) |
| **[`OrderStatus.java`](../src/main/java/com/agroloop/model/OrderStatus.java)** | Domain Enum | `enum OrderStatus` | Order state machine: `PLACED`, `COMPLETED`, `CANCELLED`, `DISPUTED`, `REFUNDED`. | [06. Marketplace](modules/06_marketplace.md) |
| **[`RefundReason.java`](../src/main/java/com/agroloop/model/RefundReason.java)** | Domain Enum | `enum RefundReason` | Refund taxonomy: `HOUSEHOLD_CANCELLATION`, `ADMIN_CANCELLATION`, `DISPUTE_APPROVED`. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`DisputeResolution.java`](../src/main/java/com/agroloop/model/DisputeResolution.java)** | Domain Enum | `enum DisputeResolution` | Administrative adjudication outcome: `APPROVED_REFUND`, `DISMISSED`. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`Order.java`](../src/main/java/com/agroloop/model/Order.java)** | Domain Aggregate | `class Order` | Aggregate root for customer orders, snapshot lines, delivery addresses, disputes, and refund state. | [06. Marketplace](modules/06_marketplace.md) |
| **[`OrderItem.java`](../src/main/java/com/agroloop/model/OrderItem.java)** | Domain Entity | `class OrderItem` | Historical line item preserving product title, unit price, category, and farmer name snapshot. | [06. Marketplace](modules/06_marketplace.md) |
| **[`IdempotencyKey.java`](../src/main/java/com/agroloop/model/IdempotencyKey.java)** | Domain Entity | `class IdempotencyKey` | Persists idempotency hashes, execution status, and AES-GCM-256 encrypted response caches. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`IdempotencyStatus.java`](../src/main/java/com/agroloop/model/IdempotencyStatus.java)** | Domain Enum | `enum IdempotencyStatus` | Execution state: `IN_PROGRESS`, `COMPLETED`, `FAILED`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`CollectionRoute.java`](../src/main/java/com/agroloop/model/CollectionRoute.java)** | Domain Aggregate | `class CollectionRoute` | Farmer collection itinerary, planned stops, total distance km, and completion tracking. | Phase 9 Logistics |
| **[`RouteStop.java`](../src/main/java/com/agroloop/model/RouteStop.java)** | Domain Entity | `class RouteStop` | Waypoint stop associated with PickupRequest, sequential stop order, and arrival status. | Phase 9 Logistics |
| **[`RouteStatus.java`](../src/main/java/com/agroloop/model/RouteStatus.java)** | Domain Enum | `enum RouteStatus` | Route lifecycle: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. | Phase 9 Logistics |
| **[`RouteStopStatus.java`](../src/main/java/com/agroloop/model/RouteStopStatus.java)** | Domain Enum | `enum RouteStopStatus` | Stop progress: `PENDING`, `ARRIVED`, `COLLECTED`, `SKIPPED`. | Phase 9 Logistics |
| **[`Review.java`](../src/main/java/com/agroloop/model/Review.java)** | Domain Aggregate | `class Review` | 1-5 star ratings, feedback commentary, context linking (pickup/order), and self-review protection. | Phase 10 Trust |
| **[`ReviewType.java`](../src/main/java/com/agroloop/model/ReviewType.java)** | Domain Enum | `enum ReviewType` | Review categories: `PICKUP_EXPERIENCE`, `COMPOST_QUALITY`, `GENERAL`. | Phase 10 Trust |
| **[`Notification.java`](../src/main/java/com/agroloop/model/Notification.java)** | Domain Entity | `class Notification` | In-app user notifications, unread tracking, action deep-links, and delivery timestamps. | Phase 11 Streaming |
| **[`NotificationType.java`](../src/main/java/com/agroloop/model/NotificationType.java)** | Domain Enum | `enum NotificationType` | Alerts: `PICKUP_CLAIMED`, `PICKUP_SCHEDULED`, `PICKUP_COLLECTED`, `PICKUP_VERIFIED`, `TOKENS_CREDITED`, `ORDER_PLACED`, `ORDER_STATUS_CHANGED`, `REVIEW_RECEIVED`. | Phase 11 Streaming |

---

### 4.5 Spring Data JPA Repositories

| File Path | Component Layer | Interface | Key Query Capabilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`UserRepository.java`](../src/main/java/com/agroloop/repository/UserRepository.java)** | Persistence | `UserRepository` | Base `User` queries: `findByEmail()`, `existsByEmail()`. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`HouseholdRepository.java`](../src/main/java/com/agroloop/repository/HouseholdRepository.java)** | Persistence | `HouseholdRepository` | Queries household entity with `findByIdForUpdate()` pessimistic write locks. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`FarmerRepository.java`](../src/main/java/com/agroloop/repository/FarmerRepository.java)** | Persistence | `FarmerRepository` | Queries farmer profiles and verifies farm details. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`AdminRepository.java`](../src/main/java/com/agroloop/repository/AdminRepository.java)** | Persistence | `AdminRepository` | Serialized last-admin defense via `countActiveAdminsForUpdate()`. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`FarmerApplicationRepository.java`](../src/main/java/com/agroloop/repository/FarmerApplicationRepository.java)** | Persistence | `FarmerApplicationRepository` | Moderation queries by status (`findByStatus()`) and applicant lookups. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`AuthSessionRepository.java`](../src/main/java/com/agroloop/repository/AuthSessionRepository.java)** | Persistence | `AuthSessionRepository` | Refresh token validation, family-based batch revocation (`revokeAllInFamily()`). | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`WasteSubmissionRepository.java`](../src/main/java/com/agroloop/repository/WasteSubmissionRepository.java)** | Persistence | `WasteSubmissionRepository` | Household waste submissions filtered by status and creation time. | [03. Submissions](modules/03_waste_submission.md) |
| **[`MediaAssetRepository.java`](../src/main/java/com/agroloop/repository/MediaAssetRepository.java)** | Persistence | `MediaAssetRepository` | Upload tickets lookup, garbage-collection cleanup of abandoned media. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`PickupRequestRepository.java`](../src/main/java/com/agroloop/repository/PickupRequestRepository.java)** | Persistence | `PickupRequestRepository` | Pickup claims and scheduling queries with `findByIdForUpdate()` locking. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`PickupHandshakeRepository.java`](../src/main/java/com/agroloop/repository/PickupHandshakeRepository.java)** | Persistence | `PickupHandshakeRepository` | Lookups for active handshake tokens and expiry invalidation. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`WasteVerificationRepository.java`](../src/main/java/com/agroloop/repository/WasteVerificationRepository.java)** | Persistence | `WasteVerificationRepository` | Verification audits and farmer verification performance metrics. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`EcoTokenTransactionRepository.java`](../src/main/java/com/agroloop/repository/EcoTokenTransactionRepository.java)** | Persistence | `EcoTokenTransactionRepository` | Immutable audit ledger queries, idempotency checks, and Tier-1/Tier-2 financial sums. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`ProductRepository.java`](../src/main/java/com/agroloop/repository/ProductRepository.java)** | Persistence | `ProductRepository` | Active catalog browsing and sorted batch pessimistic locking (`findByIdInOrderByIdAscForUpdate`). | [06. Marketplace](modules/06_marketplace.md) |
| **[`OrderRepository.java`](../src/main/java/com/agroloop/repository/OrderRepository.java)** | Persistence | `OrderRepository` | Order history by buyer, farmer sales lookups, and dispute filtering. | [06. Marketplace](modules/06_marketplace.md) |
| **[`OrderItemRepository.java`](../src/main/java/com/agroloop/repository/OrderItemRepository.java)** | Persistence | `OrderItemRepository` | Snapshot order items querying for fulfillment tracking. | [06. Marketplace](modules/06_marketplace.md) |
| **[`IdempotencyKeyRepository.java`](../src/main/java/com/agroloop/repository/IdempotencyKeyRepository.java)** | Persistence | `IdempotencyKeyRepository` | Atomic reservation and retrieval of `Idempotency-Key` records. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`CollectionRouteRepository.java`](../src/main/java/com/agroloop/repository/CollectionRouteRepository.java)** | Persistence | `CollectionRouteRepository` | Farmer collection routes by status and creation order. | Phase 9 Logistics |
| **[`RouteStopRepository.java`](../src/main/java/com/agroloop/repository/RouteStopRepository.java)** | Persistence | `RouteStopRepository` | Stops per route ordered by sequence index. | Phase 9 Logistics |
| **[`ReviewRepository.java`](../src/main/java/com/agroloop/repository/ReviewRepository.java)** | Persistence | `ReviewRepository` | Review feeds, average star rating calculations, and rating distribution breakdowns. | Phase 10 Trust |
| **[`NotificationRepository.java`](../src/main/java/com/agroloop/repository/NotificationRepository.java)** | Persistence | `NotificationRepository` | User notification inboxes, unread counter queries, and bulk read markings. | Phase 11 Streaming |

---

### 4.6 Domain Service Interfaces & Business Logic

| File Path | Component Layer | Core Classes / Interfaces | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`UserService.java`](../src/main/java/com/agroloop/service/UserService.java)** | Service Contract | `interface UserService` | Contracts for registration, farmer application submission, and admin approval/rejection. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`UserServiceImpl.java`](../src/main/java/com/agroloop/service/UserServiceImpl.java)** | Service Logic | `class UserServiceImpl` | Implements BCrypt password hashing, transactional role conversion, and user lookup. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`CustomUserDetailsService.java`](../src/main/java/com/agroloop/service/CustomUserDetailsService.java)** | Security Integration | `CustomUserDetailsService` | Implements Spring Security's `UserDetailsService`, mapping `User` to `UserDetails`. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`WasteSubmissionService.java`](../src/main/java/com/agroloop/service/WasteSubmissionService.java)** | Service Contract | `WasteSubmissionService` | Contract for submitting waste, address inheritance, and submission history. | [03. Submissions](modules/03_waste_submission.md) |
| **[`WasteSubmissionServiceImpl.java`](../src/main/java/com/agroloop/service/WasteSubmissionServiceImpl.java)** | Service Logic | `WasteSubmissionServiceImpl` | Transactional waste recording, address fallback, and media asset linkage. | [03. Submissions](modules/03_waste_submission.md) |
| **[`FileStorageService.java`](../src/main/java/com/agroloop/service/storage/FileStorageService.java)** | Storage Abstraction | `interface FileStorageService` | Abstract interface for storing, resolving, and deleting uploaded binary files. | [03. Submissions](modules/03_waste_submission.md) |
| **[`LocalFileStorageServiceImpl.java`](../src/main/java/com/agroloop/service/storage/LocalFileStorageServiceImpl.java)** | Storage Logic | `LocalFileStorageServiceImpl` | Local filesystem implementation enforcing UUID renaming, MIME validation, and traversal defense. | [03. Submissions](modules/03_waste_submission.md) |
| **[`PickupService.java`](../src/main/java/com/agroloop/service/PickupService.java)** | Service Contract | `interface PickupService` | Contract for farmer claims, scheduling, collection, verification, and cancellation. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`PickupServiceImpl.java`](../src/main/java/com/agroloop/service/PickupServiceImpl.java)** | Service Logic | `class PickupServiceImpl` | Transactional coordination of pickup state transitions and role authorization guards. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`PickupHandshakeService.java`](../src/main/java/com/agroloop/service/PickupHandshakeService.java)** | Service Logic | `PickupHandshakeService` | Issues HMAC-SHA256 dynamic passes, verifies scanned QR codes under lock, and invokes token minting. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`PickupHandshakeCanonicalizer.java`](../src/main/java/com/agroloop/service/PickupHandshakeCanonicalizer.java)** | Utility | `PickupHandshakeCanonicalizer` | Generates deterministic canonical signature strings across heterogeneous client runtimes. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`MediaService.java`](../src/main/java/com/agroloop/service/MediaService.java)** | Service Logic | `class MediaService` | Manages pre-authenticated 3-phase upload tickets, temporary file storage, and asset confirmation. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`TokenRewardService.java`](../src/main/java/com/agroloop/service/TokenRewardService.java)** | Service Contract | `interface TokenRewardService` | Business contract for reward minting, idempotency checks, and ledger auditing. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`TokenRewardServiceImpl.java`](../src/main/java/com/agroloop/service/TokenRewardServiceImpl.java)** | Service Logic | `class TokenRewardServiceImpl` | Transactional coordinator executing strategy calculations, pessimistic locking, and ledger persistence. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`TokenCalculator.java`](../src/main/java/com/agroloop/service/token/TokenCalculator.java)** | Strategy Interface | `interface TokenCalculator` | Polymorphic contract for reward calculation strategies. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`StandardTokenCalculator.java`](../src/main/java/com/agroloop/service/token/StandardTokenCalculator.java)** | Strategy Implementation | `StandardTokenCalculator` | Standard algorithm (`weight * categoryMultiplier * qualityMultiplier`). | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`PromotionalTokenCalculator.java`](../src/main/java/com/agroloop/service/token/PromotionalTokenCalculator.java)** | Strategy Implementation | `PromotionalTokenCalculator` | Promotional surge campaign reward calculation strategy. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`ProductService.java`](../src/main/java/com/agroloop/service/ProductService.java)** | Service Contract | `interface ProductService` | Product catalog querying, creation, updating, and soft archival. | [06. Marketplace](modules/06_marketplace.md) |
| **[`ProductServiceImpl.java`](../src/main/java/com/agroloop/service/ProductServiceImpl.java)** | Service Logic | `class ProductServiceImpl` | Implements farmer listing ownership checks, positive stock checks, and catalog filtering. | [06. Marketplace](modules/06_marketplace.md) |
| **[`CartService.java`](../src/main/java/com/agroloop/service/CartService.java)** | Service Contract | `interface CartService` | Session shopping cart contract for adding, modifying, and clearing items. | [06. Marketplace](modules/06_marketplace.md) |
| **[`CartServiceImpl.java`](../src/main/java/com/agroloop/service/CartServiceImpl.java)** | Service Logic | `class CartServiceImpl` | HTTP session-backed implementation managing cart state. | [06. Marketplace](modules/06_marketplace.md) |
| **[`MarketplaceService.java`](../src/main/java/com/agroloop/service/MarketplaceService.java)** | Service Contract | `interface MarketplaceService` | Transactional checkout orchestration and order lookup contract. | [06. Marketplace](modules/06_marketplace.md) |
| **[`MarketplaceServiceImpl.java`](../src/main/java/com/agroloop/service/MarketplaceServiceImpl.java)** | Service Logic | `class MarketplaceServiceImpl` | Deterministic dual-phase pessimistic locking (household row -> ascending product rows) and atomic checkout. | [06. Marketplace](modules/06_marketplace.md) |
| **[`AdminGovernanceService.java`](../src/main/java/com/agroloop/service/AdminGovernanceService.java)** | Service Contract | `AdminGovernanceService` | Platform solvency reconciliation, manual token adjustments under lock, and order dispute adjudication. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`AdminGovernanceServiceImpl.java`](../src/main/java/com/agroloop/service/AdminGovernanceServiceImpl.java)** | Service Logic | `AdminGovernanceServiceImpl` | Implements serialized last-admin defense, lock hierarchy token adjustment, and atomic refund restock. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`RouteService.java`](../src/main/java/com/agroloop/service/RouteService.java)** | Service Contract | `interface RouteService` | Multi-stop collection routing, distance TSP optimization, waypoint scheduling, and stop updates. | Phase 9 Logistics |
| **[`RouteServiceImpl.java`](../src/main/java/com/agroloop/service/RouteServiceImpl.java)** | Service Logic | `class RouteServiceImpl` | Implements route generation, stop sequencing, status progression, and Haversine geo calculations. | Phase 9 Logistics |
| **[`WasteMatcher.java`](../src/main/java/com/agroloop/service/matching/WasteMatcher.java)** | Strategy Interface | `interface WasteMatcher` | Polymorphic matching strategy for pairing pending submissions with eligible farmers. | Phase 9 Logistics |
| **[`DistanceBasedWasteMatcher.java`](../src/main/java/com/agroloop/service/matching/DistanceBasedWasteMatcher.java)** | Strategy Implementation | `DistanceBasedWasteMatcher` | Geodesic radius matcher filtering submissions within farmer service perimeter. | Phase 9 Logistics |
| **[`CapacityBasedWasteMatcher.java`](../src/main/java/com/agroloop/service/matching/CapacityBasedWasteMatcher.java)** | Strategy Implementation | `CapacityBasedWasteMatcher` | Capacity-aware matcher prioritizing pending batches based on farmer compost volume. | Phase 9 Logistics |
| **[`PickupRouteOptimizer.java`](../src/main/java/com/agroloop/service/matching/PickupRouteOptimizer.java)** | Optimization Engine | `PickupRouteOptimizer` | TSP 2-opt heuristic optimizing multi-stop collection sequences to minimize travel distance. | Phase 9 Logistics |
| **[`ReviewService.java`](../src/main/java/com/agroloop/service/ReviewService.java)** | Service Contract | `interface ReviewService` | Review submission, double-review prevention, average star calculations, and reputation queries. | Phase 10 Trust |
| **[`ReviewServiceImpl.java`](../src/main/java/com/agroloop/service/ReviewServiceImpl.java)** | Service Logic | `class ReviewServiceImpl` | Implements transactional review validation, reputation aggregation, and event publishing. | Phase 10 Trust |
| **[`NotificationService.java`](../src/main/java/com/agroloop/service/NotificationService.java)** | Service Contract | `interface NotificationService` | User notification management, unread counts, mark-as-read operations, and event dispatch. | Phase 11 Streaming |
| **[`NotificationServiceImpl.java`](../src/main/java/com/agroloop/service/NotificationServiceImpl.java)** | Service Logic | `class NotificationServiceImpl` | Transactional persistence of notifications and real-time SSE stream broadcasting. | Phase 11 Streaming |
| **[`SseEmitterRegistry.java`](../src/main/java/com/agroloop/service/notification/SseEmitterRegistry.java)** | Streaming Infrastructure | `class SseEmitterRegistry` | Thread-safe concurrent registry of active client SSE emitters with auto-cleanup on disconnect. | Phase 11 Streaming |
| **[`NotificationEventListener.java`](../src/main/java/com/agroloop/service/notification/NotificationEventListener.java)** | Event Integration | `NotificationEventListener` | Transactional domain event listener capturing pickups, tokens, orders, and reviews. | Phase 11 Streaming |
| **[`CloudStorageService.java`](../src/main/java/com/agroloop/service/storage/CloudStorageService.java)** | Storage SPI | `interface CloudStorageService` | Extensible SPI contract for file persistence, pre-signed upload/download URLs, and health checks. | Phase 12 Storage |
| **[`StorageManager.java`](../src/main/java/com/agroloop/service/storage/StorageManager.java)** | Storage Facade | `class StorageManager` | `@Primary` facade delegating dynamically across Local, AWS S3, and MinIO backends with latency diagnostics. | Phase 12 Storage |
| **[`LocalFileStorageServiceImpl.java`](../src/main/java/com/agroloop/service/storage/LocalFileStorageServiceImpl.java)** | Storage Implementation | `LocalFileStorageServiceImpl` | Local filesystem storage implementation with directory traversal guards. | Phase 12 Storage |
| **[`S3MinioStorageServiceImpl.java`](../src/main/java/com/agroloop/service/storage/S3MinioStorageServiceImpl.java)** | Storage Implementation | `S3MinioStorageServiceImpl` | Native Java 21 `HttpClient` S3 REST implementation without heavy AWS SDK dependencies. | Phase 12 Storage |

---

### 4.7 REST API v1 Controllers & Error Handling

| File Path | Component Layer | Core Classes / Interfaces | Key Endpoints & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`RestExceptionHandler.java`](../src/main/java/com/agroloop/controller/api/RestExceptionHandler.java)** | Exception Handling | `@RestControllerAdvice` | Translates domain exceptions into RFC 7807 problem details with `X-Request-ID`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`AuthApiController.java`](../src/main/java/com/agroloop/controller/api/v1/AuthApiController.java)** | REST Controller | `class AuthApiController` | `/api/v1/auth/login`, `/register`, `/refresh`, `/logout`, `/me`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`HouseholdApiController.java`](../src/main/java/com/agroloop/controller/api/v1/HouseholdApiController.java)** | REST Controller | `HouseholdApiController` | `/api/v1/household/submissions`, `/balance`, `/ledger`, `/apply-farmer`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`FarmerApiController.java`](../src/main/java/com/agroloop/controller/api/v1/FarmerApiController.java)** | REST Controller | `class FarmerApiController` | `/api/v1/farmer/products`, `/orders`, `/collections`, `/profile`, `/location`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`PickupApiController.java`](../src/main/java/com/agroloop/controller/api/v1/PickupApiController.java)** | REST Controller | `class PickupApiController` | `/api/v1/pickups/**`, `/handshake/pass`, `/handshake/verify`. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`MarketplaceApiController.java`](../src/main/java/com/agroloop/controller/api/v1/MarketplaceApiController.java)** | REST Controller | `MarketplaceApiController` | `/api/v1/marketplace/products`, `/checkout` (Idempotent). | [06. Marketplace](modules/06_marketplace.md) |
| **[`OrderApiController.java`](../src/main/java/com/agroloop/controller/api/v1/OrderApiController.java)** | REST Controller | `class OrderApiController` | `/api/v1/orders/{id}`, `/cancel`, `/dispute`, `/adjudicate`. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`MediaApiController.java`](../src/main/java/com/agroloop/controller/api/v1/MediaApiController.java)** | REST Controller | `class MediaApiController` | `/api/v1/media/ticket`, `/upload`, `/confirm`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`AdminApiController.java`](../src/main/java/com/agroloop/controller/api/v1/AdminApiController.java)** | REST Controller | `class AdminApiController` | `/api/v1/admin/users`, `/token-adjustment`, `/solvency`, `/ledger`, `/storage/status`. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`SystemApiController.java`](../src/main/java/com/agroloop/controller/api/v1/SystemApiController.java)** | REST Controller | `class SystemApiController` | `/api/v1/system/health`, `/meta`, `/diagnostics`. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`ReviewApiController.java`](../src/main/java/com/agroloop/controller/api/v1/ReviewApiController.java)** | REST Controller | `class ReviewApiController` | `/api/v1/reviews/pickup`, `/reviews/order`, `/reviews/farmer/{id}`, `/reviews/farmer/{id}/reputation`. | Phase 10 Trust |
| **[`NotificationApiController.java`](../src/main/java/com/agroloop/controller/api/v1/NotificationApiController.java)** | REST Controller | `NotificationApiController` | `/api/v1/notifications`, `/stream` (SSE), `/unread-count`, `/{id}/read`, `/read-all`. | Phase 11 Streaming |

---

### 4.8 Web (Thymeleaf) Controllers

| File Path | Component Layer | Core Classes / Interfaces | Key Routes & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`HomeController.java`](../src/main/java/com/agroloop/controller/web/HomeController.java)** | Web Controller | `class HomeController` | Serves public landing page (`GET /`) with dynamic database connection diagnostics. | [01. Setup](modules/01_project_setup.md) |
| **[`AuthController.java`](../src/main/java/com/agroloop/controller/web/AuthController.java)** | Web Controller | `class AuthController` | Handles `GET /login`, `GET /register`, and `POST /register` with validation flash attributes. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`DashboardController.java`](../src/main/java/com/agroloop/controller/web/DashboardController.java)** | Web Controller | `class DashboardController` | Serves role dashboards (`/household/dashboard`, `/farmer/dashboard`, `/admin/dashboard`). | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`FarmerProductController.java`](../src/main/java/com/agroloop/controller/web/FarmerProductController.java)** | Web Controller | `FarmerProductController` | Farmer product management, listing creation forms, and sales history. | [06. Marketplace](modules/06_marketplace.md) |
| **[`MarketplaceController.java`](../src/main/java/com/agroloop/controller/web/MarketplaceController.java)** | Web Controller | `MarketplaceController` | Marketplace catalog browsing, cart operations, and web checkout flow. | [06. Marketplace](modules/06_marketplace.md) |
| **[`PickupController.java`](../src/main/java/com/agroloop/controller/web/PickupController.java)** | Web Controller | `class PickupController` | Handles farmer pickup operations (`/farmer/pickups/**`) and household cancellation. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`AdminController.java`](../src/main/java/com/agroloop/controller/web/AdminController.java)** | Web Controller | `class AdminController` | Dedicated admin portal serving `/admin/users`, `/admin/orders`, `/admin/ledger`, storage diagnostics. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`FarmerRouteController.java`](../src/main/java/com/agroloop/controller/web/FarmerRouteController.java)** | Web Controller | `FarmerRouteController` | Farmer collection routes view (`/farmer/routes`) with Leaflet route map, TSP optimization, and stop progression. | Phase 9 Logistics |
| **[`ReviewWebController.java`](../src/main/java/com/agroloop/controller/web/ReviewWebController.java)** | Web Controller | `class ReviewWebController` | Public farmer profile (`/reviews/farmer/{id}`) and review submission forms (`/reviews/pickup/{id}/new`, `/reviews/order/{id}/new`). | Phase 10 Trust |
| **[`NotificationWebController.java`](../src/main/java/com/agroloop/controller/web/NotificationWebController.java)** | Web Controller | `NotificationWebController` | Notification inbox view (`/notifications`) with live SSE connection badge and mark-read actions. | Phase 11 Streaming |

---

### 4.9 Flyway Database Migrations

| File Path | Component Layer | Migration Version | Database Schema Modifications | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`V1__create_user_tables.sql`](../src/main/resources/db/migration/V1__create_user_tables.sql)** | DB Migration | `V1` | Creates base `users` table and joined tables `households`, `farmers`, and `admins`. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`V2__create_farmer_applications_table.sql`](../src/main/resources/db/migration/V2__create_farmer_applications_table.sql)** | DB Migration | `V2` | Creates `farmer_applications` table with user foreign keys and status checks. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`V3__create_waste_submissions_table.sql`](../src/main/resources/db/migration/V3__create_waste_submissions_table.sql)** | DB Migration | `V3` | Creates `waste_submissions` table with category, status, weight, and image paths. | [03. Submissions](modules/03_waste_submission.md) |
| **[`V4__create_pickup_and_verification_tables.sql`](../src/main/resources/db/migration/V4__create_pickup_and_verification_tables.sql)** | DB Migration | `V4` | Creates `pickup_requests` (with `@Version` column) and `waste_verifications` tables. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`V5__create_ecotoken_transactions_table.sql`](../src/main/resources/db/migration/V5__create_ecotoken_transactions_table.sql)** | DB Migration | `V5` | Creates `ecotoken_transactions` audit ledger with unique verification constraints. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`V6__create_marketplace_tables.sql`](../src/main/resources/db/migration/V6__create_marketplace_tables.sql)** | DB Migration | `V6` | Creates `products`, `orders`, `order_items`, and adds `order_id` to ledger. | [06. Marketplace](modules/06_marketplace.md) |
| **[`V7__create_admin_and_refund_governance.sql`](../src/main/resources/db/migration/V7__create_admin_and_refund_governance.sql)** | DB Migration | `V7` | Implements `token_balance >= 0` check, refund columns, and PostgreSQL ledger immutability trigger. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`V8__api_sessions_idempotency_media.sql`](../src/main/resources/db/migration/V8__api_sessions_idempotency_media.sql)** | DB Migration | `V8` | Creates `auth_sessions`, `idempotency_keys`, and `media_assets` tables. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`V9__pickup_handshake.sql`](../src/main/resources/db/migration/V9__pickup_handshake.sql)** | DB Migration | `V9` | Creates `pickup_handshakes` table for server-authoritative QR codes. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`V10__waste_matcher_and_routes.sql`](../src/main/resources/db/migration/V10__waste_matcher_and_routes.sql)** | DB Migration | `V10` | Adds `latitude` and `longitude` coordinates to farmers/households, and creates `collection_routes` and `route_stops` tables. | Phase 9 Logistics |
| **[`V11__ratings_and_reviews.sql`](../src/main/resources/db/migration/V11__ratings_and_reviews.sql)** | DB Migration | `V11` | Adds `average_rating` and `review_count` to farmers/households, and creates `reviews` table with strict integrity checks. | Phase 10 Trust |
| **[`V12__notification_system.sql`](../src/main/resources/db/migration/V12__notification_system.sql)** | DB Migration | `V12` | Creates `notifications` table with composite indexes on `(user_id, created_at DESC)` and `(user_id, is_read)`. | Phase 11 Streaming |

---

### 4.10 Thymeleaf UI Views & Static Assets

| File Path | Component Layer | Core Classes / View | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`index.html`](../src/main/resources/templates/index.html)** | UI View | Thymeleaf Template | Public landing page featuring brand logo, DB status indicator, and role cards. | [01. Setup](modules/01_project_setup.md) |
| **[`login.html`](../src/main/resources/templates/login.html)** | UI View | Thymeleaf Template | Styled authentication view with demo credential autofill buttons and error banners. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`register.html`](../src/main/resources/templates/register.html)** | UI View | Thymeleaf Template | Registration view with default Household role notice and address validation. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`household.html`](../src/main/resources/templates/dashboard/household.html)** | UI View | Thymeleaf Template | Household portal showing EcoToken balance, pickups, and farmer conversion form. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`farmer.html`](../src/main/resources/templates/dashboard/farmer.html)** | UI View | Thymeleaf Template | Farmer portal showing farm profile, collection summary, and produce listing links. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`admin.html`](../src/main/resources/templates/dashboard/admin.html)** | UI View | Thymeleaf Template | Administrator portal displaying pending farmer conversion application queues. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`users.html`](../src/main/resources/templates/admin/users.html)** | UI View | Thymeleaf Template | Admin user management view with status toggles and manual token adjustment modals. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`orders.html`](../src/main/resources/templates/admin/orders.html)** | UI View | Thymeleaf Template | Admin order view with cancellation and dispute adjudication modals. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`ledger.html`](../src/main/resources/templates/admin/ledger.html)** | UI View | Thymeleaf Template | Admin immutable ledger viewer with credit/debit chips and pagination. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`routes.html`](../src/main/resources/templates/farmer/routes.html)** | UI View | Thymeleaf Template | Interactive Leaflet routing portal with waypoint sequencing, TSP optimization, and stop tracking. | [09. Routing](modules/09_route_planning_and_matching.md) |
| **[`farmer-profile.html`](../src/main/resources/templates/reviews/farmer-profile.html)** | UI View | Thymeleaf Template | Public farmer trust profile displaying 5-star rating breakdowns, badges, and customer feedback. | [10. Reviews](modules/10_ratings_and_reviews.md) |
| **[`submit-review.html`](../src/main/resources/templates/reviews/submit-review.html)** | UI View | Thymeleaf Template | Contextual review submission form with interactive 5-star selector and rating commentary. | [10. Reviews](modules/10_ratings_and_reviews.md) |
| **[`notifications/index.html`](../src/main/resources/templates/notifications/index.html)** | UI View | Thymeleaf Template | Live real-time notification inbox with SSE connection indicator and mark-all-read action. | [11. Alerts](modules/11_realtime_events_and_alerts.md) |
| **[`css/style.css`](../src/main/resources/static/css/style.css)** | Static Stylesheet | CSS | Global responsive stylesheet with dark-mode palette, typography, and glassmorphism. | [01. Setup](modules/01_project_setup.md) |
| **[`images/logo.png`](../src/main/resources/static/images/logo.png)** | Static Asset | PNG Image | High-resolution official AgroLoop brand artwork and browser favicon. | [01. Setup](modules/01_project_setup.md) |

---

### 4.11 Multi-Client Monorepo: Core Config & Shared Packages

| File Path | Component Layer | Core Packages | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`package.json`](../clients/package.json)** | Monorepo Root | Root Package | Turborepo monorepo root defining client package workspaces and dev scripts. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`pnpm-workspace.yaml`](../clients/pnpm-workspace.yaml)** | Workspace Config | PNPM Config | Defines package boundaries: `packages/*`, `web`, `mobile`, `desktop`. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`turbo.json`](../clients/turbo.json)** | Build Orchestration | Turborepo Pipeline | Configures caching, task pipelines, and topological builds across clients. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`openapi.json`](../clients/openapi/openapi.json)** | API Contract | OpenAPI 3.1 Spec | Exported REST API specification driving type generation and client SDKs. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`api-types/src/index.ts`](../clients/packages/api-types/src/index.ts)** | Shared Library | `@agroloop/api-types` | Generated TypeScript types matching backend API responses and requests. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`api-client/src/client.ts`](../clients/packages/api-client/src/client.ts)** | Shared Library | `@agroloop/api-client` | Typed HTTP client with single-flight refresh mutex, WebKit fetch binding, and idempotency injection. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`api-client/src/formatters.ts`](../clients/packages/api-client/src/formatters.ts)** | Shared Library | `@agroloop/api-client` | Clean role string formatter mapping backend authorities (`ROLE_FARMER` -> `Farmer`, etc.). | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`qr/src/qr-matrix.ts`](../clients/packages/qr/src/qr-matrix.ts)** | Shared Library | `@agroloop/qr` | Pure TypeScript QR matrix generator using Kazuhiko Arase algorithms. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`playwright.config.ts`](../clients/playwright.config.ts)** | E2E Config | Playwright Config | Multi-project E2E test configuration orchestrating Web (port 3100) and Desktop (port 1420). | [08. Clients](modules/08_cross_platform_clients.md) |

---

### 4.12 Multi-Client Monorepo: Next.js 15 Web Portal (`@agroloop/web`)

| File Path | Component Layer | Core Classes / Routes | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`page.tsx`](../clients/web/src/app/page.tsx)** | Web Page | Next.js Page | Public landing page featuring responsive hero, live diagnostics, and navigation. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`route.ts (Proxy)`](../clients/web/src/app/api/proxy/[...path]/route.ts)** | BFF Security Proxy | Route Handler | Server-side proxy injecting Bearer tokens from HttpOnly cookies and forwarding calls. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`route.ts (Login)`](../clients/web/src/app/api/auth/login/route.ts)** | BFF Auth | Route Handler | Authenticates against backend and sets secure HttpOnly cookie session. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`route.ts (Refresh)`](../clients/web/src/app/api/auth/refresh/route.ts)** | BFF Auth | Route Handler | Rotates refresh token under server-side single-flight mutex. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`household/page.tsx`](../clients/web/src/app/household/page.tsx)** | Web Portal | Household Page | Household dashboard displaying EcoToken wallet, active pickups, and submissions. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`farmer/page.tsx`](../clients/web/src/app/farmer/page.tsx)** | Web Portal | Farmer Page | Farmer dashboard displaying collection schedules and product inventory. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`marketplace/page.tsx`](../clients/web/src/app/marketplace/page.tsx)** | Web Portal | Marketplace Page | Organic farm produce catalog with filtering, stock badges, and cart drawer. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`cart-drawer.tsx`](../clients/web/src/components/cart-drawer.tsx)** | UI Component | React Component | Sliding shopping cart drawer with live token balance and checkout button. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`auth-context.tsx`](../clients/web/src/lib/auth-context.tsx)** | State Management | React Context | Manages user profile, authentication status, and role-based route protection. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`cart-context.tsx`](../clients/web/src/lib/cart-context.tsx)** | State Management | React Context | Manages local shopping cart items, quantities, and persistent state. | [08. Clients](modules/08_cross_platform_clients.md) |

---

### 4.13 Multi-Client Monorepo: React Native / Expo Mobile App (`@agroloop/mobile`)

| File Path | Component Layer | Core Classes / Screens | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`_layout.tsx`](../clients/mobile/app/_layout.tsx)** | App Layout | Expo Router | Root navigation layout providing AuthContext and offline network indicators. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`server-setup.tsx`](../clients/mobile/app/server-setup.tsx)** | Configuration | Screen | Dynamic backend discovery screen configuring API URLs for emulators & physical devices. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`qr-handshake.ts`](../clients/mobile/src/services/qr-handshake.ts)** | Mobile Service | Handshake Service | Requests server-authoritative HMAC-SHA256 passes and parses scanned payloads. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`qr-code-view.tsx`](../clients/mobile/src/components/qr-code-view.tsx)** | UI Component | React Native Component | High-contrast QR matrix display using Kazuhiko Arase algorithm without webviews. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`qr-scanner-modal.tsx`](../clients/mobile/src/components/qr-scanner-modal.tsx)** | UI Component | React Native Component | Camera barcode scanner with viewfinder overlay and payload validation. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`secure-store.ts`](../clients/mobile/src/storage/secure-store.ts)** | Storage Security | Secure Vault | Wraps `expo-secure-store` for hardware-backed token storage on iOS/Android. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`offline-queue.ts`](../clients/mobile/src/storage/offline-queue.ts)** | Offline Sync | Queue Service | Stores mutations during network dropouts and flushes idempotently on reconnect. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`media-upload.ts`](../clients/mobile/src/services/media-upload.ts)** | Media Handling | Upload Service | Executes 3-phase ticketed image uploads with resizing before submission. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |

---

### 4.14 Multi-Client Monorepo: Tauri v2 Desktop Operations Console (`@agroloop/desktop`)

| File Path | Component Layer | Core Classes / Components | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`App.tsx`](../clients/desktop/src/App.tsx)** | Desktop Entrypoint | React Component | Main administrative shell featuring tabbed navigation and server connectivity indicator. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`tauri.conf.json`](../clients/desktop/src-tauri/tauri.conf.json)** | Tauri Configuration | Native App Config | Configures Tauri v2 desktop window, security permissions, and OS keychain plugins. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`build.rs`](../clients/desktop/src-tauri/build.rs)** | Rust Build Script | Tauri Build | Invokes `tauri_build::build()` to compile native macOS/Windows/Linux platform bindings. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`SolvencyAudit.tsx`](../clients/desktop/src/components/SolvencyAudit.tsx)** | Desktop View | React Component | Real-time platform solvency console reconciling Tier-1 user balances with Tier-2 ledgers. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`UserGovernance.tsx`](../clients/desktop/src/components/UserGovernance.tsx)** | Desktop View | React Component | User management view with status toggles and manual token adjustment modals. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`LedgerExplorer.tsx`](../clients/desktop/src/components/LedgerExplorer.tsx)** | Desktop View | React Component | Immutable financial audit ledger viewer with transaction filtering and pagination. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`FleetDispatch.tsx`](../clients/desktop/src/components/FleetDispatch.tsx)** | Desktop View | React Component | Live pickup collection dispatch board showing real-time pickup statuses. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`OrderDisputes.tsx`](../clients/desktop/src/components/OrderDisputes.tsx)** | Desktop View | React Component | Order dispute arbitration console allowing admins to review and approve refunds. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`desktop-storage.ts`](../clients/desktop/src/storage/desktop-storage.ts)** | Storage Security | Storage Adapter | Native OS Keychain delegation storing administrative credentials securely. | [08. Clients](modules/08_cross_platform_clients.md) |

---

### 4.15 Backend Test Suites & Quality Verification

| File Path | Test Category | Target Component | Verifications & Test Assertions | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`UserModelTest.java`](../src/test/java/com/agroloop/model/UserModelTest.java)** | Domain Unit | `User`, `Household`, `Farmer` | Verifies OOP encapsulation, token arithmetic, non-negative invariants, and roles. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`WasteSubmissionModelTest.java`](../src/test/java/com/agroloop/model/WasteSubmissionModelTest.java)** | Domain Unit | `WasteSubmission` | Verifies state transitions, weight invariants, and address fallback logic. | [03. Submissions](modules/03_waste_submission.md) |
| **[`PickupRequestModelTest.java`](../src/test/java/com/agroloop/model/PickupRequestModelTest.java)** | Domain Unit | `PickupRequest` | Tests state machine, decline re-queue, cancellation windows, and invariants. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`WasteVerificationModelTest.java`](../src/test/java/com/agroloop/model/WasteVerificationModelTest.java)** | Domain Unit | `WasteVerification` | Verifies weight positivity enforcement, quality multipliers, and null-safety. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`EcoTokenTransactionTest.java`](../src/test/java/com/agroloop/model/EcoTokenTransactionTest.java)** | Domain Unit | `EcoTokenTransaction` | Domain tests verifying immutability, direction invariants, and balance snapshots. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`ProductModelTest.java`](../src/test/java/com/agroloop/model/ProductModelTest.java)** | Domain Unit | `Product` | Tests stock deductions, restock, metadata updates, and activation toggles. | [06. Marketplace](modules/06_marketplace.md) |
| **[`OrderModelTest.java`](../src/test/java/com/agroloop/model/OrderModelTest.java)** | Domain Unit | `Order`, `OrderItem` | Tests order line items, address fallback, and historical snapshot immutability. | [06. Marketplace](modules/06_marketplace.md) |
| **[`OrderLifecycleTest.java`](../src/test/java/com/agroloop/model/OrderLifecycleTest.java)** | Domain Unit | `Order` | Verifies cancellation windows, dispute single-entry invariant, and adjudication. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`TokenCalculatorTest.java`](../src/test/java/com/agroloop/service/TokenCalculatorTest.java)** | Strategy Unit | `TokenCalculator` | Strategy tests verifying standard/promotional reward calculations and zero-rejections. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`FileStorageServiceTest.java`](../src/test/java/com/agroloop/service/FileStorageServiceTest.java)** | Storage Unit | `LocalFileStorageServiceImpl` | Verifies UUID renaming, traversal rejection, and MIME checking. | [03. Submissions](modules/03_waste_submission.md) |
| **[`CartServiceTest.java`](../src/test/java/com/agroloop/service/CartServiceTest.java)** | Service Unit | `CartServiceImpl` | Unit tests verifying session cart mutations, quantity bounds, and clearing. | [06. Marketplace](modules/06_marketplace.md) |
| **[`PickupHandshakeTest.java`](../src/test/java/com/agroloop/service/PickupHandshakeTest.java)** | Cryptography Unit | `PickupHandshakeService` | Verifies HMAC pass issuance, tamper detection, and TTL expiration. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`WasteSubmissionRepositoryTest.java`](../src/test/java/com/agroloop/repository/WasteSubmissionRepositoryTest.java)** | JPA Slice | `WasteSubmissionRepository` | Database slice tests verifying repository queries, household cascades, and filters. | [03. Submissions](modules/03_waste_submission.md) |
| **[`PickupRequestRepositoryTest.java`](../src/test/java/com/agroloop/repository/PickupRequestRepositoryTest.java)** | JPA Slice | `PickupRequestRepository` | Database slice tests verifying repository queries, status filters, and foreign keys. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`TokenRewardServiceTest.java`](../src/test/java/com/agroloop/service/TokenRewardServiceTest.java)** | Mockito Unit | `TokenRewardServiceImpl` | Tests reward minting, lock acquisition, idempotency, and audit entries. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`PickupServiceTest.java`](../src/test/java/com/agroloop/service/PickupServiceTest.java)** | Mockito Unit | `PickupServiceImpl` | Tests service orchestration and role authorization guards. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`ProductServiceTest.java`](../src/test/java/com/agroloop/service/ProductServiceTest.java)** | Mockito Unit | `ProductServiceImpl` | Tests farmer ownership authorization, catalog filters, and soft archival. | [06. Marketplace](modules/06_marketplace.md) |
| **[`MarketplaceServiceTest.java`](../src/test/java/com/agroloop/service/MarketplaceServiceTest.java)** | Mockito Unit | `MarketplaceServiceImpl` | Tests checkout pipeline, server-side pricing, solvency checks, and lock ordering. | [06. Marketplace](modules/06_marketplace.md) |
| **[`AdminGovernanceServiceTest.java`](../src/test/java/com/agroloop/service/AdminGovernanceServiceTest.java)** | Mockito Unit | `AdminGovernanceServiceImpl` | Tests user enabling/disabling, self-disable guard, and Tier-2 solvency calculation. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`WasteSubmissionServiceTest.java`](../src/test/java/com/agroloop/service/WasteSubmissionServiceTest.java)** | Mockito Unit | `WasteSubmissionServiceImpl` | Tests service workflows, address inheritance, and exception handling. | [03. Submissions](modules/03_waste_submission.md) |
| **[`AuthControllerTest.java`](../src/test/java/com/agroloop/controller/AuthControllerTest.java)** | Web Integration | `AuthController` | Tests login rendering, role-based redirects, invalid credentials, and access. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`HomeControllerTest.java`](../src/test/java/com/agroloop/controller/HomeControllerTest.java)** | Web Integration | `HomeController` | Integration test verifying public landing page and database status indicator. | [01. Setup](modules/01_project_setup.md) |
| **[`UserRegistrationAndConversionTest.java`](../src/test/java/com/agroloop/controller/UserRegistrationAndConversionTest.java)** | Web Integration | `UserController` | Integration tests verifying household registration, farmer application, and approval. | [02. Auth](modules/02_user_management_and_auth.md) |
| **[`WasteSubmissionIntegrationTest.java`](../src/test/java/com/agroloop/controller/WasteSubmissionIntegrationTest.java)** | Web Integration | `WasteSubmissionController` | Tests multipart file upload and waste recording workflow. | [03. Submissions](modules/03_waste_submission.md) |
| **[`PickupIntegrationTest.java`](../src/test/java/com/agroloop/controller/PickupIntegrationTest.java)** | Web Integration | `PickupController` | Tests claim -> schedule -> collect -> verify lifecycle and household cancellation. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`DashboardIntegrationTest.java`](../src/test/java/com/agroloop/controller/DashboardIntegrationTest.java)** | Web Integration | `DashboardController` | Tests populated EcoToken ledger rendering with `open-in-view=false`. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`MarketplaceControllerTest.java`](../src/test/java/com/agroloop/controller/MarketplaceControllerTest.java)** | Web Integration | `MarketplaceController` | Tests catalog browsing, cart operations, checkout, and post-commit cart clear. | [06. Marketplace](modules/06_marketplace.md) |
| **[`FarmerProductControllerTest.java`](../src/test/java/com/agroloop/controller/FarmerProductControllerTest.java)** | Web Integration | `FarmerProductController` | Tests farmer product management, role protection, and cross-farmer guards. | [06. Marketplace](modules/06_marketplace.md) |
| **[`AdminControllerTest.java`](../src/test/java/com/agroloop/controller/AdminControllerTest.java)** | Web Integration | `AdminController` | Tests `/admin/**` endpoints, role enforcement, flash attributes, and error handling. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`AdminControllerProductionModeTest.java`](../src/test/java/com/agroloop/controller/AdminControllerProductionModeTest.java)** | Web Integration | `AdminController` | Asserts development test credentials button is hidden in production mode. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`MarketplaceOrderLifecycleSecurityTest.java`](../src/test/java/com/agroloop/controller/MarketplaceOrderLifecycleSecurityTest.java)** | Web Integration | `OrderController` | Tests cross-household cancellation/dispute rejection (403) and farmer protection. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`AuthApiControllerTest.java`](../src/test/java/com/agroloop/controller/api/v1/AuthApiControllerTest.java)** | REST Integration | `AuthApiController` | Tests `/api/v1/auth/login`, token pair issuance, refresh rotation, and 401 handling. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`AdminApiControllerTest.java`](../src/test/java/com/agroloop/controller/api/v1/AdminApiControllerTest.java)** | REST Integration | `AdminApiController` | Tests admin REST endpoints, token adjustments, and solvency queries. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`SystemApiControllerTest.java`](../src/test/java/com/agroloop/controller/api/v1/SystemApiControllerTest.java)** | REST Integration | `SystemApiController` | Tests `/api/v1/system/health` and `/meta` endpoint responses. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`ApiAuthorizationTest.java`](../src/test/java/com/agroloop/security/ApiAuthorizationTest.java)** | Security Integration | Security Architecture | Comprehensive validation of role-based authorization across all `/api/v1/**` endpoints. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`IdempotencyIntegrationTest.java`](../src/test/java/com/agroloop/security/IdempotencyIntegrationTest.java)** | Concurrency / Security | `IdempotencyService` | Multithreaded test verifying duplicate execution prevention and encrypted replay. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`RefreshConcurrencyTest.java`](../src/test/java/com/agroloop/security/RefreshConcurrencyTest.java)** | Concurrency / Security | `TokenService` | Tests concurrent refresh requests, family revocation, and single-flight grace periods. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`OpenApiContractTest.java`](../src/test/java/com/agroloop/config/OpenApiContractTest.java)** | Contract Integration | OpenAPI Specification | Asserts Swagger / OpenAPI 3.1 JSON conforms to exported `openapi.json` contract. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`TokenRewardServiceIntegrationTest.java`](../src/test/java/com/agroloop/service/TokenRewardServiceIntegrationTest.java)** | Concurrency Stress | `TokenRewardService` | Asserts pessimistic write locking, idempotency, and lost-update prevention. | [05. EcoTokens](modules/05_ecotokens.md) |
| **[`MarketplaceConcurrencyIntegrationTest.java`](../src/test/java/com/agroloop/service/MarketplaceConcurrencyIntegrationTest.java)** | Concurrency Stress | `MarketplaceService` | 10 concurrent threads competing for 2 stock units; exactly 2 succeed, 8 fail gracefully. | [06. Marketplace](modules/06_marketplace.md) |
| **[`MarketplaceDeadlockAndRollbackIntegrationTest.java`](../src/test/java/com/agroloop/service/MarketplaceDeadlockAndRollbackIntegrationTest.java)** | Concurrency Stress | `MarketplaceService` | Concurrency testing inverted carts [A,B] vs [B,A] and rollback on insufficient tokens. | [06. Marketplace](modules/06_marketplace.md) |
| **[`OrderAtomicRefundTest.java`](../src/test/java/com/agroloop/service/OrderAtomicRefundTest.java)** | Concurrency Stress | `AdminGovernanceService` | Asserts atomic inventory restock, token credit, and double-refund prevention. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`OrderLifecycleConcurrencyTest.java`](../src/test/java/com/agroloop/service/OrderLifecycleConcurrencyTest.java)** | Concurrency Stress | `Order` Lifecycle | Simultaneous cancel, dispute, and complete on same order; exactly one wins. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`ConcurrentHouseholdLedgerMutationTest.java`](../src/test/java/com/agroloop/service/ConcurrentHouseholdLedgerMutationTest.java)** | Concurrency Stress | Financial Ledger | 15 concurrent threads performing credits, debits, adjustments; asserts running balance. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`ConcurrentLastAdminProtectionTest.java`](../src/test/java/com/agroloop/service/ConcurrentLastAdminProtectionTest.java)** | Concurrency Stress | `AdminGovernanceService` | Verifies serialized last-admin defense; prevents concurrent requests from 0 admins. | [07. Admin](modules/07_admin_and_testing.md) |
| **[`CollectionRouteTest.java`](../src/test/java/com/agroloop/model/CollectionRouteTest.java)** | Domain Unit | `CollectionRoute`, `RouteStop` | Verifies route stop sequencing, distance updates, and status transitions. | [09. Routing](modules/09_route_planning_and_matching.md) |
| **[`RouteServiceTest.java`](../src/test/java/com/agroloop/service/RouteServiceTest.java)** | Service Unit | `RouteServiceImpl`, `PickupRouteOptimizer` | Asserts TSP route optimization, Haversine geo calculations, and stop progression. | [09. Routing](modules/09_route_planning_and_matching.md) |
| **[`FarmerRouteControllerTest.java`](../src/test/java/com/agroloop/controller/FarmerRouteControllerTest.java)** | Web Integration | `FarmerRouteController` | Tests route dashboard view, route creation, and stop status mutation. | [09. Routing](modules/09_route_planning_and_matching.md) |
| **[`ReviewTest.java`](../src/test/java/com/agroloop/model/ReviewTest.java)** | Domain Unit | `Review` | Asserts 1-5 rating range enforcement, self-review guard, and comment bounds. | [10. Reviews](modules/10_ratings_and_reviews.md) |
| **[`ReviewServiceTest.java`](../src/test/java/com/agroloop/service/ReviewServiceTest.java)** | Service Unit | `ReviewServiceImpl` | Tests review submission, duplicate checks, star averages, and reputation calculation. | [10. Reviews](modules/10_ratings_and_reviews.md) |
| **[`ReviewApiControllerTest.java`](../src/test/java/com/agroloop/controller/api/v1/ReviewApiControllerTest.java)** | REST Integration | `ReviewApiController` | Tests `/api/v1/reviews/**` endpoints, role security, validation, and error responses. | [10. Reviews](modules/10_ratings_and_reviews.md) |
| **[`ReviewWebControllerTest.java`](../src/test/java/com/agroloop/controller/ReviewWebControllerTest.java)** | Web Integration | `ReviewWebController` | Tests public farmer profile view and context review submission workflows. | [10. Reviews](modules/10_ratings_and_reviews.md) |
| **[`NotificationTest.java`](../src/test/java/com/agroloop/model/NotificationTest.java)** | Domain Unit | `Notification` | Verifies notification creation, unread state defaults, and mark-as-read transitions. | [11. Alerts](modules/11_realtime_events_and_alerts.md) |
| **[`NotificationServiceTest.java`](../src/test/java/com/agroloop/service/NotificationServiceTest.java)** | Service Unit | `NotificationServiceImpl` | Tests persistent notification inbox, unread counts, mark-read, and SSE broadcasting. | [11. Alerts](modules/11_realtime_events_and_alerts.md) |
| **[`NotificationApiControllerTest.java`](../src/test/java/com/agroloop/controller/api/v1/NotificationApiControllerTest.java)** | REST Integration | `NotificationApiController` | Tests SSE stream handshake, notification retrieval, unread counts, and batch read. | [11. Alerts](modules/11_realtime_events_and_alerts.md) |
| **[`NotificationWebControllerTest.java`](../src/test/java/com/agroloop/controller/NotificationWebControllerTest.java)** | Web Integration | `NotificationWebController` | Tests notification inbox UI rendering, SSE stream endpoint, and mark-read redirects. | [11. Alerts](modules/11_realtime_events_and_alerts.md) |
| **[`StorageManagerTest.java`](../src/test/java/com/agroloop/service/storage/StorageManagerTest.java)** | Storage SPI Unit | `StorageManager` | Verifies dynamic polymorphic dispatch between Local and S3/MinIO backends and diagnostics. | [12. Storage](modules/12_cloud_storage_and_scaling.md) |
| **[`AgroLoopApplicationTests.java`](../src/test/java/com/agroloop/AgroLoopApplicationTests.java)** | Smoke Test | Spring Context | Bootstraps full Spring Boot context to ensure all beans and configurations load cleanly. | [01. Setup](modules/01_project_setup.md) |

---

### 4.16 Frontend & Cross-Platform Client Test Suites

| File Path | Test Framework | Target Client | Key Verifications | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`security.test.ts`](../clients/web/src/security.test.ts)** | Vitest | `@agroloop/web` | BFF route authentication, token stripping, and secure cookie headers. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`auth.test.ts`](../clients/web/src/tests/auth.test.ts)** | Vitest | `@agroloop/web` | Login state transitions, error handling, and redirection. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`cart.test.ts`](../clients/web/src/tests/cart.test.ts)** | Vitest | `@agroloop/web` | Cart item additions, stock bounding, total calculations, and clearing. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`bff-proxy.test.ts`](../clients/web/src/tests/bff-proxy.test.ts)** | Vitest | `@agroloop/web` | Backend proxy path rewrites, headers forwarding, and error bubbling. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`auth-context.test.ts`](../clients/mobile/src/context/auth-context.test.ts)** | Jest | `@agroloop/mobile` | Mobile auth lifecycle, token restoration from SecureStore, and logout. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`secure-store.test.ts`](../clients/mobile/src/storage/secure-store.test.ts)** | Jest | `@agroloop/mobile` | Hardware-backed keychain abstraction reads, writes, and deletions. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`offline-queue.test.ts`](../clients/mobile/src/storage/offline-queue.test.ts)** | Jest | `@agroloop/mobile` | Enqueueing offline mutations, persistence, and idempotent replay on network restore. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`qr-handshake.test.ts`](../clients/mobile/src/services/qr-handshake.test.ts)** | Jest | `@agroloop/mobile` | QR payload canonicalization, signature checking, and error flows. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`media-upload.test.ts`](../clients/mobile/src/services/media-upload.test.ts)** | Jest | `@agroloop/mobile` | Ticket acquisition, chunked binary transmission, and confirmation steps. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`farmer-verification.test.ts`](../clients/mobile/src/services/farmer-verification.test.ts)** | Jest | `@agroloop/mobile` | Farmer on-site verification workflow, weight inputs, and grading. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`household-pickup.test.ts`](../clients/mobile/src/services/household-pickup.test.ts)** | Jest | `@agroloop/mobile` | Household pickup requests, active pass generation, and cancellation. | [04. Pickups](modules/04_pickup_and_verification.md) |
| **[`admin-ops.test.ts`](../clients/desktop/src/tests/admin-ops.test.ts)** | Vitest | `@agroloop/desktop` | Solvency calculations, user governance actions, and order dispute decisions. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`desktop-storage.test.ts`](../clients/desktop/src/storage/desktop-storage.test.ts)** | Vitest | `@agroloop/desktop` | Native OS Keychain adapter storage and token retrieval. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`qr.test.ts`](../clients/packages/qr/src/qr.test.ts)** | Vitest | `@agroloop/qr` | Matrix dimension calculations, error correction encoding, and quiet zone rules. | [08. QR Handshake](modules/08_mobile_qr_handshake.md) |
| **[`client.test.ts`](../clients/packages/api-client/src/client.test.ts)** | Vitest | `@agroloop/api-client` | HTTP method execution, automatic header injection, WebKit fetch binding, and response parsing. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`formatters.test.ts`](../clients/packages/api-client/src/formatters.test.ts)** | Vitest | `@agroloop/api-client` | Role formatting transformation (`ROLE_FARMER` -> `Farmer`, etc.) and edge cases. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`server-verification.test.ts`](../clients/packages/api-client/src/server-verification.test.ts)** | Vitest | `@agroloop/api-client` | Server discovery handshake and public key verification routines. | [07.5. API Boundary](modules/07_5_client_api_boundary.md) |
| **[`web-ui.spec.ts`](../clients/e2e/web-ui.spec.ts)** | Playwright | `@agroloop/web` | Marketplace navigation, cart drawer, role badges ("Farmer", "Household", "Admin"), and routing. | [08. Clients](modules/08_cross_platform_clients.md) |
| **[`desktop-ui.spec.ts`](../clients/e2e/desktop-ui.spec.ts)** | Playwright | `@agroloop/desktop` | Operator login gate, header role badge, user governance table role badges, and server manager. | [08. Clients](modules/08_cross_platform_clients.md) |

---

## 5. Dedicated Integration Modules

Each feature and integration in AgroLoop has its own dedicated documentation file explaining its purpose, OOP principles, architecture, database impact, and operational guides:

| Module Document | Phase & Topic | Status | Description |
| :--- | :--- | :--- | :--- |
| **[01. Project Setup & Baseline](modules/01_project_setup.md)** | Phase 1: Setup | Completed | Spring Boot 3.3.4 scaffolding, Maven wrapper, PostgreSQL Docker integration, and cross-platform runners. |
| **[02. User Management & Security](modules/02_user_management_and_auth.md)** | Phase 2: Auth | Completed | JPA Joined Inheritance (`User`, `Household`, `Farmer`, `Admin`), Spring Security, BCrypt hashing, public registration defaulting to Household, Farmer conversion request workflow with Admin review/approval, and logo branding. |
| **[03. Waste Submission & Media](modules/03_waste_submission.md)** | Phase 3: Submissions | Completed | Multipart photo uploads, category classification taxonomy, address inheritance, UUID storage with traversal defense, and household dashboard tracking. |
| **[04. Pickup & Verification Engine](modules/04_pickup_and_verification.md)** | Phase 4: Pickups | Completed | Farmer pickup claims, collection state machine, quality grading, decline re-queuing, and post-collection verification. |
| **[05. EcoTokens & Rewards](modules/05_ecotokens.md)** | Phase 5: Rewards | Completed | Polymorphic `TokenCalculator` strategy, atomic wallet updates, pessimistic locking, idempotent reward minting, and household ledger. |
| **[06. Marketplace & Commerce](modules/06_marketplace.md)** | Phase 6: Commerce | Completed | Farmer product catalog, soft-archive lifecycle, session cart, authoritative DB pricing, deterministic dual-phase pessimistic locking, atomic stock/token/order/ledger checkout, and sales tracking. |
| **[07. Admin Governance & Testing](modules/07_admin_and_testing.md)** | Phase 7: Governance | Completed | Order lifecycle state machine, atomic refund engine, deterministic lock hierarchy (`Order` -> `Household` -> `Products ASC`), double-refund prevention, physical immutability trigger, serialized last-admin protection, two-tier financial reconciliation, and admin portal. |
| **[07.5. Client/API Boundary & Architecture](modules/07_5_client_api_boundary.md)** | Phase 7.5: Client/API | Completed | Versioned `/api/v1` REST contract layer for Web, Mobile, and Desktop. Dual Spring Security filter chains, RSA-2048 JWT, refresh rotation with replay defense, AES-GCM-256 encrypted idempotency, media management, OpenAPI 3.1, and 265 green tests. |
| **[08. Mobile QR Handshake Architecture](modules/08_mobile_qr_handshake.md)** | Phase 8: Mobile Handshake | Completed | Ephemeral server-authoritative HMAC-SHA256 dynamic QR passes, pessimistic locked verification, zero-PII compact payloads, brute-force rate-limiting, and pure React Native Kazuhiko Arase QR matrix integration. |
| **[08. Cross-Platform Clients Architecture](modules/08_cross_platform_clients.md)** | Phase 8: Web & Desktop Clients | Completed | Multi-client ecosystem: Next.js 15 Web Portal (`@agroloop/web` with BFF boundary, HttpOnly cookie rotation, server-side single-flight refresh mutex, and allowlist proxy) & Tauri v2 Desktop Operations Console (`@agroloop/desktop` with native OS Keychain delegation, live Tier-1 & Tier-2 Solvency Reconciliation, User Governance, Order Disputes, Ledger Explorer, and Fleet Telemetry). |
| **[09. Route Planning & Waste Matching](modules/09_route_planning_and_matching.md)** | Phase 9: Routing & Logistics | Completed | Polymorphic `WasteMatcher` strategy interface (`DistanceBased`, `CapacityBalanced`, `Composite`), TSP 2-Opt heuristic route optimization (`RouteOptimizationService`), interactive Leaflet routing map (`/farmer/routes`), and REST API endpoints (`/api/v1/farmer/routes/**`). |
| **[10. Ratings, Reviews & Reputation](modules/10_ratings_and_reviews.md)** | Phase 10: Feedback & Trust | Completed | 1-5 star ratings and written reviews between Households and Farmers, anti-self-review guard, aggregate farmer reputation scores (`averageRating`, `reviewCount`), public farmer trust profiles (`/reviews/farmer/{id}`), and REST API endpoints (`/api/v1/reviews/**`). |
| **[11. Real-Time Events & Push Alerts](modules/11_realtime_events_and_alerts.md)** | Phase 11: Live Streaming & Mobile | Completed | Real-time event streaming via Server-Sent Events (SSE) with thread-safe `SseEmitterRegistry`, Spring Domain event listeners (`NotificationEvents`), persistent notification inbox with unread badge (`/notifications`), and REST API endpoints (`/api/v1/notifications/**`). |
| **[12. Cloud Storage & Scaled Infrastructure](modules/12_cloud_storage_and_scaling.md)** | Phase 12: Cloud Native & S3 | Completed | Pluggable Cloud Storage SPI (`CloudStorageService`, `StorageManager` facade supporting Local Filesystem, AWS S3, and MinIO), native Java 21 `HttpClient` SigV4 REST client, presigned upload URLs, and admin operations storage diagnostics card (`/admin/dashboard`, `/api/v1/admin/storage/status`). |
| **[13. Postman API Documentation & Automation](modules/13_postman_api_documentation.md)** | Phase 13: Developer Tooling | Completed | Comprehensive Postman v2.1.0 collection (66 endpoints across 11 domains), pre-configured environment, pre-request dev key injection, automated token extraction, and Newman CLI runner. |

---

## 6. Git & Pull Request (PR) Workflow

We enforce a strict multi-tier branch progression and Pull Request (PR) review flow to guarantee repository stability:

```
main (Production / Stable Releases)
  ▲
  │ Pull Request (from dev to main, reviewed & signed off)
  │
dev (Active Integration & Continuous Integration)
  ▲
  │ Pull Request (from feature/<name> to dev, passing automated CI)
  │
feature/<phase-name> (Individual feature branch)
```

### Development & Pull Request Rules

1. **Feature Branch Creation:**
   - Always branch off `dev`:
     ```bash
     git checkout dev
     git pull origin dev
     git checkout -b feature/<feature-name>
     ```
2. **Local Verification:**
   - Ensure all tests compile and pass with Java 21:
     ```bash
     ./mvnw clean test
     ```
   - For client changes, ensure TypeScript and Vitest/Jest tests pass:
     ```bash
     cd clients && pnpm test
     ```
3. **Commit & Push:**
   - Commit following Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).
   - Push to remote:
     ```bash
     git push -u origin feature/<feature-name>
     ```
4. **Open Pull Request Targeting `dev`:**
   - Direct CLI merges to `dev` or `main` are strictly forbidden.
   - Open a Pull Request on GitHub targeting **base: `dev`**:
     👉 **[Create PR to dev](https://github.com/AgnaMariya/AgroLoop/compare/dev...feature/<feature-name>?expand=1)**
   - Fill out the automated checklist in [`.github/pull_request_template.md`](../.github/pull_request_template.md).
   - GitHub Actions CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) automatically runs the test suite against the PR.
5. **Release Promotion to `main` via PR:**
   - When a phase/milestone is ready for release, open a PR from `dev` to `main`:
     👉 **[Create PR from dev to main](https://github.com/AgnaMariya/AgroLoop/compare/main...dev?expand=1)**
   - Review, approve, and merge into `main`.
6. **Automated Main Release Packaging:**
   - Merging or pushing code into `main` automatically fires [`.github/workflows/main-release.yml`](../.github/workflows/main-release.yml).
   - Builds multi-stage production Docker images for Backend (`agroloop-backend:latest`) and Next.js Web (`agroloop-web:latest`).
   - Packages `@agroloop/mobile` cross-platform Expo JS/assets bundle (`agroloop-mobile-expo-export`) and compiles the standalone Android debug APK (`agroloop-mobile-android-debug`).
   - Attaches built packages as downloadable GitHub Actions run artifacts.

