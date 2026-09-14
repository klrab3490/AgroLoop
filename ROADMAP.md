# AgroLoop — Development Roadmap

Java Spring Boot web application with PostgreSQL, Thymeleaf, and image attachments in the waste submission form. AI classification will be the final phase, after the core system is fully working.

---

## Roadmap Overview

- **Stack:** Spring Boot · PostgreSQL · Thymeleaf
- **Total Phases:** 12
- **User Roles:** 3 (Household, Farmer, Admin)
- **AI Classification:** Phase 12 (Final Phase)

The first eight phases form the core application; route planning, administration, testing, and AI follow afterward.

---

## Implementation Tracker

| # | Phase | Duration | Status | Milestone / Deliverable |
| :---: | :--- | :---: | :---: | :--- |
| **1** | **Project Setup** | Day 1 | 🟡 In Progress | Maven Spring Boot setup, Java & PostgreSQL Docker config, Git repo, initial Thymeleaf page. Milestone: App starts and connects to DB. |
| **2** | **Authentication** | Days 2–3 | ⚪ Planned | Spring Security, registration & login with role segregation (Household, Farmer, Admin), session management. |
| **3** | **Profiles & Dashboards** | Day 4 | ⚪ Planned | Dedicated profile management and landing dashboards for Household, Farmer, and Admin roles. |
| **4** | **Waste Submission + Images** | Days 5–6 | ⚪ Planned | Waste submission form with `MultipartFile` photo upload, file validation, storage, and entity mapping. |
| **5** | **Pickup Management** | Days 7–8 | ⚪ Planned | Farmer discovery of submissions, assignment, pickup scheduling, and status tracking (`PENDING`, `ASSIGNED`, `COLLECTED`). |
| **6** | **Verification** | Day 9 | ⚪ Planned | Farmer post-collection verification workflow: actual quantity, quality grading, photo comparison. |
| **7** | **EcoToken Rewards** | Days 10–11 | ⚪ Planned | Atomic reward minting upon successful verification; transaction audit log; wallet balance updates. |
| **8** | **Marketplace** | Days 12–13 | ⚪ Planned | Product listings (produce/compost), cart/checkout using EcoTokens, inventory deduction, order history. |
| **9** | **Route Planning** | Day 14 | ⚪ Planned | Pickup route optimization and location sequencing for farmers. |
| **10** | **Admin, Ratings & Notifications** | Days 15–16 | ⚪ Planned | User reviews/ratings, in-app notifications, dispute resolution, and admin oversight. |
| **11** | **Testing & Deployment** | Days 17–18 | ⚪ Planned | Comprehensive unit, integration, and E2E tests, containerization, and production hardening. |
| **12** | **AI Classification** | Days 19–20 | ⚪ Planned | Automated image recognition and waste categorization assistance via AI model integration. |

---

## Phase 1: Project Setup Details

- **Day:** 1
- **Goal:** Create the Maven Spring Boot project, configure Java and PostgreSQL, establish the Git repository, and run the initial web page.
- **Completion Milestone:** Application starts locally and connects to the database.

---

## Architecture & Database Design

The application is structured as a modular monolithic Spring Boot application:

```
Thymeleaf Web Pages
├── Household Views
├── Farmer Views
└── Admin Views
         │
         ▼
Spring Boot Controllers
         │
         ▼
Service Layer (Transactional Business Logic)
         │
         ▼
Spring Data JPA Repositories
         │
         ▼
PostgreSQL Database (Docker)
```

### Core Entities

| Entity | Responsibility |
| :--- | :--- |
| `User` | Login credentials, password hash, active status, role enum. |
| `Household` | Household profile and pickup address details. |
| `Farmer` | Farmer profile, operational capacity, accepted waste types. |
| `WasteSubmission` | Waste classification, quantity, photo reference, submission status. |
| `PickupRequest` | Farmer assignment, collection scheduling, status transitions. |
| `WasteVerification` | Verified quantity, quality grade, farmer notes. |
| `TokenTransaction` | EcoToken rewards earned and spent history. |
| `Product` | Marketplace items listed by farmers. |
| `Order` | Household purchases using EcoTokens. |

---

## Image Upload Design (Phase 4)

*Image attachment is part of Phase 4 (waste submission workflow), not postponed to the AI phase.*

1. **Submission with Photo:** Households attach a clear picture of their organic waste during submission.
2. **Multipart Upload:** Handled via Spring Boot `MultipartFile` with mime-type and size validation (max 10MB).
3. **Storage Strategy:** Stored in a configured local upload directory during development; filename/storage key saved in `WasteSubmission`.
4. **Farmer Verification:** Uploaded image is rendered on the farmer verification page for comparison against actual collected waste.
5. **AI Handoff:** In Phase 12, the stored image is passed to the AI classification service for automated tagging.

---

## Critical Business Rules

1. Only authenticated users can submit waste.
2. Only farmers can accept and verify their assigned pickups.
3. Waste must be collected and successfully verified before rewards are created.
4. Each successful verification can generate one reward transaction only (strictly idempotent).
5. Token purchases require sufficient balance and available inventory.
6. Token balance updates and transactions must be committed atomically under transaction isolation.

---

## Git Branch Plan

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
