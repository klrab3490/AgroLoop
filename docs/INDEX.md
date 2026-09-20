# AgroLoop — Comprehensive Developer & Integration Hub

Welcome to the **AgroLoop Developer Documentation Hub**. This central directory serves as the single source of truth for the project's architecture, object-oriented design standards, onboarding tutorials for freshers, and dedicated deep-dive documentation for every feature and integration.

---

## Quick Navigation

- [Freshers Onboarding & Installation Guide](#1-freshers-onboarding--installation-guide)
  - [Installing Java (JDK 21+)](#step-1-installing-java-jdk-21)
  - [Installing Docker & Docker Compose](#step-2-installing-docker--docker-compose)
  - [Starting the Project Locally](#step-3-starting-the-project-locally)
- [Object-Oriented Architecture Master Guide](#2-object-oriented-architecture-master-guide)
  - [The Four Pillars in AgroLoop](#the-four-pillars-in-agroloop)
  - [UML Class Diagram](#uml-class-diagram)
- [Dedicated Integration Modules](#3-dedicated-integration-modules)
- [Git & Release Strategy](#4-git--release-strategy)

---

## 1. Freshers Onboarding & Installation Guide

This section helps you get up and running on your local machine (macOS or Windows) from scratch.

### Prerequisites Checklist

| Component | Minimum Version | Recommended Version |
| :--- | :--- | :--- |
| **Java JDK** | Java 21 | Eclipse Temurin 21 or 26 |
| **Build Tool** | Maven 3.9+ | Included via `./mvnw` wrapper |
| **Docker Desktop** | Docker 24+ / Compose v2 | Docker Desktop latest |
| **Git** | Git 2.30+ | Latest |

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
*Manual Download:* Visit [Adoptium Temurin Releases](https://adoptium.net/temurin/releases/?version=21), select **Windows x64**, download the `.msi` installer, ensure the checkbox **"Set JAVA_HOME variable"** is checked during installation, and restart your terminal.

Verify installation:
```cmd
java -version
```

---

### Step 2: Installing Docker & Docker Compose

Docker runs PostgreSQL and (optionally) containerizes the entire AgroLoop application.

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
2. Download **Docker Desktop for Windows**: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/).
3. Run the installer and ensure **"Use WSL 2 instead of Hyper-V"** is checked.
4. Restart your PC, launch Docker Desktop, and verify:
   ```cmd
   docker --version
   docker compose version
   ```

---

### Step 3: Starting the Project Locally

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
   *(Default connection: `postgresql://postgres:7200@localhost:5432/agroloop`)*

2. **Run the Application**:
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
   Navigate to [http://localhost:8080](http://localhost:8080).

#### Option B: Run Full Docker Stack (App + Database Containerized)
```bash
docker compose up --build -d
```
Logs: `docker compose logs -f app`  
Stop: `docker compose down`

#### Option C: Run Postgres-Free Local Docker Stack (Connect to Host PostgreSQL)
If you already have PostgreSQL installed and running natively on your machine:
```bash
docker compose -f docker-compose.local.yml up --build -d
```
This builds and starts the Spring Boot backend (`app`) and Next.js frontend (`web`) without spinning up a PostgreSQL container, securely routing database traffic to your host machine via `host.docker.internal:5432`.
Logs: `docker compose -f docker-compose.local.yml logs -f app`  
Stop: `docker compose -f docker-compose.local.yml down`

---

### Step 4: Default Credentials Reference

| Service / Role | Username / Email | Password | Port / URL | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | `postgres` | `7200` | `localhost:5432` / `agroloop` | Pre-configured in `.env` & Docker |
| **pgAdmin (Optional)** | `admin@agroloop.local` | `admin` | `http://localhost:5055` | Run with `--profile tools` |
| **App: Admin (Seeded)** | `admin@agroloop.com` | `admin123` | `http://localhost:8080/login` | Full system administration |
| **App: Household (Demo)** | `household@agroloop.com` | `household123` | `http://localhost:8080/login` | Waste submission & token spending |
| **App: Farmer (Demo)** | `farmer@agroloop.com` | `farmer123` | `http://localhost:8080/login` | Pickup verification & marketplace |

---

## 2. Object-Oriented Architecture Master Guide

AgroLoop is strictly designed around Object-Oriented Programming (OOP) principles. Domain classes are responsible for their internal state and business validation.

### The Four Pillars in AgroLoop

1. **Encapsulation:**
   - All entity attributes use `private` access modifiers.
   - Raw public setters are prohibited for sensitive state (`passwordHash`, `tokenBalance`, operational statuses).
   - Mutations occur exclusively through business domain methods (e.g. `addTokens()`, `spendTokens()`, `accept()`, `verifyWaste()`).

2. **Inheritance:**
   - A polymorphic `User` abstract parent class mapped with `@Inheritance(strategy = InheritanceType.JOINED)`.
   - Common identity, credentials, and role management live in `User`.
   - Concrete subclasses (`Household`, `Farmer`, `Admin`) extend `User` and map to joined database tables (`households`, `farmers`, `admins`).

3. **Polymorphism:**
   - Extensible interfaces decouple business rules from implementations (e.g. `TokenCalculator`, `WasteMatcher`).
   - Controllers and services treat subclasses polymorphically through their base abstractions.

4. **Abstraction:**
   - Web controllers never interact with database queries directly.
   - Service classes (`UserService`, `WasteSubmissionService`) define clean contracts for application operations.

---

### UML Class Diagram

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
        -BigDecimal balanceAfter
    }

    class Product {
        -Long id
        -String name
        -BigDecimal priceInTokens
        -int stock
        -boolean active
        +deductStock(quantity)
        +restock(quantity)
        +deactivate()
        +activate()
    }

    class Order {
        -Long id
        -String orderNumber
        -BigDecimal totalTokens
        -OrderStatus status
        -String deliveryAddress
        +addItem(item)
        +complete()
    }

    class OrderItem {
        -Long id
        -String productName
        -BigDecimal unitPrice
        -int quantity
        -BigDecimal subtotal
        -String farmerName
    }

    User <|-- Household
    User <|-- Farmer
    User <|-- Admin

    Household "1" --> "*" WasteSubmission
    Household "1" --> "*" EcoTokenTransaction
    Household "1" --> "*" Order
    Farmer "1" --> "*" PickupRequest
    Farmer "1" --> "*" Product
    Order "1" --> "*" OrderItem
    Order "1" --> "0..1" EcoTokenTransaction
    OrderItem "*" --> "1" Product

    WasteSubmission "1" --> "*" PickupRequest
    PickupRequest "1" --> "0..1" WasteVerification
    WasteVerification "1" --> "0..1" EcoTokenTransaction
```

## 3. End-to-End System Architecture & Data Flow Mapping

AgroLoop follows a clean, layered architectural pattern adhering to strict object-oriented design and separation of concerns. The diagram below illustrates how client interactions traverse the system:

```mermaid
flowchart TD
    subgraph Client["Client Browser (Thymeleaf UI)"]
        UI_Home["Landing Page /"]
        UI_Auth["Auth Views (/login, /register)"]
        UI_Dash["Dashboards (/household, /farmer, /admin)"]
    end

    subgraph Security["Spring Security Layer"]
        Filter["SecurityFilterChain"]
        AuthManager["DaoAuthenticationProvider"]
        UserDetailSvc["CustomUserDetailsService"]
        SuccessHandler["CustomAuthenticationSuccessHandler"]
    end

    subgraph Controllers["Web Controllers"]
        HomeCtrl["HomeController"]
        AuthCtrl["AuthController"]
        DashCtrl["DashboardController"]
    end

    subgraph Services["Domain Service Layer"]
        UserSvc["UserService / UserServiceImpl"]
    end

    subgraph Domain["OOP Domain Models & JPA Entities"]
        UserBase["User (Abstract Base)"]
        Household["Household (Subclass)"]
        Farmer["Farmer (Subclass)"]
        Admin["Admin (Subclass)"]
        FarmerApp["FarmerApplication (Entity)"]
    end

    subgraph Repositories["Data Access Repositories"]
        UserRepo["UserRepository"]
        HouseholdRepo["HouseholdRepository"]
        FarmerRepo["FarmerRepository"]
        AdminRepo["AdminRepository"]
        FarmerAppRepo["FarmerApplicationRepository"]
    end

    subgraph Persistence["PostgreSQL Database & Flyway"]
        Flyway["Flyway Migrations (V1, V2)"]
        T_Users[("users (Parent Table)")]
        T_Households[("households (Joined Table)")]
        T_Farmers[("farmers (Joined Table)")]
        T_Admins[("admins (Joined Table)")]
        T_FarmerApps[("farmer_applications")]
    end

    UI_Home --> Filter
    UI_Auth --> Filter
    UI_Dash --> Filter

    Filter --> AuthManager
    AuthManager --> UserDetailSvc
    UserDetailSvc --> UserRepo
    Filter --> SuccessHandler

    Filter --> HomeCtrl
    Filter --> AuthCtrl
    Filter --> DashCtrl

    AuthCtrl --> UserSvc
    DashCtrl --> UserSvc
    DashCtrl --> HouseholdRepo
    DashCtrl --> FarmerRepo
    DashCtrl --> UserRepo

    UserSvc --> HouseholdRepo
    UserSvc --> FarmerAppRepo
    UserSvc --> UserRepo

    HouseholdRepo --> Household
    FarmerRepo --> Farmer
    AdminRepo --> Admin
    FarmerAppRepo --> FarmerApp
    UserRepo --> UserBase

    UserBase <|-- Household
    UserBase <|-- Farmer
    UserBase <|-- Admin

    Household --> T_Households
    Farmer --> T_Farmers
    Admin --> T_Admins
    UserBase --> T_Users
    FarmerApp --> T_FarmerApps
    Flyway -.-> T_Users
    Flyway -.-> T_FarmerApps
```

### Role Lifecycle & Conversion Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as New User
    actor HouseholdUser as Household
    actor AdminUser as Administrator
    participant Browser as Web Browser
    participant AuthCtrl as AuthController
    participant DashCtrl as DashboardController
    participant UserSvc as UserService
    participant DB as PostgreSQL

    Note over Citizen,DB: 1. Public Registration (Default to Household)
    Citizen->>Browser: Visit /register
    Browser->>AuthCtrl: GET /register
    AuthCtrl-->>Browser: Render register.html (Notice: default role is Household)
    Citizen->>Browser: Submit registration form
    Browser->>AuthCtrl: POST /register (name, email, password, address)
    AuthCtrl->>UserSvc: registerHousehold(RegisterRequest)
    UserSvc->>DB: Save Household entity into users & households tables
    UserSvc-->>AuthCtrl: Saved Household
    AuthCtrl-->>Browser: Redirect to /login?registered=true

    Note over HouseholdUser,DB: 2. Farmer Conversion Application
    HouseholdUser->>Browser: Login -> Redirect to /household/dashboard
    HouseholdUser->>Browser: Fill "Apply to Become a Farmer" form
    Browser->>DashCtrl: POST /household/apply-farmer (farmName, farmAddress, notes)
    DashCtrl->>UserSvc: submitFarmerApplication(email, request)
    UserSvc->>DB: Insert FarmerApplication with status = PENDING
    UserSvc-->>DashCtrl: Saved FarmerApplication
    DashCtrl-->>Browser: Redirect to /household/dashboard (Shows "Pending Review" banner)

    Note over AdminUser,DB: 3. Administrative Review & Role Conversion
    AdminUser->>Browser: Login -> Access /admin/dashboard
    Browser->>DashCtrl: GET /admin/dashboard
    DashCtrl->>UserSvc: getPendingFarmerApplications()
    UserSvc->>DB: SELECT * FROM farmer_applications WHERE status = 'PENDING'
    DashCtrl-->>Browser: Render Moderation Queue table
    AdminUser->>Browser: Click "Approve" for application #ID
    Browser->>DashCtrl: POST /admin/applications/{id}/approve
    DashCtrl->>UserSvc: approveFarmerApplication(id)
    UserSvc->>DB: UPDATE farmer_applications SET status = 'APPROVED'
    UserSvc->>DB: UPDATE users SET role = 'ROLE_FARMER' WHERE id = userId
    UserSvc->>DB: INSERT INTO farmers (id, farm_name, farm_address, notes)
    UserSvc-->>DashCtrl: Role conversion confirmed
    DashCtrl-->>Browser: Redirect /admin/dashboard?success=Approved
```

---

## 4. Master Repository File Structure & Function Catalog

The table below catalogs every key file in the AgroLoop codebase, providing a direct clickable link, its architectural responsibility, key classes and methods, and its mapping to documentation modules.

| File Path | Component Layer | Core Classes / Interfaces | Key Functions & Responsibilities | Mapped Module |
| :--- | :--- | :--- | :--- | :--- |
| **[`pom.xml`](../pom.xml)** | Build & Dependencies | Maven POM | Declares project dependencies: Spring Boot 3.3.4, Security, JPA, PostgreSQL, Flyway, H2 (test), Thymeleaf. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)** | CI / Automation | GitHub Actions | Automated continuous integration running Java 21 test suites on PRs and dev branch. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`.github/workflows/main-release.yml`](../.github/workflows/main-release.yml)** | CI / Packaging | GitHub Actions | Production release pipeline triggered on main branch push; builds backend & web Docker containers and packages standalone Android APK + Expo bundle. | [08. Clients](../docs/modules/08_cross_platform_clients.md) |
| **[`.github/pull_request_template.md`](../.github/pull_request_template.md)** | Code Review | PR Template | Standardized Pull Request template enforcing OOP principles, documentation updates, and test verification. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`run.sh`](../run.sh)** | Dev Runner | Shell Script | Automates local execution on macOS/Linux with environment checks and PostgreSQL readiness verification. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`run.bat`](../run.bat)** | Dev Runner | Batch Script | Automates local execution on Windows Command Prompt. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`docker-compose.yml`](../docker-compose.yml)** | Infrastructure | Compose Config | Orchestrates PostgreSQL container and full application stack with healthchecks and volumes. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`docker-compose.local.yml`](../docker-compose.local.yml)** | Infrastructure | Compose Config | Runs backend and web frontend containers connecting directly to a native/host PostgreSQL database without running a Postgres container. | [08. Clients](../docs/modules/08_cross_platform_clients.md) |
| **[`docker/init.sql`](../docker/init.sql)** | Database Schema | SQL Script | Standalone PostgreSQL schema initialization script for Docker container bootstrap. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`application.properties`](../../src/main/resources/application.properties)** | Config | Properties | Configures PostgreSQL datasource (`localhost:5432/agroloop`), Flyway migrations, multipart limits (10MB). | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`AgroLoopApplication.java`](../../src/main/java/com/agroloop/AgroLoopApplication.java)** | Application Entrypoint | `AgroLoopApplication` | Bootstraps the Spring Boot application context (`main` method). | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`Role.java`](../../src/main/java/com/agroloop/model/Role.java)** | Domain Model | `enum Role` | Defines ecosystem security authorities: `ROLE_HOUSEHOLD`, `ROLE_FARMER`, `ROLE_ADMIN`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`User.java`](../../src/main/java/com/agroloop/model/User.java)** | Domain Model | `abstract class User` | Base JPA entity with Joined Table inheritance (`users` table). Encapsulates identity, email, password hash, role, timestamps. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`Household.java`](../../src/main/java/com/agroloop/model/Household.java)** | Domain Model | `class Household extends User` | Joined subtype for households (`households` table). Encapsulates `tokenBalance`, `address`, `addTokens()`, `spendTokens()`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`Farmer.java`](../../src/main/java/com/agroloop/model/Farmer.java)** | Domain Model | `class Farmer extends User` | Joined subtype for farmers (`farmers` table). Encapsulates `farmName`, `farmAddress`, `notes`, `updateFarmDetails()`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`Admin.java`](../../src/main/java/com/agroloop/model/Admin.java)** | Domain Model | `class Admin extends User` | Joined subtype for system administrators (`admins` table). Holds administrative authority. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`FarmerApplicationStatus.java`](../../src/main/java/com/agroloop/model/FarmerApplicationStatus.java)** | Domain Model | `enum FarmerApplicationStatus` | Status lifecycle for role conversion: `PENDING`, `APPROVED`, `REJECTED`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`FarmerApplication.java`](../../src/main/java/com/agroloop/model/FarmerApplication.java)** | Domain Model | `class FarmerApplication` | JPA entity encapsulating farmer conversion requests. Contains domain methods `approve()` and `reject(reason)`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`UserRepository.java`](../../src/main/java/com/agroloop/repository/UserRepository.java)** | Persistence | `UserRepository` | Spring Data JPA queries for base `User`: `findByEmail()`, `existsByEmail()`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`HouseholdRepository.java`](../../src/main/java/com/agroloop/repository/HouseholdRepository.java)** | Persistence | `HouseholdRepository` | Spring Data JPA queries for `Household` entities: `findByEmail()`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`FarmerRepository.java`](../../src/main/java/com/agroloop/repository/FarmerRepository.java)** | Persistence | `FarmerRepository` | Spring Data JPA queries for `Farmer` entities: `findByEmail()`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`AdminRepository.java`](../../src/main/java/com/agroloop/repository/AdminRepository.java)** | Persistence | `AdminRepository` | Spring Data JPA queries for `Admin` entities: `findByEmail()`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`FarmerApplicationRepository.java`](../../src/main/java/com/agroloop/repository/FarmerApplicationRepository.java)** | Persistence | `FarmerApplicationRepository` | Spring Data JPA queries: `findByStatus()`, `findTopByUserIdOrderByCreatedAtDesc()`, `existsByUserIdAndStatus()`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`RegisterRequest.java`](../../src/main/java/com/agroloop/dto/RegisterRequest.java)** | DTO | `class RegisterRequest` | Form backing object with Jakarta validation: `name`, `email`, `password`, `confirmPassword`, `address`, `isPasswordMatching()`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`FarmerApplicationRequest.java`](../../src/main/java/com/agroloop/dto/FarmerApplicationRequest.java)** | DTO | `class FarmerApplicationRequest` | Form backing object for role conversion: `farmName`, `farmAddress`, `notes`. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`UserService.java`](../../src/main/java/com/agroloop/service/UserService.java)** | Service Contract | `interface UserService` | Service contract for registration (`registerHousehold`), application (`submitFarmerApplication`), and review (`approveFarmerApplication`, `rejectFarmerApplication`). | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`UserServiceImpl.java`](../../src/main/java/com/agroloop/service/UserServiceImpl.java)** | Service Logic | `class UserServiceImpl` | Implements business logic, BCrypt encryption, transactional role conversion, and L1 cache management. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`CustomUserDetailsService.java`](../../src/main/java/com/agroloop/service/CustomUserDetailsService.java)** | Security Integration | `CustomUserDetailsService` | Implements Spring Security's `UserDetailsService`. Maps domain `User` to `UserDetails` with authorities. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`CustomAuthenticationSuccessHandler.java`](../../src/main/java/com/agroloop/config/CustomAuthenticationSuccessHandler.java)** | Security Routing | `CustomAuthenticationSuccessHandler` | Dynamically redirects authenticated users based on role (`ROLE_ADMIN` ➔ `/admin/dashboard`, `ROLE_FARMER` ➔ `/farmer/dashboard`, `ROLE_HOUSEHOLD` ➔ `/household/dashboard`). | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`SecurityConfig.java`](../../src/main/java/com/agroloop/config/SecurityConfig.java)** | Security Config | `SecurityConfig` | Configures `SecurityFilterChain`, `BCryptPasswordEncoder`, form login, role-based URL protection, and permitted public routes (`/`, `/login/**`, `/register/**`). | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`DataInitializer.java`](../../src/main/java/com/agroloop/config/DataInitializer.java)** | Data Bootstrap | `DataInitializer` | `CommandLineRunner` that idempotently seeds default demo accounts (`admin@agroloop.com`, `household@agroloop.com`, `farmer@agroloop.com`) on startup. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`HomeController.java`](../../src/main/java/com/agroloop/controller/HomeController.java)** | Web Controller | `HomeController` | Serves public landing page (`GET /`) with live PostgreSQL connection diagnostics. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`AuthController.java`](../../src/main/java/com/agroloop/controller/AuthController.java)** | Web Controller | `AuthController` | Handles `GET /login`, `GET /register`, and `POST /register` with validation and flash alerts. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`DashboardController.java`](../../src/main/java/com/agroloop/controller/DashboardController.java)** | Web Controller | `DashboardController` | Serves role dashboards (`/household/dashboard`, `/farmer/dashboard`, `/admin/dashboard`), handles `POST /household/apply-farmer`, and Admin approval/rejection endpoints. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`V1__create_user_tables.sql`](../../src/main/resources/db/migration/V1__create_user_tables.sql)** | Migration | SQL Migration | Flyway script creating tables for `users`, `households`, `farmers`, and `admins` with joined foreign keys. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`V2__create_farmer_applications_table.sql`](../../src/main/resources/db/migration/V2__create_farmer_applications_table.sql)** | Migration | SQL Migration | Flyway script creating the `farmer_applications` table and indexes for tracking conversion requests. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`images/logo.png`](../../src/main/resources/static/images/logo.png)** | Static Asset | PNG Image | High-resolution official AgroLoop logo artwork and browser favicon icon. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`css/style.css`](../../src/main/resources/static/css/style.css)** | Static Asset | CSS Stylesheet | Global responsive stylesheet with dark-mode palette, typography, glassmorphism cards, and logo effects. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`index.html`](../../src/main/resources/templates/index.html)** | UI View | Thymeleaf Template | Public landing page featuring brand logo, dynamic DB diagnostics, role navigation, and roadmap timeline. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`login.html`](../../src/main/resources/templates/login.html)** | UI View | Thymeleaf Template | Styled authentication view with brand logo, demo quick-fill buttons, error banners, and register link. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`register.html`](../../src/main/resources/templates/register.html)** | UI View | Thymeleaf Template | Registration view with brand logo, default Household role explanation, address input, and validation hints. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`dashboard/household.html`](../../src/main/resources/templates/dashboard/household.html)** | UI View | Thymeleaf Template | Household portal showing EcoToken balance, pickup address, pending farmer application status, and conversion form. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`dashboard/farmer.html`](../../src/main/resources/templates/dashboard/farmer.html)** | UI View | Thymeleaf Template | Farmer partner portal showing farm profile, collection summary, and produce listing placeholders. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`dashboard/admin.html`](../../src/main/resources/templates/dashboard/admin.html)** | UI View | Thymeleaf Template | Administrator portal displaying system counts and the Pending Farmer Applications moderation queue with Approve/Reject actions. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`UserModelTest.java`](../../src/test/java/com/agroloop/model/UserModelTest.java)** | Test | JUnit 5 Test | Unit tests verifying OOP encapsulation, token arithmetic, domain validations, and polymorphic roles. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`AuthControllerTest.java`](../../src/test/java/com/agroloop/controller/AuthControllerTest.java)** | Test | MockMvc Test | Integration tests verifying `/login` rendering, role-based redirects, invalid credentials, and access control. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`UserRegistrationAndConversionTest.java`](../../src/test/java/com/agroloop/controller/UserRegistrationAndConversionTest.java)** | Test | MockMvc Test | Integration tests verifying default household registration, farmer conversion application, and admin approval. | [02. Auth](../docs/modules/02_user_management_and_auth.md) |
| **[`HomeControllerTest.java`](../../src/test/java/com/agroloop/controller/HomeControllerTest.java)** | Test | MockMvc Test | Integration test verifying public landing page and database status indicator. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`WasteCategory.java`](../../src/main/java/com/agroloop/model/WasteCategory.java)** | Domain Model | `enum WasteCategory` | Organic waste classification taxonomy (`FOOD_SCRAPS`, `GARDEN_WASTE`, `AGRICULTURAL_ORGANIC`, `COFFEE_GROUNDS`) with metadata and reward multipliers. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`SubmissionStatus.java`](../../src/main/java/com/agroloop/model/SubmissionStatus.java)** | Domain Model | `enum SubmissionStatus` | Lifecycle state machine (`SUBMITTED`, `CLAIMED`, `COLLECTED`, `VERIFIED`, `REJECTED`) and terminal-state query methods. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WasteSubmission.java`](../../src/main/java/com/agroloop/model/WasteSubmission.java)** | Domain Model | `class WasteSubmission` | JPA entity encapsulating category, BigDecimal weight, pickup address, image path, notes, timestamps, and domain transition methods. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`FileStorageService.java`](../../src/main/java/com/agroloop/service/storage/FileStorageService.java)** | Storage Abstraction | `interface FileStorageService` | Abstract contract for storing, loading, and deleting media files. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`LocalFileStorageServiceImpl.java`](../../src/main/java/com/agroloop/service/storage/LocalFileStorageServiceImpl.java)** | Storage Logic | `class LocalFileStorageServiceImpl` | Local filesystem storage implementation enforcing UUID naming, MIME validation, and path traversal defense. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WebMvcConfig.java`](../../src/main/java/com/agroloop/config/WebMvcConfig.java)** | Web Configuration | `class WebMvcConfig` | Maps `/uploads/**` static resource handler to the physical uploads directory. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WasteSubmissionRepository.java`](../../src/main/java/com/agroloop/repository/WasteSubmissionRepository.java)** | Persistence | `WasteSubmissionRepository` | Spring Data JPA queries by household and status. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`V3__create_waste_submissions_table.sql`](../../src/main/resources/db/migration/V3__create_waste_submissions_table.sql)** | Migration | SQL Migration | Flyway script creating `waste_submissions` table with foreign keys, check constraints, and indexes. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WasteSubmissionRequest.java`](../../src/main/java/com/agroloop/dto/WasteSubmissionRequest.java)** | DTO | `class WasteSubmissionRequest` | Form backing object with Jakarta validation: category, BigDecimal weight, optional address, notes, photo. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WasteSubmissionService.java`](../../src/main/java/com/agroloop/service/WasteSubmissionService.java)** | Service Contract | `interface WasteSubmissionService` | Contract for submitting waste, querying submissions by household, and counting records. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WasteSubmissionServiceImpl.java`](../../src/main/java/com/agroloop/service/WasteSubmissionServiceImpl.java)** | Service Logic | `class WasteSubmissionServiceImpl` | Implements transactional submission handling, photo storage delegation, and address inheritance. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WasteSubmissionModelTest.java`](../../src/test/java/com/agroloop/model/WasteSubmissionModelTest.java)** | Test | JUnit 5 Test | Unit tests verifying domain entity state transitions, weight invariants, and address fallback logic. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WasteSubmissionRepositoryTest.java`](../../src/test/java/com/agroloop/repository/WasteSubmissionRepositoryTest.java)** | Test | DataJpaTest | Database slice tests verifying repository queries, household cascades, and status filtering. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`FileStorageServiceTest.java`](../../src/test/java/com/agroloop/service/FileStorageServiceTest.java)** | Test | JUnit 5 Test | Unit tests verifying UUID naming, traversal rejection, and MIME checking. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`WasteSubmissionServiceTest.java`](../../src/test/java/com/agroloop/service/WasteSubmissionServiceTest.java)** | Test | Mockito Test | Unit tests verifying service workflows, address inheritance, and exception handling. | [03. Waste Submission](../docs/modules/03_waste_submission.md) |
| **[`PickupStatus.java`](../../src/main/java/com/agroloop/model/PickupStatus.java)** | Domain Model | `enum PickupStatus` | Lifecycle state machine (`REQUESTED`, `ASSIGNED`, `SCHEDULED`, `COLLECTED`, `VERIFIED`, `CANCELLED`) with cancellation and claim helpers. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`QualityGrade.java`](../../src/main/java/com/agroloop/model/QualityGrade.java)** | Domain Model | `enum QualityGrade` | Inspection quality grading taxonomy (`GRADE_A`, `GRADE_B`, `GRADE_C`, `REJECTED`) with reward multipliers. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupRequest.java`](../../src/main/java/com/agroloop/model/PickupRequest.java)** | Domain Model | `class PickupRequest` | JPA entity encapsulating state transitions (`accept()`, `schedule()`, `markCollected()`, `recordVerification()`, `decline()`, `cancel()`), optimistic locking (`@Version`), and audit tracking (`declinedAt`). | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`WasteVerification.java`](../../src/main/java/com/agroloop/model/WasteVerification.java)** | Domain Model | `class WasteVerification` | JPA entity capturing verified weight, quality grade, inspection notes, and verifying farmer link. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`V4__create_pickup_and_verification_tables.sql`](../../src/main/resources/db/migration/V4__create_pickup_and_verification_tables.sql)** | Migration | SQL Migration | Flyway script creating `pickup_requests` and `waste_verifications` tables with foreign keys, unique constraint, optimistic lock `version`, and check constraints. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupRequestRepository.java`](../../src/main/java/com/agroloop/repository/PickupRequestRepository.java)** | Persistence | `PickupRequestRepository` | Spring Data JPA queries by status, assigned farmer, and waste submission. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`WasteVerificationRepository.java`](../../src/main/java/com/agroloop/repository/WasteVerificationRepository.java)** | Persistence | `WasteVerificationRepository` | Spring Data JPA queries by pickup request and verifying farmer. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`SchedulePickupRequest.java`](../../src/main/java/com/agroloop/dto/SchedulePickupRequest.java)** | DTO | `class SchedulePickupRequest` | Validation form backing object for collection appointments. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`WasteVerificationRequest.java`](../../src/main/java/com/agroloop/dto/WasteVerificationRequest.java)** | DTO | `class WasteVerificationRequest` | Validation form backing object for post-collection weight and grading. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`CancelPickupRequest.java`](../../src/main/java/com/agroloop/dto/CancelPickupRequest.java)** | DTO | `class CancelPickupRequest` | Form backing object for cancellation reasons. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupService.java`](../../src/main/java/com/agroloop/service/PickupService.java)** | Service Contract | `interface PickupService` | Contract for claiming, scheduling, collecting, verifying, declining, and cancelling pickups. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupServiceImpl.java`](../../src/main/java/com/agroloop/service/PickupServiceImpl.java)** | Service Logic | `class PickupServiceImpl` | Implements transactional orchestration, farmer authorization, and domain entity delegation. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupController.java`](../../src/main/java/com/agroloop/controller/PickupController.java)** | Web Controller | `class PickupController` | Handles farmer pickup operations (`/farmer/pickups/**`) and household cancellation (`/household/pickups/**`). | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupRequestModelTest.java`](../../src/test/java/com/agroloop/model/PickupRequestModelTest.java)** | Test | JUnit 5 Test | Unit tests verifying domain entity state machine, decline re-queue, cancellation windows, and invariants. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`WasteVerificationModelTest.java`](../../src/test/java/com/agroloop/model/WasteVerificationModelTest.java)** | Test | JUnit 5 Test | Unit tests verifying positive weight enforcement, quality grade multipliers, and null-safety. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupRequestRepositoryTest.java`](../../src/test/java/com/agroloop/repository/PickupRequestRepositoryTest.java)** | Test | DataJpaTest | Database slice tests verifying repository queries, status filters, and foreign key cascades. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupServiceTest.java`](../../src/test/java/com/agroloop/service/PickupServiceTest.java)** | Test | Mockito Test | Unit tests verifying service orchestration and role authorization guards. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`PickupIntegrationTest.java`](../../src/test/java/com/agroloop/controller/PickupIntegrationTest.java)** | Test | MockMvc Test | Integration tests verifying claim ➔ schedule ➔ collect ➔ verify lifecycle and household cancellation. | [04. Pickups](../docs/modules/04_pickup_and_verification.md) |
| **[`TransactionType.java`](../../src/main/java/com/agroloop/model/TransactionType.java)** | Domain Model | `enum TransactionType` | Ledger transaction types (`REWARD_MINTED` for Phase 5 rewards). | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`EcoTokenTransaction.java`](../../src/main/java/com/agroloop/model/EcoTokenTransaction.java)** | Domain Model | `class EcoTokenTransaction` | Immutable audit entity recording token amounts, balance snapshots, and verification references. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`TokenCalculator.java`](../../src/main/java/com/agroloop/service/token/TokenCalculator.java)** | Strategy Interface | `interface TokenCalculator` | Polymorphic contract for reward calculation strategies. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`StandardTokenCalculator.java`](../../src/main/java/com/agroloop/service/token/StandardTokenCalculator.java)** | Strategy Implementation | `class StandardTokenCalculator` | Standard algorithm (`weight * categoryMultiplier * qualityMultiplier`). | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`PromotionalTokenCalculator.java`](../../src/main/java/com/agroloop/service/token/PromotionalTokenCalculator.java)** | Strategy Implementation | `class PromotionalTokenCalculator` | Promotional surge campaign reward calculation strategy. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`V5__create_ecotoken_transactions_table.sql`](../../src/main/resources/db/migration/V5__create_ecotoken_transactions_table.sql)** | Migration | SQL Migration | Flyway DDL creating `ecotoken_transactions` table with unique constraint on `waste_verification_id`. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`EcoTokenTransactionRepository.java`](../../src/main/java/com/agroloop/repository/EcoTokenTransactionRepository.java)** | Persistence | `EcoTokenTransactionRepository` | Spring Data JPA queries for ledger history and idempotency verification. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`TokenRewardService.java`](../../src/main/java/com/agroloop/service/TokenRewardService.java)** | Service Contract | `interface TokenRewardService` | Business contract for reward minting, idempotency checks, and household ledger auditing. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`TokenRewardServiceImpl.java`](../../src/main/java/com/agroloop/service/TokenRewardServiceImpl.java)** | Service Logic | `class TokenRewardServiceImpl` | Transactional coordinator executing strategy calculations, pessimistic locking, and ledger persistence. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`TokenCalculatorTest.java`](../../src/test/java/com/agroloop/service/TokenCalculatorTest.java)** | Test | JUnit 5 Test | Strategy unit tests verifying standard and promotional reward calculations and rejection zero-rewards. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`EcoTokenTransactionTest.java`](../../src/test/java/com/agroloop/model/EcoTokenTransactionTest.java)** | Test | JUnit 5 Test | Domain unit tests verifying entity immutability, non-negative balance invariants, and scale normalization. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`TokenRewardServiceTest.java`](../../src/test/java/com/agroloop/service/TokenRewardServiceTest.java)** | Test | Mockito Test | Unit tests verifying reward minting, pessimistic write lock acquisition, idempotency, and rejection audit entries. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`TokenRewardServiceIntegrationTest.java`](../../src/test/java/com/agroloop/service/TokenRewardServiceIntegrationTest.java)** | Test | SpringBootTest | Multithreaded concurrency tests asserting pessimistic write locking, idempotency, and lost-update prevention with the default test profile (in-memory H2 and Flyway disabled). |
| **[`DashboardIntegrationTest.java`](../../src/test/java/com/agroloop/controller/DashboardIntegrationTest.java)** | Test | MockMvc Test | Controller integration tests verifying populated EcoToken ledger rendering and eager fetch resolution with `open-in-view=false`. | [05. EcoTokens](../docs/modules/05_ecotokens.md) |
| **[`ProductCategory.java`](../../src/main/java/com/agroloop/model/ProductCategory.java)** | Domain Model | `enum ProductCategory` | Taxonomy of farm goods: `ORGANIC_VEGETABLES`, `FRESH_FRUITS`, `COMPOST_AND_SOIL`, `SEEDS_AND_PLANTS`, `DAIRY_AND_EGGS`, `HERBS_AND_SPICES`, `HONEY_AND_PRESERVES`. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`Product.java`](../../src/main/java/com/agroloop/model/Product.java)** | Domain Model | `class Product` | Encapsulated marketplace listing managing stock deductions (`deductStock`), replenishment (`restock`), pricing, soft archival (`deactivate`), and `@Version` optimistic locking. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`OrderStatus.java`](../../src/main/java/com/agroloop/model/OrderStatus.java)** | Domain Model | `enum OrderStatus` | Lifecycle states for orders: `PLACED`, `COMPLETED`. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`Order.java`](../../src/main/java/com/agroloop/model/Order.java)** | Domain Model | `class Order` | Aggregate root encapsulating line items, total tokens, buyer relationship, and profile address fallback. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`OrderItem.java`](../../src/main/java/com/agroloop/model/OrderItem.java)** | Domain Model | `class OrderItem` | Historical snapshot line item preserving product title, unit price, category, unit, and farmer name independently of subsequent edits. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`InsufficientStockException.java`](../../src/main/java/com/agroloop/exception/InsufficientStockException.java)** | Domain Exception | `InsufficientStockException` | Thrown when requested purchase quantity exceeds available product inventory. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`InsufficientTokensException.java`](../../src/main/java/com/agroloop/exception/InsufficientTokensException.java)** | Domain Exception | `InsufficientTokensException` | Thrown when household token balance is insufficient for authoritative server-side checkout total. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`V6__create_marketplace_tables.sql`](../../src/main/resources/db/migration/V6__create_marketplace_tables.sql)** | Migration | SQL Migration | Flyway DDL creating `products`, `orders`, `order_items`, and adding `order_id` to `ecotoken_transactions` with mutual exclusivity check constraint. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`ProductRepository.java`](../../src/main/java/com/agroloop/repository/ProductRepository.java)** | Persistence | `ProductRepository` | Spring Data JPA queries with pessimistic write locking (`findByIdForUpdate`), active listings, and farmer listings. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`OrderRepository.java`](../../src/main/java/com/agroloop/repository/OrderRepository.java)** | Persistence | `OrderRepository` | Queries orders by buyer, order number, and farmer sales history. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`OrderItemRepository.java`](../../src/main/java/com/agroloop/repository/OrderItemRepository.java)** | Persistence | `OrderItemRepository` | Data access repository for individual order line items. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`ProductFormRequest.java`](../../src/main/java/com/agroloop/dto/ProductFormRequest.java)** | DTO | `class ProductFormRequest` | Form validation backing object for farmer product listings. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`CartItemDto.java`](../../src/main/java/com/agroloop/dto/CartItemDto.java)** | DTO | `class CartItemDto` | Session cart item representation enforcing positive quantities. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`CartDto.java`](../../src/main/java/com/agroloop/dto/CartDto.java)** | DTO | `class CartDto` | Session shopping cart with helper methods for item counting and total calculations. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`CheckoutRequest.java`](../../src/main/java/com/agroloop/dto/CheckoutRequest.java)** | DTO | `class CheckoutRequest` | Captures delivery address and optional instructions during checkout. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`ProductService.java`](../../src/main/java/com/agroloop/service/ProductService.java)** | Service Contract | `interface ProductService` | Product catalog querying, creation, updating, and soft archival. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`ProductServiceImpl.java`](../../src/main/java/com/agroloop/service/ProductServiceImpl.java)** | Service Logic | `class ProductServiceImpl` | Implements farmer ownership checks, positive stock checks, and catalog filtering. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`CartService.java`](../../src/main/java/com/agroloop/service/CartService.java)** | Service Contract | `interface CartService` | Session shopping cart contract for adding, modifying, and clearing items. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`CartServiceImpl.java`](../../src/main/java/com/agroloop/service/CartServiceImpl.java)** | Service Logic | `class CartServiceImpl` | HTTP session-backed implementation managing cart state. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`MarketplaceService.java`](../../src/main/java/com/agroloop/service/MarketplaceService.java)** | Service Contract | `interface MarketplaceService` | Transactional checkout orchestration and order lookup contract. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`MarketplaceServiceImpl.java`](../../src/main/java/com/agroloop/service/MarketplaceServiceImpl.java)** | Service Logic | `class MarketplaceServiceImpl` | Deterministic dual-phase pessimistic locking (household row -> ascending product rows), validation-before-mutation, and atomic checkout transaction. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`MarketplaceController.java`](../../src/main/java/com/agroloop/controller/MarketplaceController.java)** | Web Controller | `class MarketplaceController` | Catalog browsing, cart management, checkout execution with post-commit cart clearing, and order receipts. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`FarmerProductController.java`](../../src/main/java/com/agroloop/controller/FarmerProductController.java)** | Web Controller | `class FarmerProductController` | Farmer product management, listing forms, active/archive toggles, and sales order view with strict farmer authorization. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`ProductModelTest.java`](../../src/test/java/com/agroloop/model/ProductModelTest.java)** | Test | JUnit 5 Test | Domain unit tests verifying stock deductions, restock, metadata updates, and activation toggles. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`OrderModelTest.java`](../../src/test/java/com/agroloop/model/OrderModelTest.java)** | Test | JUnit 5 Test | Domain unit tests verifying order items, address fallback, and historical snapshot immutability. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`CartServiceTest.java`](../../src/test/java/com/agroloop/service/CartServiceTest.java)** | Test | JUnit 5 Test | Unit tests verifying session cart mutations, quantity bounds, and clearing. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`ProductServiceTest.java`](../../src/test/java/com/agroloop/service/ProductServiceTest.java)** | Test | Mockito Test | Unit tests verifying farmer ownership authorization, catalog filters, and soft archival. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`MarketplaceServiceTest.java`](../../src/test/java/com/agroloop/service/MarketplaceServiceTest.java)** | Test | Mockito Test | Unit tests verifying checkout pipeline, server-side pricing, solvency checks, and lock ordering. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`MarketplaceConcurrencyIntegrationTest.java`](../../src/test/java/com/agroloop/service/MarketplaceConcurrencyIntegrationTest.java)** | Test | SpringBootTest | 10 concurrent threads competing for 2 units of stock with real pessimistic locks; exactly 2 succeed and 8 fail. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`MarketplaceDeadlockAndRollbackIntegrationTest.java`](../../src/test/java/com/agroloop/service/MarketplaceDeadlockAndRollbackIntegrationTest.java)** | Test | SpringBootTest | Concurrency integration testing inverted cart deadlocks [A,B] vs [B,A] and transactional rollback on insufficient tokens. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`MarketplaceControllerTest.java`](../../src/test/java/com/agroloop/controller/MarketplaceControllerTest.java)** | Test | MockMvc Test | Integration tests verifying catalog, cart, checkout flows, and post-commit cart clearing. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`FarmerProductControllerTest.java`](../../src/test/java/com/agroloop/controller/FarmerProductControllerTest.java)** | Test | MockMvc Test | Integration tests verifying farmer product management, role protection, and cross-farmer authorization guards. | [06. Marketplace](../docs/modules/06_marketplace.md) |
| **[`V7__create_admin_and_refund_governance.sql`](../../src/main/resources/db/migration/V7__create_admin_and_refund_governance.sql)** | Migration | SQL Migration | Flyway DDL adding `token_balance >= 0` check, order lifecycle/dispute columns, staged `farmer_id` snapshot with assertion guard, partial unique indexes for `ORDER_REFUND` and `MARKETPLACE_PURCHASE`, and PostgreSQL physical immutability trigger on ledger. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`TransactionDirection.java`](../../src/main/java/com/agroloop/model/TransactionDirection.java)** | Domain Model | `enum TransactionDirection` | Defines financial ledger flow directions: `CREDIT`, `DEBIT`. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`RefundReason.java`](../../src/main/java/com/agroloop/model/RefundReason.java)** | Domain Model | `enum RefundReason` | Explicit taxonomy for refund authorization: `HOUSEHOLD_CANCELLATION`, `ADMIN_CANCELLATION`, `DISPUTE_APPROVED`. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`DisputeResolution.java`](../../src/main/java/com/agroloop/model/DisputeResolution.java)** | Domain Model | `enum DisputeResolution` | Administrative adjudication outcome taxonomy: `APPROVED_REFUND`, `DISMISSED`. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`SolvencyMetricsDto.java`](../../src/main/java/com/agroloop/dto/SolvencyMetricsDto.java)** | DTO | `class SolvencyMetricsDto` | Encapsulates Tier-2 platform solvency metrics: total household balances, system credits/debits, net ledger delta, and mathematical solvency boolean. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`AdminGovernanceService.java`](../../src/main/java/com/agroloop/service/AdminGovernanceService.java)** | Service Contract | `interface AdminGovernanceService` | Governance contract for user moderation (`enableUser`, `disableUser`), manual token adjustment under lock (`adjustTokens`), and platform solvency reconciliation (`getPlatformSolvencyMetrics`). | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`AdminGovernanceServiceImpl.java`](../../src/main/java/com/agroloop/service/AdminGovernanceServiceImpl.java)** | Service Logic | `class AdminGovernanceServiceImpl` | Implements serialized last-admin protection via deterministic `PESSIMISTIC_WRITE` query, lock hierarchy token adjustment, and paginated audit ledger queries. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`AdminController.java`](../../src/main/java/com/agroloop/controller/AdminController.java)** | Web Controller | `class AdminController` | Dedicated administrative portal controller serving `/admin/users`, `/admin/orders`, `/admin/ledger`, token adjustment POST, and dispute adjudication POST. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`users.html`](../../src/main/resources/templates/admin/users.html)** | UI View | Thymeleaf Template | Admin user management view featuring role badges, status toggles, and secure modal form for manual token adjustment. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`orders.html`](../../src/main/resources/templates/admin/orders.html)** | UI View | Thymeleaf Template | Admin marketplace orders view with status filtering, direct cancellation modal, and dispute adjudication modal. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`ledger.html`](../../src/main/resources/templates/admin/ledger.html)** | UI View | Thymeleaf Template | Admin platform-wide immutable ledger viewer with credit/debit color chips, actor links, and pagination. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`OrderLifecycleTest.java`](../../src/test/java/com/agroloop/model/OrderLifecycleTest.java)** | Test | JUnit 5 Test | Domain unit tests verifying Order state transitions, cancellation windows, single-dispute invariant, and dispute adjudication. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`OrderAtomicRefundTest.java`](../../src/test/java/com/agroloop/service/OrderAtomicRefundTest.java)** | Test | SpringBootTest | Integration tests verifying atomic refund mechanics: inventory restock, token credit, ORDER_REFUND ledger insertion, and double-refund rejection. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`OrderLifecycleConcurrencyTest.java`](../../src/test/java/com/agroloop/service/OrderLifecycleConcurrencyTest.java)** | Test | SpringBootTest | Multithreaded concurrency test executing simultaneous cancel, dispute, and complete on the same order; asserts exactly one terminal transition wins without corrupting state. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`ConcurrentHouseholdLedgerMutationTest.java`](../../src/test/java/com/agroloop/service/ConcurrentHouseholdLedgerMutationTest.java)** | Test | SpringBootTest | High-concurrency stress test with 15 concurrent threads performing credits, debits, adjustments; validates Tier-1 running balance in `id ASC` order. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`ConcurrentLastAdminProtectionTest.java`](../../src/test/java/com/agroloop/service/ConcurrentLastAdminProtectionTest.java)** | Test | SpringBootTest | Concurrency test verifying mutual serialized last-admin defense; prevents concurrent requests from reducing active admins to 0. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`AdminGovernanceServiceTest.java`](../../src/test/java/com/agroloop/service/AdminGovernanceServiceTest.java)** | Test | Mockito Test | Unit tests verifying user enabling/disabling, self-disable guard, token adjustment balance invariant, and Tier-2 solvency calculation. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`AdminControllerTest.java`](../../src/test/java/com/agroloop/controller/AdminControllerTest.java)** | Test | MockMvc Test | Web slice integration tests verifying `/admin/**` endpoints, role enforcement, flash attributes, and error responses. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |
| **[`MarketplaceOrderLifecycleSecurityTest.java`](../../src/test/java/com/agroloop/controller/MarketplaceOrderLifecycleSecurityTest.java)** | Test | MockMvc Test | Security integration tests verifying cross-household cancellation/dispute rejection (403/redirect) and farmer cross-order protection. | [07. Admin & Governance](../docs/modules/07_admin_and_testing.md) |

---

## 5. Dedicated Integration Modules

Each feature and integration in AgroLoop has its own dedicated documentation file explaining its purpose, OOP principles, architecture, database impact, and operational guides:

| Module Document | Phase & Topic | Status | Description |
| :--- | :--- | :--- | :--- |
| **[01. Project Setup & Baseline](../docs/modules/01_project_setup.md)** | Phase 1: Setup | ✅ Completed | Spring Boot 3.3.4 scaffolding, Maven wrapper, PostgreSQL Docker integration, and cross-platform runners. |
| **[02. User Management & Security](../docs/modules/02_user_management_and_auth.md)** | Phase 2: Auth | ✅ Completed | JPA Joined Inheritance (`User`, `Household`, `Farmer`, `Admin`), Spring Security, BCrypt hashing, public registration defaulting to Household, Farmer conversion request workflow with Admin review/approval, and logo branding. |
| **[03. Waste Submission & Media](../docs/modules/03_waste_submission.md)** | Phase 3: Submissions | ✅ Completed | Multipart photo uploads, category classification taxonomy, address inheritance, UUID storage with traversal defense, and household dashboard tracking. |
| **[04. Pickup & Verification Engine](../docs/modules/04_pickup_and_verification.md)** | Phase 4: Pickups | ✅ Completed | Farmer pickup claims, collection state machine, quality grading, decline re-queuing, and post-collection verification. |
| **[05. EcoTokens & Rewards](../docs/modules/05_ecotokens.md)** | Phase 5: Rewards | ✅ Completed | Polymorphic `TokenCalculator` strategy, atomic wallet updates, pessimistic locking, idempotent reward minting, and household ledger. |
| **[06. Marketplace & Commerce](../docs/modules/06_marketplace.md)** | Phase 6: Commerce | ✅ Completed | Farmer product catalog, soft-archive lifecycle, session cart, authoritative DB pricing, deterministic dual-phase pessimistic locking, atomic stock/token/order/ledger checkout, and sales tracking. |
| **[07. Admin Governance & Testing](../docs/modules/07_admin_and_testing.md)** | Phase 7: Governance | ✅ Completed | Order lifecycle state machine, atomic refund engine, deterministic lock hierarchy (`Order` ➔ `Household` ➔ `Products ASC`), double-refund prevention, physical immutability trigger, serialized last-admin protection, two-tier financial reconciliation, admin portal, and 241 passing tests. |
| **[7.5. Client/API Boundary & Architecture](../docs/modules/07_5_client_api_boundary.md)** | Phase 7.5: Client/API | ✅ Completed | Versioned `/api/v1` REST contract layer for Web, Mobile, and Desktop. Dual Spring Security filter chains, RSA-2048 JWT, refresh rotation with replay defense, AES-GCM-256 encrypted idempotency, media management, OpenAPI 3.1, and 265 green tests. |
| **[08. Mobile QR Handshake Architecture](../docs/modules/08_mobile_qr_handshake.md)** | Phase 8: Mobile Handshake | ✅ Completed | Ephemeral server-authoritative HMAC-SHA256 dynamic QR passes, pessimistic locked verification, zero-PII compact payloads, brute-force rate-limiting, and pure React Native Kazuhiko Arase QR matrix integration. |
| **[08. Cross-Platform Clients Architecture](../docs/modules/08_cross_platform_clients.md)** | Phase 8: Web & Desktop Clients | ✅ Completed | Multi-client ecosystem: Next.js 15 Web Portal (`@agroloop/web` with BFF boundary, HttpOnly cookie rotation, server-side single-flight refresh mutex, and allowlist proxy) & Tauri v2 Desktop Operations Console (`@agroloop/desktop` with native OS Keychain delegation, live Tier-1 & Tier-2 Solvency Reconciliation, User Governance, Order Disputes, Ledger Explorer, and Fleet Telemetry). |

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


