# AgroLoop Web Architecture Guide

This document defines the architectural patterns, directory structure, coding standards, and security invariants for the AgroLoop Web Client (`@agroloop/web`).

---

## 1. Directory Structure

```
clients/web/src/
├── app/                      # Next.js App Router (pages, layouts, route handlers)
│   ├── api/                  # BFF Route Handlers (proxy, auth cookie management)
│   ├── farmer/               # Farmer operations & pickup execution
│   ├── household/            # Household waste submission & EcoToken tracking
│   ├── marketplace/          # Regenerative product catalog & checkout
│   ├── orders/               # Order history, timeline, tracking & disputes
│   ├── error.tsx             # Global Error Boundary UI
│   ├── not-found.tsx         # Global 404 handler
│   ├── loading.tsx           # Global loading suspense fallback
│   ├── layout.tsx            # Root HTML & body shell
│   └── providers.tsx         # Unified Provider tree (Query, Auth, Cart, Toast)
│
├── components/               # Presentation Layer
│   ├── ui/                   # Reusable atomic UI primitives (Button, Card, Badge, Modal, Alert, Spinner)
│   ├── common/               # Shared structural components (Navbar, Footer, ToastContainer)
│   └── ...                   # Domain components (ProductCard, DoorstepWeighinModal, QrCodeView)
│
├── config/                   # Configuration & Environment
│   ├── env.ts                # Type-safe environment variable access
│   ├── bff-config.ts         # BFF proxy route allowlists and backend URLs
│   └── site-config.ts        # App metadata and navigation items
│
├── context/                  # Client State Management
│   ├── auth-context.tsx      # User authentication session and tokens
│   ├── cart-context.tsx      # Persistent shopping cart state
│   └── toast-context.tsx     # Centralized notification queue
│
├── hooks/                    # Reusable Business Logic (Custom Hooks)
│   ├── use-toast.ts          # Toast dispatch hook (success, error, info)
│   ├── use-marketplace.ts    # Product queries, sorting, and filtering logic
│   └── use-orders.ts         # Order fetching, cancellation, and dispute mutations
│
├── services/                 # Data Access & API Layer
│   ├── api-client.ts         # Configured API client with BFF fetch interceptor
│   ├── auth.service.ts       # Auth requests (login, register, logout, session)
│   ├── marketplace.service.ts# Product catalog and category endpoints
│   ├── orders.service.ts     # Order placement and lifecycle operations
│   └── pickups.service.ts    # Pickups and doorstep handshake verification
│
├── types/                    # Frontend View Models & Type Exports
├── utils/                    # Pure Utility Functions
│   ├── formatters.ts         # Currency, date, token, and weight formatters
│   ├── error-handler.ts      # Standardized API error extraction
│   └── weigh-in.ts           # Token calculations & quality grade multipliers
│
└── tests/                    # Vitest Test Suite
    ├── auth.test.ts          # Auth state & token storage tests
    ├── bff-proxy.test.ts     # Proxy routing and security allowlist tests
    ├── cart.test.ts          # Cart sanitization & storage tests
    ├── doorstep-weighin.test.ts # Doorstep verification & multiplier tests
    └── web-security.test.ts  # Cookie security & token leak prevention tests
```

---

## 2. Architectural Invariants

### 2.1 Backend-for-Frontend (BFF) Boundary
- The browser JavaScript runtime **never** communicates directly with the Spring Boot backend (`http://localhost:8080`).
- All requests flow through Next.js BFF handlers:
  - `/api/auth/*` — Handles refresh token rotation inside secure, HttpOnly, SameSite cookies.
  - `/api/proxy/*` — Forwards authenticated requests using an in-memory access token.
- **Security Invariant:** Refresh tokens are never stored in `localStorage` or `sessionStorage`.

### 2.2 Separation of Concerns
1. **Pages (`src/app/**/page.tsx`)**: Handle layout, route params, and component assembly. Heavy data filtering and mutation logic must be delegated to hooks in `src/hooks/`.
2. **Hooks (`src/hooks/`)**: Encapsulate TanStack Query (`useQuery`, `useMutation`), local filter state, and side-effects.
3. **Services (`src/services/`)**: Provide typed, promise-based API functions.
4. **UI Primitives (`src/components/ui/`)**: Pure presentational components with zero business logic or domain coupling.
5. **Utils (`src/utils/`)**: Pure deterministic functions with no side effects (formatting, calculations).

---

## 3. State Management Strategy

| State Type | Solution | Location | Example |
| :--- | :--- | :--- | :--- |
| **Server Cache** | `@tanstack/react-query` | Handled via hooks (`useMarketplace`, `useOrders`) | Products, Orders, Pickups |
| **Auth Session** | React Context | `src/context/auth-context.tsx` | User profile, role, access token |
| **Cart State** | React Context + LocalStorage | `src/context/cart-context.tsx` | Cart items, quantities |
| **UI Feedback** | React Context | `src/context/toast-context.tsx` | Temporary notification toasts |

---

## 4. Error Handling Guidelines

1. **Global Boundary**: [`src/app/error.tsx`](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/clients/web/src/app/error.tsx) catches unhandled runtime errors in the component tree.
2. **API Errors**: Use [`getErrorMessage()`](file:///Users/rahul/Desktop/Projects/Personal/AgroLoop/clients/web/src/utils/error-handler.ts) to extract human-readable error messages from Spring Boot backend responses or network timeouts.
3. **Form & Mutation Feedback**: Surface operation errors via `useToast().error(...)` rather than raw `alert()` or silent catches.

---

## 5. Naming Conventions

- **Files & Folders**: `kebab-case` (`product-card.tsx`, `use-orders.ts`, `site-config.ts`).
- **Components**: `PascalCase` (`ProductCard`, `CartDrawer`, `Button`).
- **Hooks**: `camelCase` with `use` prefix (`useToast`, `useMarketplace`).
- **Utilities & Functions**: `camelCase` (`formatCurrency`, `calculateEstimatedTokens`).
- **Constants**: `UPPER_SNAKE_CASE` (`QUALITY_GRADES`, `ALLOWED_PROXY_PREFIXES`).
