# Module 02: User Management & Authentication

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

AgroLoop unites three distinct ecosystem stakeholders: **Households**, **Farmers**, and **Admins**. In **Phase 2: User Management**, we implement the domain entity hierarchy using JPA Joined Inheritance, Spring Security, BCrypt password encryption, registration flows, and role-based dashboard redirection.

---

## 2. Object-Oriented Principles in this Module

### Encapsulation
- All fields in `User`, `Household`, `Farmer`, and `Admin` are marked `private`.
- No raw public password setter exists; only hashed credentials (`updatePasswordHash()`) are accepted.
- Token balance in `Household` cannot be mutated directly from outside; updates must pass through domain validation methods:
  - `addTokens(BigDecimal amount)`: Enforces positive value.
  - `spendTokens(BigDecimal amount)`: Enforces solvency check (`tokenBalance >= amount`).

### Inheritance
- **Base Entity:** `User` provides common fields (`id`, `name`, `email`, `passwordHash`, `role`, `enabled`, `createdAt`, `updatedAt`).
- **JPA Joined Table Strategy:**
  ```java
  @Entity
  @Table(name = "users")
  @Inheritance(strategy = InheritanceType.JOINED)
  public abstract class User { ... }
  ```
- **Specialized Subclasses:**
  - `Household extends User`: Owns `tokenBalance` and `address`.
  - `Farmer extends User`: Owns `farmName`, `farmAddress`, and `notes`.
  - `Admin extends User`: Holds administrative capabilities.

### Polymorphism
- Spring Data JPA repositories allow polymorphic queries on `User` while returning concrete runtime instances (`Household`, `Farmer`, or `Admin`).
- `UserService.registerUser(RegisterRequest req)` instantiates the appropriate concrete subclass at runtime based on the requested role.

### Abstraction
- Controllers do not execute JPA queries or handle password encryption directly.
- All registration, validation, and user lookups are hidden behind `UserService` and `CustomUserDetailsService`.

---

## 3. Database Schema Mapping

```
                       ┌────────────────────────┐
                       │         users          │ (Parent Table)
                       ├────────────────────────┤
                       │ id (PK)                │
                       │ name                   │
                       │ email (UNIQUE)         │
                       │ password_hash          │
                       │ role (ENUM STRING)     │
                       │ enabled                │
                       │ created_at             │
                       │ updated_at             │
                       └───────────┬────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│    households     │    │      farmers      │    │      admins       │
├───────────────────┤    ├───────────────────┤    ├───────────────────┤
│ id (PK, FK)       │    │ id (PK, FK)       │    │ id (PK, FK)       │
│ token_balance     │    │ farm_name         │    └───────────────────┘
│ address           │    │ farm_address      │
└───────────────────┘    │ notes             │
                         └───────────────────┘
```

---

## 4. Security & Registration Flow

1. **Registration:**
   - Household or Farmer submits the registration form (`RegisterRequest`).
   - `RegisterRequest` validates password confirmation, email format, and role selection.
   - Admin accounts are prevented from public registration and are seeded through `DataInitializer`.
2. **Password Hashing:**
   - Passwords are encrypted using `BCryptPasswordEncoder`.
3. **Authentication:**
   - Spring Security checks credentials using `CustomUserDetailsService` and `DaoAuthenticationProvider`.
4. **Role Routing:**
   - `CustomAuthenticationSuccessHandler` inspects the user's granted authority:
     - `ROLE_HOUSEHOLD` ➔ `/household/dashboard`
     - `ROLE_FARMER` ➔ `/farmer/dashboard`
     - `ROLE_ADMIN` ➔ `/admin/dashboard`

---

## 5. Database Migration Scripts (Flyway)

AgroLoop utilizes **Flyway** for database versioning and migrations located in `src/main/resources/db/migration/`:

- **[`V1__create_user_tables.sql`](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/src/main/resources/db/migration/V1__create_user_tables.sql)**:
  - Generates the `users` base table with constraints and an index on `email`.
  - Generates the joined subtype tables (`households`, `farmers`, `admins`) with foreign keys referencing `users(id)` and cascading deletes.
- **[`docker/init.sql`](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/docker/init.sql)**:
  - Standalone SQL script for initial Docker setup or manual database initialization.

---

[← Back to Master Documentation Hub](../INDEX.md)
