# Module 04: Pickup Management & Verification Engine

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 4: Pickup & Verification**, farmers review available waste submissions within their operational radius, claim and schedule pickups, collect the organic waste, and conduct post-collection verification (actual weight and quality grading).

---

## 2. Object-Oriented Principles in this Module

### Encapsulation & State Machine
- `PickupRequest` enforces a strict lifecycle state machine:
  - `REQUESTED` ➔ `ASSIGNED` ➔ `SCHEDULED` ➔ `COLLECTED` ➔ `VERIFIED` (or `CANCELLED` / `DECLINED`).
- Transitions occur strictly via domain methods:
  - `accept()`: Farmer accepts the pickup assignment.
  - `decline()`: Farmer declines or unassigns.
  - `schedule(LocalDateTime slot)`: Sets collection appointment.
  - `cancel(String reason)`: Household or farmer cancels according to cancellation window rules.

### Abstraction
- Routing and proximity matching are abstracted behind `WasteMatcher` / `RouteOptimizationService`.

### Verification Logic
- `WasteVerification` encapsulates post-collection quality inspection:
  - Records verified actual weight (kg).
  - Grades contamination level / organic purity (`GRADE_A`, `GRADE_B`, `GRADE_C`, `REJECTED`).
  - Holds photo comparison reference.

---

## 3. Core Class Design

```java
public class PickupRequest {
    private Long id;
    private Farmer assignedFarmer;
    private WasteSubmission wasteSubmission;
    private PickupStatus status;
    private LocalDateTime scheduledTime;
    private WasteVerification verification;

    public void accept(Farmer farmer) { ... }
    public void schedule(LocalDateTime time) { ... }
    public void recordVerification(WasteVerification verification) { ... }
}
```

---

[← Back to Master Documentation Hub](../INDEX.md)
