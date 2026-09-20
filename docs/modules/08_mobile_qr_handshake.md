# Module 08: Mobile QR Verification & On-Site Handshake Architecture

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 8 (Track C): Mobile QR Verification & On-Site Handshake**, AgroLoop introduces a fraud-proof, server-authoritative on-site collection protocol between Households and Farmers for organic waste collections.

When a farmer arrives at a household's residence to collect an organic waste batch:
1. **Dynamic Generation**: The household requests an ephemeral verification pass from their mobile app.
2. **Server-Side Cryptographic Signature**: The backend generates a cryptographically signed pass using HMAC-SHA256 with a strictly server-held secret key. The QR payload contains zero Personally Identifiable Information (PII).
3. **Dual Verification Channels**:
   - **Visual QR Scan**: Compact URI-encoded JSON payload scanned by the farmer's camera or simulator.
   - **Human-Enterable Passcode**: 10-character formatted code (e.g. `ECO-4821-7395`) hashed via SHA-256 in the database.
4. **Server-Authoritative Consumption**: The farmer's mobile app submits the pass to the server. The server locks the active handshake row (`SELECT ... FOR UPDATE`), verifies the cryptographic signature or constant-time hash, checks tripartite IDOR integrity, checks expiration and rate limits, and transitions the state atomically to `CONSUMED`.
5. **Non-Repudiation**: Verification unlocks certified weight recording and token minting with an immutable proof trail linking the pickup to the farmer and household.

```text
Household Mobile               AgroLoop Server              Farmer Mobile
       │                              │                           │
       │── POST /api/v1/pickups/─────▶│                           │
       │   {id}/handshake/pass        │                           │
       │                              │ [Lock existing ISSUED]    │
       │                              │ [Mark previous INVALID]   │
       │                              │ [HMAC-SHA256 Sign]        │
       │◀── Signed Compact QR Payload ┼                           │
       │    & ECO-XXXX-XXXX Passcode  │                           │
       │                              │                           │
   [Display QR]                       │                           │
       │                              │                           │
       │········ Physical QR Scan / Passcode Exchange ············│
       │                                                          │
       │                              │◀── POST /api/v1/pickups/──│
       │                              │    {id}/handshake         │
       │                              │                           │
       │                              │ [Pessimistic Row Lock]    │
       │                              │ [Validate Nonce & IDOR]   │
       │                              │ [Constant-Time HMAC/Hash] │
       │                              │ [failedAttempts < 5]      │
       │                              │ [status ➔ CONSUMED]       │
       │                              │                           │
       │                              ├────── HTTP 200 OK ───────▶│
       │                              │    { verified: true }     │
       │                              │                           │
       │                              │◀── POST /api/v1/farmer/───│
       │                              │    pickups/{id}/verify    │
       │                              │ [Mint EcoTokens]          │
```

---

## 2. Core Security Invariants

$$\text{On-Site Handshake Invariants} \iff \begin{cases}
\text{HMAC Key Isolation: } K_{\text{HMAC}} \in \text{Server Memory ONLY} \;(\text{Never delivered to client}) \\
\text{Canonical Representation: } \texttt{v1|pickupId|householdId|submissionId|issuedAt|expiresAt|nonce|passCode} \\
\text{Replay Protection: } \text{Single-use atomic consumption via } \texttt{SELECT ... FOR UPDATE} \\
\text{Manual Brute-Force Defense: } \texttt{failedAttempts} \ge 5 \implies \text{status} \to \texttt{INVALIDATED} \\
\text{Zero Client-Side Trust: } \text{Mobile does NOT verify HMAC or trust URL params} \\
\text{Zero PII: } \text{QR payload contains only opaque IDs, timestamps, nonce, and signature}
\end{cases}$$

### 1. Server-Authoritative HMAC Verification
Mobile clients **never** hold or verify HMAC keys. The household app requests a pass; the server signs it using `HmacSHA256` against canonical representation `v1|pickupId|householdId|submissionId|issuedAt|expiresAt|nonce|passCode`. When scanned, the farmer app forwards the payload to the server, which validates the signature using `MessageDigest.isEqual` to prevent timing attacks.

### 2. Tripartite IDOR & Nonce-Exclusivity Protection
When verifying via QR scan:
- Path variable `pickupId` must match the payload's `p` attribute.
- The handshake row is located **strictly by the unguessable 128-bit UUID `nonce`**.
- The row's `pickup_id` must match the path `pickupId`.
- The pickup's `assigned_farmer_id` must match the authenticated farmer.
Any tampering between the QR code and the URL path returns `400 Bad Request`.

### 3. Pessimistic Locking & Concurrency Race Defense
Every verification transaction locks the handshake row (`SELECT ... FOR UPDATE` via `findFirstByPickupIdAndStatusOrderByIssuedAtDesc`). If two workers or network retries attempt to consume the pass concurrently, exactly one worker consumes it; the second worker observes `status == CONSUMED` and immediately receives `HandshakeAlreadyConsumedException` (mapped to HTTP `409 Conflict`).

### 4. Locked Manual Passcode Fallback & Rate-Limiting
When lighting or camera constraints prevent QR scanning, households can dictate the 10-character code (`ECO-XXXX-XXXX`). The database stores only the hex-encoded SHA-256 hash. During verification, the active handshake is locked first. If an invalid code is supplied, `failedAttempts` is incremented and flushed (`@Transactional(noRollbackFor = InvalidHandshakeException.class)`). If `failedAttempts >= 5`, the pass is marked `INVALIDATED`, neutralizing brute-force dictionary attacks against the low-entropy code.

---

## 3. Database Schema & Flyway Migration `V9`

```sql
CREATE TABLE pickup_handshakes (
    id BIGSERIAL PRIMARY KEY,
    pickup_id BIGINT NOT NULL REFERENCES pickup_requests(id) ON DELETE CASCADE,
    household_id BIGINT NOT NULL REFERENCES users(id),
    waste_submission_id BIGINT REFERENCES waste_submissions(id),
    status VARCHAR(32) NOT NULL DEFAULT 'ISSUED',
    verification_method VARCHAR(32),
    nonce VARCHAR(64) NOT NULL,
    pass_code_hash VARCHAR(64) NOT NULL,
    signature VARCHAR(128) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    verified_by_farmer_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique index on nonce prevents collision/replay
CREATE UNIQUE INDEX idx_pickup_handshakes_nonce ON pickup_handshakes(nonce);

-- Partial unique index ensures at most ONE active ISSUED pass per pickup
CREATE UNIQUE INDEX idx_pickup_handshakes_active_unique
ON pickup_handshakes(pickup_id)
WHERE status = 'ISSUED';

ALTER TABLE pickup_requests ADD COLUMN latest_handshake_id BIGINT REFERENCES pickup_handshakes(id);
```

---

## 4. Source File Mapping

| File | Type | Purpose & Implementation Details |
| :--- | :--- | :--- |
| **[`V9__pickup_handshake.sql`](../../src/main/resources/db/migration/V9__pickup_handshake.sql)** | Migration | Flyway DDL for `pickup_handshakes` table, partial unique indexes, and pickup relationship. |
| **[`PickupHandshake.java`](../../src/main/java/com/agroloop/model/PickupHandshake.java)** | Domain Entity | Encapsulated state machine (`ISSUED`, `CONSUMED`, `EXPIRED`, `INVALIDATED`), `failedAttempts` counter, and timestamps. |
| **[`PickupHandshakeStatus.java`](../../src/main/java/com/agroloop/model/PickupHandshakeStatus.java)** | Enum | Domain lifecycle states for handshake passes. |
| **[`HandshakeVerificationMethod.java`](../../src/main/java/com/agroloop/model/HandshakeVerificationMethod.java)** | Enum | `QR_SCAN` vs `MANUAL_PASSCODE`. |
| **[`PickupHandshakeRepository.java`](../../src/main/java/com/agroloop/repository/PickupHandshakeRepository.java)** | Repository | Portable Spring Data JPA queries with `@Lock(LockModeType.PESSIMISTIC_WRITE)`. |
| **[`PickupHandshakeCanonicalizer.java`](../../src/main/java/com/agroloop/service/PickupHandshakeCanonicalizer.java)** | Crypto Service | Centralized deterministic canonical string formatting, HMAC-SHA256 signing, `MessageDigest.isEqual`, and SHA-256 code hashing. |
| **[`PickupHandshakeService.java`](../../src/main/java/com/agroloop/service/PickupHandshakeService.java)** | Service Layer | Authoritative pass issuance, single-active pass invalidation, tripartite IDOR validation, locked consumption, and rate-limiting. |
| **[`HandshakeAlreadyConsumedException.java`](../../src/main/java/com/agroloop/exception/HandshakeAlreadyConsumedException.java)** | Exception | Domain exception thrown on replay, mapped to RFC 7807 `409 Conflict`. |
| **[`InvalidHandshakeException.java`](../../src/main/java/com/agroloop/exception/InvalidHandshakeException.java)** | Exception | Domain exception thrown on signature mismatch or expiration, mapped to RFC 7807 `400 Bad Request`. |
| **[`PickupApiController.java`](../../src/main/java/com/agroloop/controller/api/v1/PickupApiController.java)** | REST Controller | Exposes `POST /api/v1/pickups/{id}/handshake/pass` and `POST /api/v1/pickups/{id}/handshake`. |
| **[`PickupHandshakeTest.java`](../../src/test/java/com/agroloop/service/PickupHandshakeTest.java)** | Test Suite | 11 automated test cases including multi-threaded race condition tests (`CountDownLatch`). |
| **[`qr-matrix.ts`](../../clients/mobile/src/services/qr-matrix.ts)** | Mobile Service | Pure TypeScript Kazuhiko Arase QR matrix generator (versions 1–40), zero native dependencies. |
| **[`qr-handshake.ts`](../../clients/mobile/src/services/qr-handshake.ts)** | Mobile Service | Client-side serialization, parsing, and passcode normalization (`ECO-XXXX-XXXX`). |
| **[`qr-code-view.tsx`](../../clients/mobile/src/components/qr-code-view.tsx)** | Component | Pure React Native high-contrast QR display with live countdown and refresh trigger. |
| **[`qr-scanner-modal.tsx`](../../clients/mobile/src/components/qr-scanner-modal.tsx)** | Component | Viewfinder overlay, manual code fallback tab, and instant simulation scanner. |
| **[`pickup.tsx`](../../clients/mobile/app/household/pickup.tsx)** | Household Screen | "Show Verification QR Pass" button and pass modal integration. |
| **[`collections.tsx`](../../clients/mobile/app/farmer/collections.tsx)** | Farmer Screen | Collection board with header & card-level QR scan triggers and on-site verified badges. |
| **[`verify.tsx`](../../clients/mobile/app/farmer/verify.tsx)** | Farmer Screen | Server-authoritative handshake verification badge and in-place authentication action. |

---

## 5. Verification & Testing Evidence

1. **Backend Integration & Concurrency Tests (`PickupHandshakeTest.java`)**:
   - `testIssueHandshakePass`: Correct canonicalization, HMAC signature, and pass-code hashing.
   - `testVerifyByQrScanSuccess`: Successful QR consumption and timestamp audit.
   - `testVerifyByManualPassCodeSuccess`: Successful manual passcode verification and normalization.
   - `testTamperedSignatureFails`: Signature mutation immediately triggers `InvalidHandshakeException`.
   - `testExpiredPassFails`: Expired timestamp rejection.
   - `testTripartiteIdorRejection`: Nonce belonging to Pickup A cannot be verified under Pickup B URL path.
   - `testBruteForcePassCodeRateLimiting`: 5 failed attempts locks pass into `INVALIDATED` status.
   - `testConcurrentVerificationRaceCondition`: 2 concurrent threads hitting the same pass simultaneously via `CountDownLatch` barrier results in exactly 1 success and 1 `HandshakeAlreadyConsumedException`.
   - Full test suite: **276 / 276 tests passing (`./mvnw test`)**.

2. **Mobile Test Suite & Type-Check**:
   - `qr-handshake.test.ts`: Serialization, URI encoding, normalization, and compact schema parsing.
   - Vitest suite: **20 / 20 tests passing (`npm test --prefix clients/mobile`)**.
   - TypeScript compiler: **Zero errors (`tsc --noEmit`)**.
