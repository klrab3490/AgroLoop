# Module 03: Waste Submission & Media Processing

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 3: Waste Submission**, households submit organic waste records accompanied by photographic evidence. This module handles:
- Waste categorization (e.g. food scraps, garden waste, agricultural compostable matter).
- Multipart image file upload, validation, and storage on disk.
- Lifecycle association between a `Household` and its `WasteSubmission` entities.

---

## 2. Object-Oriented Principles in this Module

### Encapsulation
- A `WasteSubmission` owns its state (category, estimated weight, photo storage path, submission timestamp, and lifecycle status).
- Household submission creation occurs through domain methods:
  - `household.submitWaste(WasteSubmission submission)` enforces relationship integrity.

### Abstraction
- File storage operations are abstracted behind a `FileStorageService` interface, decoupling the controller and domain entity from local filesystem vs. S3/cloud storage specifics.

### Polymorphism & Extensibility
- `WasteCategory` enumeration or value objects dictate category-specific baseline token ratios.

---

## 3. Core Class Design

```java
public class WasteSubmission {
    private Long id;
    private Household household;
    private WasteCategory category;
    private double estimatedWeight;
    private String imagePath;
    private SubmissionStatus status; // SUBMITTED, CLAIMED, COLLECTED, VERIFIED, REJECTED
    private LocalDateTime createdAt;
    
    // Domain methods
    public void markClaimed() { ... }
    public void markCollected() { ... }
}
```

---

[← Back to Master Documentation Hub](../INDEX.md)
