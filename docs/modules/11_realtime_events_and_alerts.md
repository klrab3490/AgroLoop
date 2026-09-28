# Module 11: Real-Time Events & Push Alerts

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 11: Real-Time Events & Push Alerts**, AgroLoop introduces live telemetry and asynchronous event distribution across the platform. Stakeholders are notified in real-time when critical domain events occur—such as when a farmer schedules a pickup, when a waste verification credits EcoTokens, when an order is placed, or when a review is received.

```text
    Spring Boot Domain Event Fired (ApplicationEventPublisher)
                              │
                              ▼
                 NotificationEventListener
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
       Persistent Record            Live Stream Push
   (notifications DB table)     (SseEmitterRegistry)
               │                             │
               ▼                             ▼
     User Inbox Page / API         Connected Browser / Mobile
       (/notifications)              (EventSource SSE Stream)
```

---

## 2. Core Invariants & Architectural Guarantees

$$\text{Notification Invariant} \iff \begin{cases}
\text{Delivery Guarantees: All events are written to } \texttt{notifications} \text{ DB table before SSE dispatch} \\
\text{Thread Safety: } \texttt{SseEmitterRegistry} \text{ manages active connections using concurrent data structures} \\
\text{Timeout Resilience: Abandoned client connections are automatically pruned via } \texttt{onTimeout} / \texttt{onError} \\
\text{User Privacy: SseEmitter streams are authenticated via Spring Security and strictly scoped to } \text{userId}
\end{cases}$$

### 1. Thread-Safe Server-Sent Events (SSE) Architecture

The [`SseEmitterRegistry`](../../src/main/java/com/agroloop/service/notification/SseEmitterRegistry.java) maintains active HTTP connection streams:

* **Concurrent Map Storage:** `ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>>` allows multiple concurrent tabs/devices per user.
* **Non-Blocking Emitter Lifecycles:** Emitters are registered with a 30-minute timeout. When a connection drops or completes, callbacks (`onCompletion`, `onTimeout`, `onError`) automatically deregister the emitter.
* **Heartbeat / Keep-Alive:** SSE comments `:keep-alive\n\n` are transmitted periodically to prevent intermediary proxy timeouts (e.g. Nginx / AWS ALB).

### 2. Domain Event Decoupling (`NotificationEvents`)

Domain actions publish strongly-typed events via Spring's `ApplicationEventPublisher`:

* `PickupScheduledEvent`: Farmer scheduled an estimated arrival time.
* `PickupCompletedEvent`: Waste collected and EcoTokens credited to household wallet.
* `OrderPlacedEvent`: Marketplace order received by farmer.
* `OrderDisputedEvent`: Household or farmer raised a dispute requiring admin review.
* `ReviewReceivedEvent`: New rating and feedback posted on farmer profile.

The [`NotificationEventListener`](../../src/main/java/com/agroloop/service/notification/NotificationEventListener.java) handles these events asynchronously, shielding the primary transaction from notification delivery latency.

---

## 3. Database Schema (Flyway V12)

Flyway migration `V12__notification_system.sql` introduces the `notifications` table:

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    reference_id BIGINT,
    reference_type VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
```

---

## 4. Key Classes & Methods Catalog

| Class / Interface | Responsibility | Key Methods |
| :--- | :--- | :--- |
| [`Notification`](../../src/main/java/com/agroloop/model/Notification.java) | Domain entity for user alert | `markAsRead()`, `getTitle()`, `getMessage()` |
| [`NotificationType`](../../src/main/java/com/agroloop/model/NotificationType.java) | Categorization enum | `PICKUP_SCHEDULED`, `TOKENS_CREDITED`, `ORDER_PLACED`, etc. |
| [`SseEmitterRegistry`](../../src/main/java/com/agroloop/service/notification/SseEmitterRegistry.java) | In-memory registry of active SSE clients | `register()`, `sendToUser()`, `broadcast()` |
| [`NotificationEventListener`](../../src/main/java/com/agroloop/service/notification/NotificationEventListener.java) | Listens to domain events and creates alerts | `handlePickupScheduled()`, `handleTokensCredited()` |
| [`NotificationService`](../../src/main/java/com/agroloop/service/NotificationService.java) | Notification persistence & unread counts | `getUserNotifications()`, `getUnreadCount()`, `markAsRead()` |
| [`NotificationWebController`](../../src/main/java/com/agroloop/controller/web/NotificationWebController.java) | Thymeleaf controller for user inbox | `viewNotifications()`, `markRead()`, `markAllRead()` |
| [`NotificationApiController`](../../src/main/java/com/agroloop/controller/api/v1/NotificationApiController.java) | REST & SSE endpoints for mobile/web | `getNotifications()`, `subscribeSse()`, `getUnreadCount()` |

---

## 5. Verification & Test Coverage

* **[`NotificationTest`](../../src/test/java/com/agroloop/model/NotificationTest.java):** Tests entity instantiation, `markAsRead()` mutations, and read invariant checks.
* **[`NotificationServiceTest`](../../src/test/java/com/agroloop/service/NotificationServiceTest.java):** Tests creation, unread count calculations, marking individual or all notifications as read, and user isolation.
* **[`NotificationWebControllerTest`](../../src/test/java/com/agroloop/controller/NotificationWebControllerTest.java):** Tests inbox template rendering and post-redirect-get state updates.
* **[`NotificationApiControllerTest`](../../src/test/java/com/agroloop/controller/api/v1/NotificationApiControllerTest.java):** Tests `/api/v1/notifications` REST listing, read mutation, and SSE stream subscription.
