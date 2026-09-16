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
---

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
| **[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)** | CI / Automation | GitHub Actions | Automated continuous integration running Java 21 test suites on all PRs targeting `dev` and `main`. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`.github/pull_request_template.md`](../.github/pull_request_template.md)** | Code Review | PR Template | Standardized Pull Request template enforcing OOP principles, documentation updates, and test verification. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`run.sh`](../run.sh)** | Dev Runner | Shell Script | Automates local execution on macOS/Linux with environment checks and PostgreSQL readiness verification. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`run.bat`](../run.bat)** | Dev Runner | Batch Script | Automates local execution on Windows Command Prompt. | [01. Setup](../docs/modules/01_project_setup.md) |
| **[`docker-compose.yml`](../docker-compose.yml)** | Infrastructure | Compose Config | Orchestrates PostgreSQL container and full application stack with healthchecks and volumes. | [01. Setup](../docs/modules/01_project_setup.md) |
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

---

## 5. Dedicated Integration Modules

Each feature and integration in AgroLoop has its own dedicated documentation file explaining its purpose, OOP principles, architecture, database impact, and operational guides:

| Module Document | Phase & Topic | Status | Description |
| :--- | :--- | :---: | :--- |
| **[01. Project Setup & Baseline](../docs/modules/01_project_setup.md)** | Phase 1: Setup | ✅ Completed | Spring Boot 3.3.4 scaffolding, Maven wrapper, PostgreSQL Docker integration, and cross-platform runners. |
| **[02. User Management & Security](../docs/modules/02_user_management_and_auth.md)** | Phase 2: Auth | ✅ Completed | JPA Joined Inheritance (`User`, `Household`, `Farmer`, `Admin`), Spring Security, BCrypt hashing, public registration defaulting to Household, Farmer conversion request workflow with Admin review/approval, and logo branding. |
| **[03. Waste Submission & Media](../docs/modules/03_waste_submission.md)** | Phase 3: Submissions | ⚪ Planned | Multipart photo uploads, category classification, file validation, and household waste tracking. |
| **[04. Pickup & Verification Engine](../docs/modules/04_pickup_and_verification.md)** | Phase 4: Pickups | ⚪ Planned | Farmer pickup claims, collection state machine, quality grading, and post-collection verification. |
| **[05. EcoTokens & Rewards](../docs/modules/05_ecotokens.md)** | Phase 5: Rewards | ⚪ Planned | Polymorphic `TokenCalculator`, atomic wallet updates, transaction logs, and reward rules. |
| **[06. Marketplace & Commerce](../docs/modules/06_marketplace.md)** | Phase 6: Commerce | ⚪ Planned | Farmer produce catalog, inventory stock validation, and checkout using EcoTokens. |
| **[07. Admin Governance & Testing](../docs/modules/07_admin_and_testing.md)** | Phase 7: Governance | ⚪ Planned | Audit dashboards, dispute reviews, test automation (JUnit 5 & MockMvc), and production hardening. |

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


