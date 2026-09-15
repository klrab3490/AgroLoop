# Module 07: Admin Governance & Test Automation

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 7: Admin & Testing**, we provide platform oversight, administrative dispute resolution, user governance, and exhaustive end-to-end automated testing across all user roles and state transitions.

---

## 2. Object-Oriented Principles in this Module

### Encapsulation of Administrative Authorities
- `Admin` entity extends `User`, encapsulating platform maintenance operations:
  - `manageUsers(User user, boolean enable)`
  - `manageWasteRules(WasteCategory category, double rewardMultiplier)`
  - `reviewDisputes(Dispute dispute, Resolution resolution)`
- Authorization is strictly enforced via Spring Security `@PreAuthorize("hasAuthority('ROLE_ADMIN')")`.

### Testing Abstraction & Multi-Layer Verification
- **Unit Testing:** Pure OOP domain tests verifying entity invariants without database overhead.
- **Repository Testing:** `@DataJpaTest` validating PostgreSQL joined inheritance, cascades, and polymorphic queries.
- **Integration Testing:** `@SpringBootTest` with `MockMvc` simulating full HTTP requests, CSRF verification, security filters, and session management.

---

## 3. Test Suites

| Test Class | Focus |
| :--- | :--- |
| `UserInheritanceTest` | Verifies JPA Joined Inheritance in PostgreSQL (`users`, `households`, `farmers`, `admins`). |
| `AuthControllerTest` | Verifies registration validation, BCrypt hashing, duplicate email checking, and login redirects. |
| `SecurityAccessTest` | Tests role-based access control (ensuring cross-role access is denied with 403). |
| `WasteWorkflowIntegrationTest` | Tests the lifecycle from waste submission ➔ pickup ➔ verification ➔ token minting. |
| `MarketplaceCheckoutTest` | Tests concurrent purchases, inventory deduction, and token solvency. |

---

[← Back to Master Documentation Hub](../INDEX.md)
