# AgroLoop Postman API Collection & Testing Suite

Welcome to the authoritative Postman documentation and testing suite for the **AgroLoop Circular Economy Platform REST API**.

This directory contains production-ready Postman artifacts supporting automated authentication, environment scoping, pre-request scripts, zero-setup developer keys, and end-to-end integration flows.

---

## Files in this Directory

| File | Purpose |
| :--- | :--- |
| **[`AgroLoop_API.postman_collection.json`](./AgroLoop_API.postman_collection.json)** | Complete v2.1.0 Postman collection containing **66 endpoints** structured across 11 core domains. |
| **[`AgroLoop_Local.postman_environment.json`](./AgroLoop_Local.postman_environment.json)** | Pre-configured environment variables (`baseUrl`, `apiKey`, demo accounts, token stores). |
| **[`README.md`](./README.md)** | This setup and integration guide. |

---

## 1. Quick Start: Import into Postman

1. Open **Postman** (or Insomnia / Bruno / Thunder Client).
2. Click **Import** (top left).
3. Drag & drop or select both files:
   - `postman/AgroLoop_API.postman_collection.json`
   - `postman/AgroLoop_Local.postman_environment.json`
4. In the top-right environment dropdown, select **AgroLoop Local Environment**.

---

## 2. Authentication Modes

AgroLoop provides **two flexible authentication paths**:

### Option A: Fixed Dev API Key (Zero Setup / Instant Testing)
For rapid local testing, Postman test runners, IoT scale simulation, and third-party logistics webhooks:
- The collection automatically injects the header:
  ```http
  X-API-Key: agroloop-dev-key
  ```
- **Privilege**: Automatically authenticates as an administrative and multi-role actor (`admin@agroloop.com`).
- **No login request required!** Any endpoint can be called immediately.

### Option B: Standard JWT Bearer Authentication
To test real multi-user permissions (Household vs. Farmer vs. Admin):
1. Navigate to folder: `2. Authentication & Sessions`.
2. Send any of the pre-configured login requests:
   - **Login (Admin)**: `admin@agroloop.com` / `admin123`
   - **Login (Farmer - Bob)**: `farmer@agroloop.com` / `farmer123`
   - **Login (Household)**: `household@agroloop.com` / `household123`
3. **Automatic Token Extraction**: The test script automatically captures `accessToken` and `refreshToken` and saves them to your `bearerToken` environment variable.
4. All subsequent requests in the collection automatically inherit this Bearer token!

---

## 3. End-to-End Test Workflows

### Workflow 1: Complete Order Lifecycle & Status Progression
Test the entire order fulfillment cycle:
1. **Create Order**: `4. Orders & Fulfillment Lifecycle -> Create Order (Household Checkout)`
   - Uses EcoTokens to checkout items. Returns `orderId` (e.g., `402`).
2. **Mark as Packed**: `4. Orders & Fulfillment Lifecycle -> Update Order Status: PACKED (Farmer)`
   - Call `POST /api/v1/orders/402/status` with `{"status": "PACKED"}`.
   - Transitions order from `PLACED` to `PACKED`.
3. **Dispatch In Transit**: `4. Orders & Fulfillment Lifecycle -> Update Order Status: IN_TRANSIT (Courier / Farmer)`
   - Call `POST /api/v1/orders/402/status` with `{"status": "IN_TRANSIT"}`.
   - Transitions order from `PACKED` to `IN_TRANSIT`.
4. **Mark as Delivered**: `4. Orders & Fulfillment Lifecycle -> Update Order Status: COMPLETED / DELIVERED`
   - Call `POST /api/v1/orders/402/status` with `{"status": "COMPLETED"}`.
   - Transitions order to `COMPLETED`.

### Workflow 2: Bio-Waste Submission to Token Minting
1. **Household Submits Waste**: `5. Household Operations -> Submit Organic Waste for Pickup`
2. **Farmer Claims Pickup**: `6. Farmer Fulfillment & Fleet -> Claim Pickup`
3. **Farmer Schedules Arrival**: `6. Farmer Fulfillment & Fleet -> Schedule Pickup Window`
4. **Doorstep Handshake**: `7. Doorstep Handshake & QR -> Issue Handshake Passcode & QR`
5. **Verify Handshake**: `7. Doorstep Handshake & QR -> Verify Handshake`
6. **Weigh & Mint EcoTokens**: `6. Farmer Fulfillment & Fleet -> Verify Waste & Mint Tokens`
7. **Verify Balance Updated**: `5. Household Operations -> Get EcoToken Balance`

---

## 4. Collection Structure Overview

```text
AgroLoop Circular Economy Platform API/
├── 1. System Discovery & Meta
│   ├── Health Check
│   └── System Metadata
├── 2. Authentication & Sessions
│   ├── Login (Admin, Farmer, Household)
│   ├── Refresh Token Session
│   ├── Get Current Authenticated User
│   ├── Register New User
│   └── Logout / Logout All Devices
├── 3. Marketplace & Products
│   ├── List Categories
│   ├── List Products (Paginated & Filtered)
│   └── Get Product by ID
├── 4. Orders & Fulfillment Lifecycle
│   ├── List Orders / Get Order Details
│   ├── Create Order (ACID Token Debit)
│   ├── Update Order Status: PACKED
│   ├── Update Order Status: IN_TRANSIT
│   ├── Update Order Status: COMPLETED
│   ├── Mark Order as Completed (/complete)
│   ├── Cancel Order (Token Refund)
│   └── Dispute Order
├── 5. Household Operations
│   ├── Get EcoToken Balance
│   ├── Get Household Ledger History
│   ├── List Waste Submissions
│   ├── Submit Organic Waste for Pickup
│   └── Apply for Farmer Role / Check Status
├── 6. Farmer Fulfillment & Fleet
│   ├── Get Assigned Orders
│   ├── Available Pickups in Radius
│   ├── Claim / Schedule / Collect / Verify Pickup
│   ├── Farmer Products Catalog & Creation
│   ├── AI / Composite Matching Recommendations
│   ├── Route Optimization (TSP) & Fleet Tracking
│   └── Update Farm Coordinates & Capacity
├── 7. Doorstep Handshake & QR
│   ├── Issue Handshake Passcode & Compact QR
│   ├── Verify Handshake (Ed25519 / 6-digit Code)
│   └── Cancel Pickup Request
├── 8. Reviews & Peer Reputation
│   ├── Submit Pickup Review
│   ├── Submit Order Review
│   ├── Reputation Summary & Trust Badge
│   └── Review Feeds
├── 9. Media & Blob Engine
│   ├── Request Pre-Signed Upload Ticket
│   ├── Confirm Media Asset
│   └── Download Media Asset
├── 10. Real-Time Notifications
│   ├── List Notifications
│   ├── Get Unread Count
│   └── Mark As Read / Mark All Read
└── 11. Administrative Governance
    ├── List Users / Get User Profile
    ├── Adjust Household Token Balance
    ├── Update User Role (Promote to Farmer/Admin)
    ├── Toggle User Status (Suspend/Enable)
    ├── List All Platform Orders
    ├── Resolve Dispute (Atomic Refund Approval)
    ├── Farmer Application Vetting (Approve/Reject)
    ├── Solvency & Token Velocity Metrics
    ├── Global Double-Entry Ledger Audit
    └── Storage Engine Diagnostics
```

---

## 5. Automated CI/CD Execution with Newman

You can run the entire test suite headless from the command line using **Newman**:

```bash
# Install Newman
npm install -g newman

# Execute the collection against local backend
newman run postman/AgroLoop_API.postman_collection.json \
  -e postman/AgroLoop_Local.postman_environment.json \
  --reporters cli,junit \
  --reporter-junit-export target/newman-report.xml
```
