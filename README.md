# AgroLoop

> **Bridging Waste Management, Agriculture, and Sustainable Commerce**

AgroLoop is a Java Spring Boot web application designed to connect households and farmers through a circular economy model. Households submit organic waste for collection, farmers verify and collect waste for composting and soil enrichment, and contributors earn **EcoTokens** redeemable in a sustainable marketplace.

---

📚 **[Comprehensive Developer Documentation Hub & Freshers Guide](./docs/INDEX.md)**  
*Complete setup guide (how to install Java, how to install Docker, start the project on Windows/Mac, OOP principles, and deep-dive documentation for all modules).*

---


## Tech Stack

- **Backend:** Java (JDK 21+ / Temurin 26), Spring Boot 3.3.4 (Spring MVC, Spring Data JPA, Spring Security with stateless RSA-2048 JWT & session chains, Server-Sent Events)
- **Database:** PostgreSQL (Docker containerized, Flyway database migrations V1–V12)
- **Web Frontend:** Next.js 15 App Router (`@agroloop/web` with BFF security proxy, HttpOnly cookie rotation, and Tailwind CSS) + Thymeleaf SSR templates
- **Desktop Application:** Tauri v2 + React 19 (`@agroloop/desktop` with native macOS/Windows OS Keychain delegation)
- **Mobile Application:** React Native / Expo (`@agroloop/mobile` with offline queue, secure storage, and HMAC-SHA256 QR handshake)
- **Shared Libraries:** Pure TypeScript QR matrix (`@agroloop/qr`), Typed REST SDK (`@agroloop/api-client`) with WebKit fetch binding & role formatters
- **Monorepo & Build Tooling:** Turborepo 2.11.5, pnpm 12 workspaces, Maven 3.9+
- **Testing & Verification:** JUnit 5, Mockito, Vitest, Jest, and Playwright End-to-End browser automation
- **Cloud & File Storage:** Pluggable `CloudStorageService` SPI (Local Filesystem, AWS S3, and MinIO via native Java 21 `HttpClient` SigV4)

---

## Object-Oriented Principles in AgroLoop

- **Encapsulation:** User identity, token balances, and waste lifecycle states are encapsulated inside model classes. Mutations happen through domain methods (`accept()`, `decline()`, `verifyWaste()`, `calculateTokens()`).
- **Inheritance:** A polymorphic `User` base entity (`@Inheritance(strategy = InheritanceType.JOINED)`) extended by `Household`, `Farmer`, and `Admin`.
- **Polymorphism:** Strategy interfaces (`TokenCalculator`, `WasteMatcher`) allowing interchangeable business algorithms.
- **Abstraction:** Controllers call business services (`UserService`, `WasteSubmissionService`, etc.) rather than manipulating repositories or entities directly.

---

## Package Structure

```
AgroLoop/
├── src/main/java/com/agroloop/
│   ├── AgroLoopApplication.java
│   ├── config/             # Security, beans, and MVC configs
│   ├── controller/         # Web/Thymeleaf controllers
│   ├── service/            # Business logic and service interfaces
│   ├── repository/         # Spring Data JPA repositories
│   ├── model/              # OOP Domain classes with Inheritance
│   │   ├── User.java
│   │   ├── Household.java
│   │   ├── Farmer.java
│   │   ├── Admin.java
│   │   ├── WasteSubmission.java
│   │   ├── PickupRequest.java
│   │   ├── WasteVerification.java
│   │   ├── EcoTokenTransaction.java
│   │   └── Product.java
│   ├── dto/                # Validation and form transfer objects
│   └── exception/          # Custom domain exceptions
├── src/main/resources/
│   ├── application.properties
│   ├── static/             # CSS & JS assets
│   └── templates/          # Thymeleaf templates
├── pom.xml
└── docker-compose.yml
```

---

## Core Class Relationships

```mermaid
classDiagram
    class User {
        -Long id
        -String name
        -String email
        -String passwordHash
        +login()
    }

    class Household {
        -double tokenBalance
        +submitWaste()
        +requestPickup()
        +cancelPickup()
        +buyProduct()
    }

    class Farmer {
        +acceptPickup()
        +declinePickup()
        +schedulePickup()
        +verifyWaste()
        +addProduct()
    }

    class Admin {
        +manageUsers()
        +manageWasteRules()
        +managePickups()
        +reviewDisputes()
    }

    class WasteSubmission {
        -Long id
        -WasteCategory category
        -double estimatedWeight
        -String imageUrl
    }

    class PickupRequest {
        -Long id
        -PickupStatus status
        +accept()
        +decline()
        +cancel()
    }

    class WasteVerification {
        -double verifiedWeight
        -VerificationStatus status
        +calculateTokens()
    }

    class EcoTokenTransaction {
        -Long id
        -BigDecimal amount
        -TransactionType type
    }

    class Product {
        -Long id
        -String name
        -BigDecimal price
        -int stock
    }

    User <|-- Household
    User <|-- Farmer
    User <|-- Admin

    Household "1" --> "*" WasteSubmission
    Household "1" --> "*" EcoTokenTransaction
    Farmer "1" --> "*" PickupRequest
    Farmer "1" --> "*" Product

    WasteSubmission "1" --> "*" PickupRequest
    PickupRequest "1" --> "0..1" WasteVerification
```

---

## Architecture Flow

```
                       Browser (Thymeleaf Templates)
                                     │
                                     ▼
                    Spring Boot Controllers (Web / MVC)
                                     │
                                     ▼
                      Service Layer (Abstraction & OOP)
                                     │
                                     ▼
                      Repositories (Spring Data JPA)
                                     │
                                     ▼
                   PostgreSQL Database (Docker / Joined Tables)
```

---

## Critical Business Rules

1. **Authenticated Access:** Only authenticated users can submit waste and view personalized dashboards.
2. **Pickup Assignment & Verification:** Only assigned farmers can inspect, accept, and verify pickups.
3. **Reward Preconditions:** Waste must be collected and verified before EcoToken rewards are credited.
4. **Idempotent Rewards:** Each verified pickup triggers exactly one token reward transaction.
5. **Marketplace Integrity:** Token purchases validate real-time token balance and product inventory under transaction isolation.

---

## Git Branch & Promotion Strategy

All development is performed on feature branches, integrated initially into `dev`, and promoted to `main` only after review and verification:

```
main (stable releases / production v1.0.0)
└── dev (active development & integration)
    ├── feature/project-setup (Phase 1 - Completed)
    ├── feature/user-management (Phase 2 - Completed)
    ├── feature/waste-submission (Phase 3 - Completed)
    ├── feature/pickup-verification (Phase 4 - Completed)
    ├── feature/ecotokens (Phase 5 - Completed)
    ├── feature/marketplace (Phase 6 - Completed)
    ├── feature/admin-testing (Phase 7 - Completed)
    ├── feature/client-api-boundary (Phase 7.5 - Completed)
    ├── feature/cross-platform-clients (Phase 8 - Completed)
    ├── feature/route-planning-matching (Phase 9 - Completed)
    ├── feature/ratings-reputation (Phase 10 - Completed)
    ├── feature/realtime-push-alerts (Phase 11 - Completed)
    └── feature/cloud-storage-scaling (Phase 12 - Completed)
```

Workflow:
1. Develop features on `feature/<phase-name>`.
2. Push and merge verified features into `dev`.
3. Conduct testing and review on `dev`.
4. Merge `dev` into `main` for milestone releases.

For detailed phase tracking and implementation milestones, see [ROADMAP.md](./ROADMAP.md).


---

## Getting Started

### Prerequisites
- **Java:** JDK 21+ (e.g. OpenJDK 21 or Temurin 26)
- **Docker & Docker Compose:** For running PostgreSQL (and optional containerized app)
- **Git**

> **💡 Quick Environment Setup & Health Check:**  
> Run the automated setup script to verify, install, and update all required packages on your system:
> - **macOS / Linux:** `./setup.sh` *(or `./setup.sh --check-only` for dry-run inspection)*
> - **Windows:** `setup.bat`

---

### Method 1: Running the Application Locally (Recommended for Development)

#### Step 1: Start PostgreSQL in Docker
If PostgreSQL is not already running on your machine, start the database service using Docker Compose:

```bash
docker compose up -d postgres
```

> **Note:** The default connection configuration is:
> - **Host:** `localhost:5432`
> - **Database:** `agroloop`
> - **User:** `postgres`
> - **Password:** `7200`
> - **JDBC URL:** `jdbc:postgresql://localhost:5432/agroloop`

#### Step 2: Configure Environment (Optional)
The project includes a pre-configured `.env` and default values in `application.properties`. To customize settings (e.g. port or database credentials), copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

#### Step 3: Start the Application

- **On macOS / Linux:**
  ```bash
  ./run.sh
  ```
  *(Or directly via the Maven wrapper: `./mvnw spring-boot:run`)*

- **On Windows (Command Prompt / PowerShell):**
  ```cmd
  run.bat
  ```
  *(Or directly via the Maven wrapper: `mvnw.cmd spring-boot:run`)*

#### Step 4: Access the Application
Once started, navigate to:
👉 **[http://localhost:8080](http://localhost:8080)**

You will see the AgroLoop homepage with a green **PostgreSQL Connected** status badge, overview of stakeholder portals (Household, Farmer, Admin), and the 12-phase roadmap progress tracker.

#### Default Credentials Reference

| Service / Role | Username / Email | Password | URL / Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `postgres` | `7200` | `localhost:5432` / `agroloop` | Core relational database |
| **pgAdmin (Optional)** | `admin@agroloop.local` | `admin` | `http://localhost:5055` | DB Admin UI (`--profile tools`) |
| **App: Admin** | `admin@agroloop.com` | `admin123` | `http://localhost:8080/login` | System administrator dashboard |
| **App: Household** | `household@agroloop.com` | `household123` | `http://localhost:8080/login` | Household waste submission & wallet |
| **App: Farmer** | `farmer@agroloop.com` | `farmer123` | `http://localhost:8080/login` | Farmer pickup & verification portal |

---

### Method 2: Running Everything in Docker (App + Database)

To build and run the entire stack (PostgreSQL database and Spring Boot Java server) in isolated Docker containers:

```bash
# Build and run in detached mode
docker compose up --build -d

# View live application logs
docker compose logs -f app

# Stop the containers
docker compose down
```

---

### Running Automated Tests

#### 1. Backend Verification Suite (350 Passing Tests)
Run the full Spring Boot JUnit 5 test suite:
- **macOS / Linux:**
  ```bash
  ./mvnw test
  ```
- **Windows:**
  ```cmd
  mvnw.cmd test
  ```

#### 2. Cross-Platform Client Unit Tests (Vitest & Jest)
Run unit and integration tests across all client packages (`@agroloop/web`, `@agroloop/mobile`, `@agroloop/desktop`, `@agroloop/api-client`, `@agroloop/qr`):
```bash
cd clients
pnpm test
```

#### 3. Playwright End-to-End (E2E) Browser Suite
Execute automated browser tests across Web UI and Desktop Operator UI:
```bash
cd clients
pnpm test:e2e
```
- **Web UI tests only:** `pnpm --dir clients test:e2e:web`
- **Desktop UI tests only:** `pnpm --dir clients test:e2e:desktop`
- **Interactive UI mode:** `pnpm --dir clients test:e2e:ui`

---

### Git & Pull Request (PR) Workflow

AgroLoop uses a multi-tier branch flow where **all changes merge via Pull Request (PR)**:

```
main (Production / Releases)
  ▲
  │ Release PR (dev ➔ main)
  │
dev (Active QA / Continuous Integration)
  ▲
  │ Feature PR (feature/* ➔ dev)
  │
feature/<name> (Local Feature Branch)
```

1. **Create Feature Branch**:
   ```bash
   git checkout dev && git pull origin dev
   git checkout -b feature/<feature-name>
   ```
2. **Implement, Test, and Commit**:
   ```bash
   ./mvnw clean test
   git commit -m "feat(scope): describe changes"
   git push -u origin feature/<feature-name>
   ```
3. **Open PR targeting `dev`**:
   👉 [Create Pull Request to `dev`](https://github.com/AgnaMariya/AgroLoop/compare/dev...feature/<feature-name>?expand=1)  
   Complete the PR checklist in `.github/pull_request_template.md`. GitHub Actions runs automated tests on Java 21.
4. **Release PR to `main`**:
   👉 [Create Release PR to `main`](https://github.com/AgnaMariya/AgroLoop/compare/main...dev?expand=1)



