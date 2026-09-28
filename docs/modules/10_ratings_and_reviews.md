# Module 10: Ratings, Reviews & Farmer Reputation

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 10: Ratings, Reviews & Farmer Reputation**, AgroLoop implements a trust and quality assurance mechanism for the platform. Stakeholders can leave 1-to-5 star ratings and written reviews following completed logistics pickups or delivered marketplace orders.

```text
       Completed Event (Pickup Verified / Order Delivered)
                                │
                                ▼
         Household or Farmer Opens Review Form
                                │
                                ▼
       Validation & Integrity Guards:
       - Rating bounded in [1, 5]
       - Reviewer != Target (Anti-Self-Review Guard)
       - Target Event Exists & Involved Reviewer
       - No Prior Duplicate Review for this Event
                                │
                                ▼
         Review Saved & Farmer Reputation Recalculated
                                │
                                ▼
    Public Farmer Trust Profile Updated with Star Badge & Reviews
```

---

## 2. Core Invariants & Architectural Guarantees

$$\text{Reputation Invariant} \iff \begin{cases}
\text{rating} \in \{1, 2, 3, 4, 5\} \\
\text{reviewerId} \ne \text{targetFarmerId} \quad (\text{Anti-Self-Review Rule}) \\
\text{averageRating} = \frac{1}{N} \sum_{i=1}^{N} r_i, \quad N = \text{totalReviews} \\
\text{Event Linkage: Review strictly references a valid, terminal } \texttt{PickupRequest} \text{ or } \texttt{Order} \\
\text{Idempotency: Exactly one review permitted per reviewer per target event}
\end{cases}$$

### 1. Context-Aware Review Types

The [`Review`](../../src/main/java/com/agroloop/model/Review.java) domain entity supports two operational contexts:

* **`PICKUP`:** Submitted by a household evaluating the farmer's promptness, professionalism, and waste handling during a physical pickup.
* **`ORDER`:** Submitted by a household reviewing produce quality, packaging, and fulfillment accuracy of a marketplace order.

### 2. Farmer Reputation Summary & Badging

The [`ReviewService`](../../src/main/java/com/agroloop/service/ReviewService.java) maintains real-time aggregated metrics for farmers:

* `averageRating`: Rounded to 2 decimal places.
* `reviewCount`: Total verified reviews count.
* `fiveStarCount`, `fourStarCount`, etc.: Distribution breakdown for histogram rendering.
* Farmer Trust Badges:
  * **Top Rated:** $\text{averageRating} \ge 4.5 \land \text{reviewCount} \ge 10$.
  * **Verified Collector:** Minimum 5 verified pickups with positive feedback.

---

## 3. Database Schema (Flyway V11)

Flyway migration `V11__ratings_and_reviews.sql` introduces the `reviews` table and adds reputation summary columns to `farmers`:

```sql
CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    reviewer_id BIGINT NOT NULL REFERENCES users(id),
    farmer_id BIGINT NOT NULL REFERENCES farmers(id),
    review_type VARCHAR(20) NOT NULL, -- 'PICKUP' or 'ORDER'
    pickup_request_id BIGINT REFERENCES pickup_requests(id),
    order_id BIGINT REFERENCES orders(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Partial unique constraints preventing duplicate reviews
CREATE UNIQUE INDEX uq_review_pickup ON reviews(reviewer_id, pickup_request_id)
    WHERE pickup_request_id IS NOT NULL;
CREATE UNIQUE INDEX uq_review_order ON reviews(reviewer_id, order_id)
    WHERE order_id IS NOT NULL;

-- Farmer reputation caching
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0.00;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
```

---

## 4. Key Classes & Methods Catalog

| Class / Interface | Responsibility | Key Methods |
| :--- | :--- | :--- |
| [`Review`](../../src/main/java/com/agroloop/model/Review.java) | Domain entity for ratings and reviews | `validate()`, `getRating()`, `getComment()` |
| [`ReviewType`](../../src/main/java/com/agroloop/model/ReviewType.java) | Enum designating review context | `PICKUP`, `ORDER` |
| [`ReviewService`](../../src/main/java/com/agroloop/service/ReviewService.java) | Review creation, validation & metrics | `submitReview()`, `getFarmerReputation()`, `getReviewsForFarmer()` |
| [`ReviewRepository`](../../src/main/java/com/agroloop/repository/ReviewRepository.java) | Spring Data JPA persistence | `findByFarmerIdOrderByCreatedAtDesc()`, `calculateAverageRating()` |
| [`ReviewWebController`](../../src/main/java/com/agroloop/controller/web/ReviewWebController.java) | Thymeleaf web controller | `showSubmitForm()`, `handleSubmit()`, `viewFarmerProfile()` |
| [`ReviewApiController`](../../src/main/java/com/agroloop/controller/api/v1/ReviewApiController.java) | REST endpoints for reviews & reputation | `submitReview()`, `getFarmerReviews()`, `getReputationSummary()` |

---

## 5. Verification & Test Coverage

* **[`ReviewTest`](../../src/test/java/com/agroloop/model/ReviewTest.java):** Unit tests for rating boundaries (1-5), self-review guard, and null checks.
* **[`ReviewServiceTest`](../../src/test/java/com/agroloop/service/ReviewServiceTest.java):** Tests review submission, duplicate review rejection, farmer reputation recalculation, and unauthorized user rejection.
* **[`ReviewWebControllerTest`](../../src/test/java/com/agroloop/controller/ReviewWebControllerTest.java):** Tests form rendering, CSRF protection, and validation error flash messages.
* **[`ReviewApiControllerTest`](../../src/test/java/com/agroloop/controller/api/v1/ReviewApiControllerTest.java):** Tests REST POST `/api/v1/reviews` with JWT auth and GET `/api/v1/reviews/farmer/{id}/summary`.
