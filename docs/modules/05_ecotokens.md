# Module 05: EcoTokens & Reward Minting Engine

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 5: EcoTokens & Reward Minting Engine**, AgroLoop closes the circular loop between urban households and rural farmers by rewarding validated waste contributions with the platform's digital currency (**EcoTokens**).

```text
Organic Waste Submitted (Household)
       ↓
Collected & Physically Inspected (Farmer)
       ↓
Waste Verification Recorded (QualityGrade + Verified Weight)
       ↓
Polymorphic Reward Calculation (TokenCalculator Strategy)
       ↓
Pessimistic Lock Acquired on Household Wallet
       ↓
EcoTokens Minted & Credited (Household.addTokens)
       ↓
Immutable Ledger Entry Persisted (EcoTokenTransaction)
       ↓
Redeemable in Sustainable Marketplace (Phase 6)
```

---

## 2. Core Invariant & Guarantees

> **One `WasteVerification` ➔ exactly one `EcoTokenTransaction` ➔ at most one positive household balance credit (zero for `REJECTED`).**

1. **Idempotency Guarantee:**
   If `TokenRewardService.mintRewardForVerification()` is executed multiple times for the same verification, it returns the existing `EcoTokenTransaction` without re-calculating or double-crediting the household balance.
2. **Relational Integrity:**
   `ecotoken_transactions.waste_verification_id` is defined as `NOT NULL UNIQUE REFERENCES waste_verifications(id) ON DELETE RESTRICT`. A database constraint prevents duplicate transactions from ever being inserted.
3. **Concurrency Safety:**
   Household balance updates utilize pessimistic write locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) via `HouseholdRepository.findByIdForUpdate()`. Concurrent pickups verified simultaneously for the same household cannot cause lost updates.
4. **Zero-Reward Traceability:**
   When a waste collection is marked `REJECTED` by the inspecting farmer, an audit transaction with `amount = 0.00` is recorded in the ledger with description `"Waste rejected during verification — 0 tokens minted"`. The household balance remains unchanged, while providing complete transparency.
5. **Deterministic Scale & Rounding:**
   All token amounts and balances use `BigDecimal` configured to **2 decimal places** with `RoundingMode.HALF_UP`.

---

## 3. Object-Oriented Principles in this Module

### Polymorphism: Strategy Pattern for Token Calculation
The reward algorithm is decoupled via the [`TokenCalculator`](../../src/main/java/com/agroloop/service/token/TokenCalculator.java) strategy interface:
```java
public interface TokenCalculator {
    BigDecimal calculateReward(WasteVerification verification);
}
```

- **[`StandardTokenCalculator`](../../src/main/java/com/agroloop/service/token/StandardTokenCalculator.java):**
  Baseline economic algorithm:
  $$\text{Tokens} = \text{Verified Weight (kg)} \times \text{Category Multiplier} \times \text{Quality Multiplier}$$
  - **Category Multipliers:** Defined in [`WasteCategory`](../../src/main/java/com/agroloop/model/WasteCategory.java) (`FOOD_SCRAPS` = 1.00x, `GARDEN_WASTE` = 0.80x, `AGRICULTURAL_ORGANIC` = 1.20x, `COFFEE_GROUNDS` = 1.50x).
  - **Quality Multipliers:** Defined in [`QualityGrade`](../../src/main/java/com/agroloop/model/QualityGrade.java) (`GRADE_A` = 1.20x, `GRADE_B` = 1.00x, `GRADE_C` = 0.70x, `REJECTED` = 0.00x).
  - **Acceptance Example:** 5.00 kg of `COFFEE_GROUNDS` with `GRADE_A` yields:
    $$5.00 \times 1.50 \times 1.20 = 9.00 \text{ EcoTokens}$$

- **[`PromotionalTokenCalculator`](../../src/main/java/com/agroloop/service/token/PromotionalTokenCalculator.java):**
  Applies configurable surge campaigns (e.g. spring city-wide composting surge, bonus multiplier 1.25x). Multiplier and campaign metadata are externalized in `application.properties`.
  - Strategy selection is managed cleanly via Spring `@ConditionalOnProperty(name = "agroloop.tokens.calculator-strategy", havingValue = "...", matchIfMissing = true)`.

### Encapsulation & Audit Immutability
- **[`EcoTokenTransaction`](../../src/main/java/com/agroloop/model/EcoTokenTransaction.java):**
  - An immutable ledger entity. Public setters are omitted to enforce read-only immutability outside JPA lifecycle; all state initialization occurs through constructor parameters.
  - Captures `id`, `household`, `wasteVerification`, `amount`, `transactionType`, `balanceAfter`, `description`, and `createdAt`.
  - Enforces domain invariants on instantiation (non-null household, non-null verification, non-negative balance snapshot).

- **[`Household`](../../src/main/java/com/agroloop/model/Household.java):**
  - Encapsulates `tokenBalance`. State mutation occurs strictly through domain methods `addTokens(amount)` and `spendTokens(amount)`.

---

## 4. System Architecture & Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor Farmer
    participant PC as PickupController
    participant PS as PickupServiceImpl
    participant PR as PickupRequest
    participant VR as WasteVerificationRepository
    participant TS as TokenRewardServiceImpl
    participant TR as EcoTokenTransactionRepository
    participant HR as HouseholdRepository
    participant TC as TokenCalculator (Strategy)
    participant HH as Household (Domain Entity)

    Farmer->>PC: POST /farmer/pickups/{id}/verify (weight, grade, notes)
    PC->>PS: verifyPickup(pickupId, farmerId, request)
    PS->>PR: recordVerification(verification)
    PS->>VR: save(verification)
    PS->>TS: mintRewardForVerification(verification)
    
    TS->>TR: findByWasteVerificationId(verification.id)
    alt Transaction Already Exists
        TR-->>TS: Return existing EcoTokenTransaction
        TS-->>PS: Return existing transaction (Idempotent)
    else New Verification
        TS->>HR: findByIdForUpdate(household.id) [PESSIMISTIC_WRITE Lock]
        HR-->>TS: Locked Household Entity
        TS->>TC: calculateReward(verification)
        TC-->>TS: rewardAmount (BigDecimal)
        
        alt rewardAmount > 0 (Accepted Waste)
            TS->>HH: addTokens(rewardAmount)
            TS->>HR: save(household)
        else rewardAmount == 0 (Rejected Waste)
            Note over TS: Wallet balance untouched; record 0.00 audit entry
        end

        TS->>TR: save(new EcoTokenTransaction)
        TR-->>TS: Persisted EcoTokenTransaction
        TS-->>PS: Completed Transaction
    end

    PS-->>PC: WasteVerification
    PC-->>Farmer: Redirect to Dashboard with Reward Confirmation
```

---

## 5. Database Constraints & Schema Invariants

Defined in Flyway migration [`V5__create_ecotoken_transactions_table.sql`](../../src/main/resources/db/migration/V5__create_ecotoken_transactions_table.sql):

| Table | Constraint Name | Type | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| `ecotoken_transactions` | `pk_ecotoken_transactions` | `PRIMARY KEY` | Unique ID (`BIGSERIAL`) |
| `ecotoken_transactions` | `fk_ecotoken_transactions_household` | `FOREIGN KEY` | `household_id` references `households(id)` (`ON DELETE CASCADE`) |
| `ecotoken_transactions` | `fk_ecotoken_transactions_verification` | `FOREIGN KEY` | `waste_verification_id` references `waste_verifications(id)` (`ON DELETE RESTRICT`) |
| `ecotoken_transactions` | `uq_ecotoken_transactions_verification` | `UNIQUE` | Exactly one transaction per `waste_verification_id` |
| `ecotoken_transactions` | `chk_ecotoken_transactions_balance_after` | `CHECK` | `CHECK (balance_after >= 0)` |

---

## 6. Master Clickable File Structure & Catalog

| File Path | Layer | Key Classes / Interfaces | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| [`V5__create_ecotoken_transactions_table.sql`](../../src/main/resources/db/migration/V5__create_ecotoken_transactions_table.sql) | Flyway Migration | SQL DDL | Schema definition for `ecotoken_transactions`, unique verification constraint, and indexes. |
| [`TransactionType.java`](../../src/main/java/com/agroloop/model/TransactionType.java) | Domain Model | `TransactionType` | Enumeration of ledger event categories (`REWARD_MINTED` for Phase 5 reward transactions). |
| [`EcoTokenTransaction.java`](../../src/main/java/com/agroloop/model/EcoTokenTransaction.java) | Domain Model | `EcoTokenTransaction` | Immutable audit record capturing credits/debits, balance snapshots, and verification references. |
| [`TokenCalculator.java`](../../src/main/java/com/agroloop/service/token/TokenCalculator.java) | Strategy Interface | `TokenCalculator` | Polymorphic contract for reward calculation algorithms. |
| [`StandardTokenCalculator.java`](../../src/main/java/com/agroloop/service/token/StandardTokenCalculator.java) | Strategy Implementation | `StandardTokenCalculator` | Baseline reward calculation (`weight * categoryMultiplier * qualityMultiplier`). |
| [`PromotionalTokenCalculator.java`](../../src/main/java/com/agroloop/service/token/PromotionalTokenCalculator.java) | Strategy Implementation | `PromotionalTokenCalculator` | Promotional surge campaign reward calculator with externalized property multipliers. |
| [`EcoTokenTransactionRepository.java`](../../src/main/java/com/agroloop/repository/EcoTokenTransactionRepository.java) | Repository | `EcoTokenTransactionRepository` | Spring Data JPA queries for ledger retrieval and verification idempotency checks. |
| [`HouseholdRepository.java`](../../src/main/java/com/agroloop/repository/HouseholdRepository.java) | Repository | `HouseholdRepository` | Added `findByIdForUpdate` with `@Lock(LockModeType.PESSIMISTIC_WRITE)`. |
| [`TokenRewardService.java`](../../src/main/java/com/agroloop/service/TokenRewardService.java) | Service Interface | `TokenRewardService` | Business contract for reward minting, idempotency checks, and wallet audits. |
| [`TokenRewardServiceImpl.java`](../../src/main/java/com/agroloop/service/TokenRewardServiceImpl.java) | Service Implementation | `TokenRewardServiceImpl` | Transactional coordinator executing strategy calculations, pessimistic locking, and ledger persistence. |
| [`PickupServiceImpl.java`](../../src/main/java/com/agroloop/service/PickupServiceImpl.java) | Service Implementation | `PickupServiceImpl` | Integrated `TokenRewardService.mintRewardForVerification()` inside `verifyPickup()`. |
| [`DashboardController.java`](../../src/main/java/com/agroloop/controller/DashboardController.java) | Web Controller | `DashboardController` | Passes household transaction history to `dashboard/household.html`. |
| [`PickupController.java`](../../src/main/java/com/agroloop/controller/PickupController.java) | Web Controller | `PickupController` | Updated flash feedback messages upon successful verification and token minting. |
| [`household.html`](../../src/main/resources/templates/dashboard/household.html) | UI Template | Thymeleaf View | Added responsive EcoToken Reward Ledger table with transaction IDs, badges, amounts, and balance snapshots. |

---

## 7. Test Matrix & Verification

| Test Class | Test Target | Key Scenarios Validated |
| :--- | :--- | :--- |
| [`TokenCalculatorTest`](../../src/test/java/com/agroloop/service/TokenCalculatorTest.java) | `StandardTokenCalculator`, `PromotionalTokenCalculator` | Acceptance case: 5.00 kg Coffee Grounds + Grade A = 9.00 EcoTokens; Standard categories (Food Scraps, Garden Waste, Agri); 0.00 tokens for Rejected grade; Promotional 1.25x surge boost; Null checks. |
| [`EcoTokenTransactionTest`](../../src/test/java/com/agroloop/model/EcoTokenTransactionTest.java) | `EcoTokenTransaction` | Immutability, scale normalization, non-negative balance validation, non-null constraints, and `TransactionType` credit classification. |
| [`TokenRewardServiceTest`](../../src/test/java/com/agroloop/service/TokenRewardServiceTest.java) | `TokenRewardServiceImpl` | Successful reward minting and wallet credit; Concurrency locking assertion (`findByIdForUpdate`); Idempotency returning existing transaction without double crediting; Zero-reward audit entry on rejected waste. |
| [`PickupServiceTest`](../../src/test/java/com/agroloop/service/PickupServiceTest.java) | `PickupServiceImpl` | Verifies that `verifyPickup()` automatically calls `tokenRewardService.mintRewardForVerification()`. |
| [`TokenRewardServiceIntegrationTest`](../../src/test/java/com/agroloop/service/TokenRewardServiceIntegrationTest.java) | `TokenRewardServiceImpl` (Database-backed) | Concurrent execution with real pessimistic locking and unique constraints verifying exact idempotency under multithreaded contention. |
| [`DashboardIntegrationTest`](../../src/test/java/com/agroloop/controller/DashboardIntegrationTest.java) | `DashboardController` (MockMvc Integration) | Verifies populated household dashboard rendering with live transactions, quality grades, amounts, and eager association resolution with `open-in-view=false`. |

---

[← Back to Master Documentation Hub](../INDEX.md)
