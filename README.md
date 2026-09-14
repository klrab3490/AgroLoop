# AgroLoop

> **Bridging Waste Management, Agriculture, and Sustainable Commerce**

AgroLoop is a Java Spring Boot web application designed to connect households and farmers through a circular economy model. Households submit organic waste for collection, farmers verify and collect waste for composting and soil enrichment, and contributors earn **EcoTokens** redeemable in a sustainable marketplace.

---

## Tech Stack

- **Backend:** Java (JDK 21+ / Temurin 26), Spring Boot 3.x (Spring MVC, Spring Data JPA, Spring Validation)
- **Database:** PostgreSQL (running in Docker)
- **Frontend / Templating:** Thymeleaf, HTML5, CSS3, JavaScript
- **Build Tool:** Maven 3.9+
- **File Storage:** Local multipart storage (with transition path to cloud object storage)
- **AI Classification:** Multi-modal waste classification (final phase)

---

## Core Roles & Capabilities

| Role | Responsibilities |
| :--- | :--- |
| **Household** | Profile management, organic waste submission with photos, pickup tracking, EcoToken balance, marketplace purchases. |
| **Farmer** | Profile management, pickup request assignment & scheduling, quality and quantity verification upon collection, product listing in marketplace. |
| **Admin** | System administration, user/role management, verification dispute handling, marketplace order auditing, platform analytics. |

---

## Core Entities

| Entity | Description |
| :--- | :--- |
| `User` | Authentication credentials, email, password hash, role (`HOUSEHOLD`, `FARMER`, `ADMIN`). |
| `Household` | Household profile, address, contact information, pickup coordinates/notes. |
| `Farmer` | Farmer profile, farm location, accepted waste categories, processing capacity. |
| `WasteSubmission` | Waste classification details, estimated quantity, image attachment, collection status. |
| `PickupRequest` | Assignment of waste submission to farmer, pickup scheduling, collection status. |
| `WasteVerification` | Post-collection verification of actual quantity and quality grade by the farmer. |
| `TokenTransaction` | EcoToken credit/debit audit log (rewards earned from verified waste, spent in marketplace). |
| `Product` | Sustainable produce and compost items listed by farmers or platform partners. |
| `Order` | Marketplace checkout records placed by households using EcoTokens or payment. |

---

## Architecture

```
                       Browser (Thymeleaf Templates)
                                     │
                                     ▼
                    Spring Boot Controllers (Web / MVC)
                                     │
                                     ▼
                          Service Layer (Business Logic)
                                     │
                                     ▼
                      Repositories (Spring Data JPA)
                                     │
                                     ▼
                         PostgreSQL Database (Docker)
```

---

## Critical Business Rules

1. **Authenticated Access:** Only authenticated users can submit waste and view personalized dashboards.
2. **Pickup Assignment & Verification:** Only assigned farmers can inspect, accept, and verify pickups.
3. **Reward Preconditions:** Waste must be collected and verified before EcoToken rewards are credited.
4. **Idempotent Rewards:** Each verified pickup triggers exactly one token reward transaction.
5. **Marketplace Integrity:** Token purchases validate real-time token balance and product inventory under transaction isolation.

---

## Git Branch Plan

All development follows feature branches aligned with the project roadmap:

```
main
├── feature/project-setup
├── feature/authentication
├── feature/profiles
├── feature/waste-submission-images
├── feature/pickup-management
├── feature/waste-verification
├── feature/ecotoken-system
├── feature/marketplace
├── feature/route-planning
├── feature/admin
├── feature/testing-deployment
└── feature/ai-classification
```

For detailed phase tracking and implementation milestones, see [ROADMAP.md](./ROADMAP.md).

---

## Getting Started

### Prerequisites
- **Java:** JDK 21+ (e.g. OpenJDK 21 or Temurin 26)
- **Docker & Docker Compose:** For running PostgreSQL (and optional containerized app)
- **Git**

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

Run the test suite locally to verify database connectivity and web routes:

- **macOS / Linux:**
  ```bash
  ./mvnw test
  ```

- **Windows:**
  ```cmd
  mvnw.cmd test
  ```


