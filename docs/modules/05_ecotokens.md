# Module 05: EcoTokens & Reward Minting

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 5: EcoTokens**, validated organic waste collections are rewarded with platform currency (**EcoTokens**). EcoTokens incentivize continuous citizen recycling and serve as currency in the sustainable marketplace.

---

## 2. Object-Oriented Principles in this Module

### Polymorphism: Strategy Pattern for Token Calculation
- Different waste categories and quality grades generate rewards based on configurable economic algorithms.
- Defined via the `TokenCalculator` interface:
  ```java
  public interface TokenCalculator {
      BigDecimal calculateReward(WasteVerification verification);
  }
  ```
- Concrete strategies:
  - `StandardTokenCalculator`: Base reward = `verifiedWeight * categoryMultiplier * qualityFactor`.
  - `PromotionalTokenCalculator`: Applies surge incentives or city-wide composting drives.

### Encapsulation & Audit Immutability
- `EcoTokenTransaction`:
  - Immutable record of credits (`REWARD_MINTED`) and debits (`MARKETPLACE_PURCHASE`).
  - Fields are `final` or private without setters.
- `Household.addTokens(amount)` updates the wallet balance atomically within the same database transaction.

---

## 3. Transaction Integrity Rules

1. **Verification Dependency:** Token rewards can only be minted if `WasteVerification.status == VERIFIED`.
2. **Idempotency:** Exactly one `EcoTokenTransaction` is allowed per verified `PickupRequest`.
3. **Audit Trail:** Every credit and debit operation is permanently preserved in `token_transactions`.

---

[← Back to Master Documentation Hub](../INDEX.md)
