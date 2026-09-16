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
    PickupRequest "1" --> "0..1" WasteVerification
```

---

## 3. Dedicated Integration Modules

Each feature and integration in AgroLoop has its own dedicated documentation file explaining its purpose, OOP principles, architecture, database impact, and operational guides:

| Module Document | Phase & Topic | Status | Description |
| :--- | :--- | :---: | :--- |
| **[01. Project Setup & Baseline](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/docs/modules/01_project_setup.md)** | Phase 1: Setup | ✅ Completed | Spring Boot 3.3.4 scaffolding, Maven wrapper, PostgreSQL Docker integration, and cross-platform runners. |
| **[02. User Management & Security](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/docs/modules/02_user_management_and_auth.md)** | Phase 2: Auth | 🟡 In Progress | JPA Joined Inheritance (`User`, `Household`, `Farmer`, `Admin`), Spring Security, BCrypt hashing, and role-based access. |
| **[03. Waste Submission & Media](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/docs/modules/03_waste_submission.md)** | Phase 3: Submissions | ⚪ Planned | Multipart photo uploads, category classification, file validation, and household waste tracking. |
| **[04. Pickup & Verification Engine](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/docs/modules/04_pickup_and_verification.md)** | Phase 4: Pickups | ⚪ Planned | Farmer pickup claims, collection state machine, quality grading, and post-collection verification. |
| **[05. EcoTokens & Rewards](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/docs/modules/05_ecotokens.md)** | Phase 5: Rewards | ⚪ Planned | Polymorphic `TokenCalculator`, atomic wallet updates, transaction logs, and reward rules. |
| **[06. Marketplace & Commerce](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/docs/modules/06_marketplace.md)** | Phase 6: Commerce | ⚪ Planned | Farmer produce catalog, inventory stock validation, and checkout using EcoTokens. |
| **[07. Admin Governance & Testing](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/docs/modules/07_admin_and_testing.md)** | Phase 7: Governance | ⚪ Planned | Audit dashboards, dispute reviews, test automation (JUnit 5 & MockMvc), and production hardening. |

---

## 4. Git & Release Strategy

We follow a multi-tier branch progression to maintain stability:

```
main (Production / Stable Releases)
  ▲
  │ (After thorough review & signoff)
  │
dev (Active Integration & QA)
  ▲
  │ (Features pushed here upon completion)
  │
feature/<phase-name> (Individual feature development)
```

1. Create and work on your feature branch: `git checkout -b feature/<name>`.
2. Commit and push feature branch to remote.
3. Merge feature branch into `dev` and push to `origin/dev`.
4. Review and test on `dev`.
5. Merge `dev` into `main` for release milestones.
