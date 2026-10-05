import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, "../../docs/screenshots");
const WEB_DIR = path.join(DOCS_DIR, "web");
const DESKTOP_DIR = path.join(DOCS_DIR, "desktop");

fs.mkdirSync(WEB_DIR, { recursive: true });
fs.mkdirSync(DESKTOP_DIR, { recursive: true });

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Certified Organic Compost",
    category: "COMPOST_AND_SOIL",
    description: "High-grade, nutrient-dense organic compost matured over 90 days. Ideal for soil microbial enrichment.",
    price: "15.00",
    unit: "KG",
    stock: 50,
    farmerName: "Green Valley Farm",
    rating: 4.8,
  },
  {
    id: 2,
    name: "Heirloom Tomato Seedlings",
    category: "SEEDS_AND_SAPLINGS",
    description: "Hardy, pesticide-free heirloom tomato saplings cultivated in closed-loop nursery soil.",
    price: "8.50",
    unit: "PACK",
    stock: 30,
    farmerName: "Sunrise Organics",
    rating: 4.9,
  },
  {
    id: 3,
    name: "Microbial Compost Tea Concentrate",
    category: "COMPOST_AND_SOIL",
    description: "Active liquid aerated compost extract loaded with beneficial bacteria, fungi, and nematodes.",
    price: "12.00",
    unit: "LITER",
    stock: 25,
    farmerName: "EcoBio Solutions",
    rating: 4.9,
  },
  {
    id: 4,
    name: "Organic Mustard Greens & Veggie Basket",
    category: "ORGANIC_VEGETABLES",
    description: "Freshly harvested organic vegetable bundle grown entirely using recycled household compost.",
    price: "18.00",
    unit: "BASKET",
    stock: 15,
    farmerName: "Green Valley Farm",
    rating: 4.7,
  },
  {
    id: 5,
    name: "Pure Raw Wildflower Honey",
    category: "FARM_DAIRY",
    description: "Unfiltered raw honey harvested from pollinator strips adjacent to organic compost fields.",
    price: "22.00",
    unit: "JAR",
    stock: 40,
    farmerName: "Highland Apiaries",
    rating: 5.0,
  },
  {
    id: 6,
    name: "Culinary Herb Planter Trio",
    category: "HERBS_AND_SPICES",
    description: "Potted rosemary, sweet basil, and thyme potted in enriched vermicompost.",
    price: "14.00",
    unit: "SET",
    stock: 20,
    farmerName: "Sunrise Organics",
    rating: 4.8,
  }
];

const MOCK_HOUSEHOLD_USER = {
  id: 101,
  name: "Sarah Connor",
  email: "sarah.connor@household.org",
  role: "ROLE_HOUSEHOLD",
  verified: true,
  address: "452 Oak Tree Lane, Austin, TX",
};

const MOCK_FARMER_USER = {
  id: 202,
  name: "Marcus Aurelius Farm",
  email: "marcus@aureliusfarms.org",
  role: "ROLE_FARMER",
  verified: true,
  address: "Route 9 Valley Farmstead",
};

const MOCK_ADMIN_USER = {
  id: 303,
  name: "Eleanor Vance (Lead Operator)",
  email: "admin@agroloop.com",
  role: "ROLE_ADMIN",
  verified: true,
};

const MOCK_HOUSEHOLD_BALANCE = {
  availableBalance: 350.0,
  totalEarned: 1250.0,
  totalSpent: 900.0,
};

const MOCK_SUBMISSIONS = [
  {
    id: 501,
    category: "FOOD_SCRAPS",
    estimatedWeight: 14.5,
    status: "VERIFIED",
    pickupPassCode: "ECO-8849-PASS",
    createdAt: "2026-09-28T10:30:00Z",
  },
  {
    id: 502,
    category: "YARD_WASTE",
    estimatedWeight: 8.2,
    status: "SCHEDULED",
    pickupPassCode: "ECO-9921-PASS",
    createdAt: "2026-09-30T08:15:00Z",
  },
];

const MOCK_PICKUPS = [
  {
    id: 901,
    wasteSubmissionId: 501,
    status: "SCHEDULED",
    category: "FOOD_SCRAPS",
    estimatedWeight: 14.5,
    pickupAddress: "452 Oak Tree Lane, Austin, TX",
    latitude: 30.2672,
    longitude: -97.7431,
    scheduledTime: "2026-09-28T14:00:00Z",
    createdAt: "2026-09-28T10:30:00Z",
    notes: "Gate code #4491. Bin placed near front porch.",
  },
  {
    id: 902,
    wasteSubmissionId: 502,
    status: "SCHEDULED",
    category: "YARD_WASTE",
    estimatedWeight: 8.2,
    pickupAddress: "452 Oak Tree Lane, Austin, TX",
    latitude: 30.2672,
    longitude: -97.7431,
    scheduledTime: "2026-10-01T09:30:00Z",
    createdAt: "2026-09-30T08:15:00Z",
    notes: "Leave in driveway.",
  },
  {
    id: 903,
    wasteSubmissionId: 503,
    status: "REQUESTED",
    category: "AGRICULTURAL_ORGANIC",
    estimatedWeight: 18.0,
    pickupAddress: "810 Evergreen Terrace, Austin, TX",
    latitude: 30.275,
    longitude: -97.74,
    scheduledTime: "2026-10-02T10:00:00Z",
    createdAt: "2026-10-01T09:00:00Z",
    notes: "Call on arrival.",
  },
];

const MOCK_COLLECTION_ROUTES = [
  {
    id: 401,
    farmerId: 202,
    farmerName: "Marcus Aurelius Farm",
    farmerAddress: "Route 9 Valley Farmstead, Austin, TX",
    farmerLatitude: 30.25,
    farmerLongitude: -97.76,
    routeDate: "2026-10-01",
    status: "IN_PROGRESS",
    totalDistanceKm: 8.4,
    totalEstimatedWeightKg: 32.5,
    notes: "Morning organic collection loop",
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:30:00Z",
    stops: [
      {
        id: 701,
        pickupId: 901,
        stopOrder: 1,
        status: "IN_PROGRESS",
        pickupAddress: "452 Oak Tree Lane, Austin, TX",
        category: "FOOD_SCRAPS",
        estimatedWeight: 14.5,
        estimatedDistanceFromPrevKm: 2.1,
        latitude: 30.2672,
        longitude: -97.7431,
        notes: "Gate code #4491. Bin placed near front porch.",
      },
      {
        id: 702,
        pickupId: 902,
        stopOrder: 2,
        status: "PENDING",
        pickupAddress: "124 Magnolia Blvd, Austin, TX",
        category: "AGRICULTURAL_ORGANIC",
        estimatedWeight: 18.0,
        estimatedDistanceFromPrevKm: 3.4,
        latitude: 30.26,
        longitude: -97.75,
        notes: "Call on arrival.",
      },
    ],
  },
];

const MOCK_LEDGER_TRANSACTIONS = [
  {
    id: 1001,
    txHash: "0x8f2a71d0e498c391",
    transactionType: "REWARD_MINTED",
    direction: "CREDIT",
    amount: 25.0,
    balanceAfter: 350.0,
    createdAt: "2026-09-28T14:05:00Z",
    description: "Doorstep Weigh-In Certified: 14.5 kg Kitchen Organics",
  },
  {
    id: 1002,
    txHash: "0x3e1b99af2810d912",
    transactionType: "MARKETPLACE_PURCHASE",
    direction: "DEBIT",
    amount: -45.0,
    balanceAfter: 325.0,
    createdAt: "2026-09-26T16:20:00Z",
    description: "Redemption: Certified Organic Compost (3 units)",
  },
  {
    id: 1003,
    txHash: "0x1a99cd44fe2081aa",
    transactionType: "REWARD_MINTED",
    direction: "CREDIT",
    amount: 50.0,
    balanceAfter: 370.0,
    createdAt: "2026-09-20T11:00:00Z",
    description: "Doorstep Weigh-In Certified: 22.0 kg Crop Residue",
  },
  {
    id: 1004,
    txHash: "0x7c38ba11cd0951ee",
    transactionType: "ORDER_REFUND",
    direction: "CREDIT",
    amount: 15.0,
    balanceAfter: 320.0,
    createdAt: "2026-09-18T09:45:00Z",
    description: "Adjudicated Refund: Damaged packaging on seed shipment #104",
  },
];

const MOCK_ORDERS = [
  {
    id: 101,
    userId: 101,
    status: "PLACED",
    totalTokens: 45.0,
    deliveryAddress: "452 Oak Tree Lane, Austin, TX",
    createdAt: "2026-09-29T15:40:00Z",
    items: [
      {
        id: 1,
        productId: 1,
        productName: "Certified Organic Compost",
        quantity: 2,
        unitPrice: 15.0,
      },
      {
        id: 2,
        productId: 3,
        productName: "Microbial Compost Tea Concentrate",
        quantity: 1,
        unitPrice: 15.0,
      },
    ],
  },
  {
    id: 102,
    userId: 101,
    status: "COMPLETED",
    totalTokens: 25.5,
    deliveryAddress: "452 Oak Tree Lane, Austin, TX",
    createdAt: "2026-09-25T11:20:00Z",
    items: [
      {
        id: 3,
        productId: 2,
        productName: "Heirloom Tomato Seedlings",
        quantity: 3,
        unitPrice: 8.5,
      },
    ],
  },
];

async function captureAll() {
  console.log("🚀 Launching Chromium for comprehensive UI screenshot suite...");
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Helper to setup mock routing for a specific user role
  async function setupMockRoutes(currentUser) {
    await page.unrouteAll({ behavior: "ignoreErrors" });

    // Auth endpoints
    await page.route("**/api/auth/refresh", async (route) => {
      if (currentUser) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ accessToken: `mock-token-${currentUser.role}` }),
        });
      } else {
        await route.fulfill({ status: 401, body: JSON.stringify({ error: "Unauthorized" }) });
      }
    });

    await page.route("**/api/auth/me", async (route) => {
      if (currentUser) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentUser),
        });
      } else {
        await route.fulfill({ status: 401, body: JSON.stringify({ error: "Unauthorized" }) });
      }
    });

    // Marketplace products endpoint
    await page.route("**/marketplace/products*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: MOCK_PRODUCTS,
          totalElements: MOCK_PRODUCTS.length,
          totalPages: 1,
          size: 20,
          number: 0,
        }),
      });
    });

    // Single product detail
    await page.route("**/marketplace/products/*", async (route) => {
      const url = route.request().url();
      const parts = url.split("/");
      const id = parseInt(parts[parts.length - 1], 10) || 1;
      const product = MOCK_PRODUCTS.find((p) => p.id === id) || MOCK_PRODUCTS[0];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(product),
      });
    });

    // Household APIs via BFF proxy or direct
    await page.route("**/api/proxy/household/balance**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_HOUSEHOLD_BALANCE),
      });
    });

    await page.route("**/api/proxy/household/submissions**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SUBMISSIONS),
      });
    });

    await page.route("**/api/proxy/household/ledger**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_LEDGER_TRANSACTIONS),
      });
    });

    await page.route("**/api/proxy/pickups**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PICKUPS),
      });
    });

    await page.route("**/api/proxy/pickups/*/handshake/pass**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pickupId: 902,
          passCode: "ECO-9921-PASS",
          expiresAt: Date.now() + 3600000,
          compactQr: {
            pId: 902,
            code: "ECO-9921-PASS",
            sig: "hmac-sha256-verified-77af92",
          },
        }),
      });
    });

    // Farmer APIs via BFF proxy
    await page.route("**/api/proxy/farmer/pickups/available**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PICKUPS),
      });
    });

    await page.route("**/api/proxy/farmer/routes/active**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_COLLECTION_ROUTES),
      });
    });

    await page.route("**/api/proxy/farmer/products**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PRODUCTS.slice(0, 3)),
      });
    });

    await page.route("**/api/proxy/farmer/orders**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ORDERS),
      });
    });

    // Orders APIs via BFF proxy
    await page.route("**/api/proxy/orders", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ORDERS),
      });
    });

    await page.route("**/api/proxy/orders/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ORDERS[0]),
      });
    });
  }

  // ==========================================
  // SECTION 1: WEB UI - PUBLIC / UNAUTHENTICATED
  // ==========================================
  console.log("📸 [1/34] Capturing Web Landing Page...");
  await setupMockRoutes(null);
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "01_web_landing.png"), fullPage: true });

  console.log("📸 [2/34] Capturing Web Login Page...");
  await page.goto("http://localhost:3100/auth/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "02_web_login.png"), fullPage: true });

  console.log("📸 [3/34] Capturing Web Register Page...");
  await page.goto("http://localhost:3100/auth/register", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "03_web_register.png"), fullPage: true });

  console.log("📸 [4/34] Capturing Web Marketplace (Public)...");
  await page.goto("http://localhost:3100/marketplace", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "04_web_marketplace_public.png"), fullPage: true });

  console.log("📸 [5/34] Capturing Web Product Detail...");
  await page.goto("http://localhost:3100/marketplace/1", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "05_web_product_detail.png"), fullPage: true });

  console.log("📸 [6/34] Capturing Web Cart Drawer...");
  await page.evaluate(() => {
    localStorage.setItem(
      "agroloop_cart_items",
      JSON.stringify([
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ])
    );
  });
  await page.goto("http://localhost:3100/marketplace", { waitUntil: "networkidle" });
  const cartBtn = page.getByRole("button", { name: "Open Shopping Cart" });
  if (await cartBtn.isVisible()) {
    await cartBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(WEB_DIR, "06_web_cart_drawer.png"), fullPage: true });

  console.log("📸 [7/34] Capturing Access Denied: Household (Unauthenticated)...");
  await page.goto("http://localhost:3100/household", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "07_web_access_denied_household.png"), fullPage: true });

  console.log("📸 [8/34] Capturing Access Denied: Farmer (Unauthenticated)...");
  await page.goto("http://localhost:3100/farmer", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "08_web_access_denied_farmer.png"), fullPage: true });

  console.log("📸 [9/34] Capturing Access Denied: Admin (Unauthenticated)...");
  await page.goto("http://localhost:3100/admin", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "09_web_access_denied_admin.png"), fullPage: true });

  // ==========================================
  // SECTION 2: WEB UI - LOGGED IN AS HOUSEHOLD
  // ==========================================
  console.log("📸 [10/34] Capturing Household Dashboard (Logged In)...");
  await setupMockRoutes(MOCK_HOUSEHOLD_USER);
  await page.goto("http://localhost:3100/household", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "10_web_household_dashboard.png"), fullPage: true });

  console.log("📸 [11/34] Capturing Household Submit Waste Form...");
  await page.goto("http://localhost:3100/household/submit", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "11_web_household_submit_waste.png"), fullPage: true });

  console.log("📸 [12/34] Capturing Household Pickups & Tracker...");
  await page.goto("http://localhost:3100/household/pickups", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "12_web_household_pickups.png"), fullPage: true });

  console.log("📸 [13/34] Capturing Household QR Pickup Pass Modal...");
  const qrBtn = page.getByRole("button", { name: /View QR Pickup Pass/i }).first();
  if (await qrBtn.isVisible()) {
    await qrBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(WEB_DIR, "13_web_household_qr_pass_modal.png"), fullPage: true });

  console.log("📸 [14/34] Capturing Household Token Ledger...");
  await page.goto("http://localhost:3100/household/ledger", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "14_web_household_ledger.png"), fullPage: true });

  console.log("📸 [15/34] Capturing Marketplace (Logged In as Household)...");
  await page.goto("http://localhost:3100/marketplace", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "15_web_household_marketplace.png"), fullPage: true });

  console.log("📸 [16/34] Capturing Checkout Review & Solvency Check...");
  await page.goto("http://localhost:3100/marketplace/checkout", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "16_web_household_checkout.png"), fullPage: true });

  console.log("📸 [17/34] Capturing Household Marketplace Orders...");
  await page.goto("http://localhost:3100/orders", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "17_web_household_orders.png"), fullPage: true });

  console.log("📸 [18/34] Capturing Household Order Details & Proof...");
  await page.goto("http://localhost:3100/orders/101", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "18_web_household_order_detail.png"), fullPage: true });

  // ==========================================
  // SECTION 3: WEB UI - LOGGED IN AS FARMER
  // ==========================================
  console.log("📸 [19/34] Capturing Farmer Hub (Logged In)...");
  await setupMockRoutes(MOCK_FARMER_USER);
  await page.goto("http://localhost:3100/farmer", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "19_web_farmer_dashboard.png"), fullPage: true });

  console.log("📸 [20/34] Capturing Farmer Pickups & Claim Queue...");
  await page.goto("http://localhost:3100/farmer/pickups", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "20_web_farmer_pickups.png"), fullPage: true });

  console.log("📸 [21/34] Capturing Farmer On-Site Verification Modal...");
  const verifyBtn = page.getByRole("button", { name: /Arrived & Weigh In|Verify On-Site/i }).first();
  if (await verifyBtn.isVisible()) {
    await verifyBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(WEB_DIR, "21_web_farmer_verify_modal.png"), fullPage: true });

  console.log("📸 [22/34] Capturing Farmer Product Catalog Management...");
  await page.goto("http://localhost:3100/farmer/products", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "22_web_farmer_products.png"), fullPage: true });

  console.log("📸 [23/34] Capturing Farmer List New Product Modal...");
  const newProductBtn = page.getByRole("button", { name: /\+ List New Product/i });
  if (await newProductBtn.isVisible()) {
    await newProductBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(WEB_DIR, "23_web_farmer_new_product_modal.png"), fullPage: true });

  console.log("📸 [24/34] Capturing Farmer Customer Orders Fulfillment...");
  await page.goto("http://localhost:3100/farmer/orders", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "24_web_farmer_orders.png"), fullPage: true });

  console.log("📸 [25/34] Capturing Marketplace (Logged In as Farmer)...");
  await page.goto("http://localhost:3100/marketplace", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "25_web_farmer_marketplace.png"), fullPage: true });

  // ==========================================
  // SECTION 4: WEB UI - LOGGED IN AS ADMIN
  // ==========================================
  console.log("📸 [26/34] Capturing Web Admin Platform Governance Console...");
  await setupMockRoutes(MOCK_ADMIN_USER);
  await page.goto("http://localhost:3100/admin", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(WEB_DIR, "26_web_admin_portal.png"), fullPage: true });

  // ==========================================
  // SECTION 5: DESKTOP OPERATOR WORKSTATION (port 1420)
  // ==========================================
  console.log("📸 [27/34] Capturing Desktop Access Gate (Unauthenticated)...");
  await page.unrouteAll({ behavior: "ignoreErrors" });

  await page.route("**/api/v1/auth/me", async (route) => {
    await route.fulfill({ status: 401, body: JSON.stringify({ message: "Unauthorized" }) });
  });

  await page.goto("http://localhost:1420/", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(DESKTOP_DIR, "27_desktop_access_gate.png") });

  console.log("📸 [28/34] Capturing Desktop Operator Authentication Modal...");
  const authSessionBtn = page.getByRole("button", { name: /Authenticate Operator Session/i });
  if (await authSessionBtn.isVisible()) {
    await authSessionBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(DESKTOP_DIR, "28_desktop_auth_modal.png") });

  // Setup Operator Authenticated mocks
  const setupDesktopOperatorMocks = async () => {
    await page.unrouteAll({ behavior: "ignoreErrors" });

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          name: "Eleanor Vance",
          email: "admin@agroloop.com",
          role: "ROLE_ADMIN",
          enabled: true,
        }),
      });
    });

    await page.route("**/api/v1/admin/solvency", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalTokensMinted: "148,250.00",
          totalWasteCollectedKg: "74,125.00",
          totalProductsSettled: "112,400.00",
          backingReserveRatio: "1.32",
          solvencyStatus: "OPTIMAL",
          auditTimestamp: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/v1/admin/users*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            name: "Eleanor Vance",
            email: "admin@agroloop.com",
            role: "ROLE_ADMIN",
            enabled: true,
            createdAt: "2026-01-10T08:00:00Z",
          },
          {
            id: 2,
            name: "Marcus Aurelius Farms",
            email: "marcus@aureliusfarms.org",
            role: "ROLE_FARMER",
            enabled: true,
            createdAt: "2026-02-14T09:30:00Z",
          },
          {
            id: 3,
            name: "Sarah Connor",
            email: "sarah.connor@household.org",
            role: "ROLE_HOUSEHOLD",
            enabled: true,
            createdAt: "2026-03-01T12:15:00Z",
          },
          {
            id: 4,
            name: "Green Valley Cooperatives",
            email: "contact@greenvalley.org",
            role: "ROLE_FARMER",
            enabled: true,
            createdAt: "2026-03-15T10:00:00Z",
          },
        ]),
      });
    });

    await page.route("**/api/v1/admin/orders*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 101,
            userId: 3,
            customerName: "Sarah Connor",
            status: "DISPUTED",
            totalTokens: 45.0,
            deliveryAddress: "452 Oak Tree Lane, Austin, TX",
            disputeReason: "Package seal broken upon delivery; partial content missing.",
            createdAt: "2026-09-29T15:40:00Z",
            items: [
              {
                id: 1,
                productName: "Certified Organic Compost",
                quantity: 2,
                unitPrice: 15.0,
              },
            ],
          },
          {
            id: 102,
            userId: 3,
            customerName: "Sarah Connor",
            status: "COMPLETED",
            totalTokens: 25.5,
            deliveryAddress: "452 Oak Tree Lane, Austin, TX",
            createdAt: "2026-09-25T11:20:00Z",
            items: [
              {
                id: 2,
                productName: "Heirloom Tomato Seedlings",
                quantity: 3,
                unitPrice: 8.5,
              },
            ],
          },
        ]),
      });
    });

    await page.route("**/api/v1/admin/ledger*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: 9812,
              txHash: "0x8f2a71d0e498c391",
              transactionType: "REWARD_MINTED",
              direction: "CREDIT",
              amount: 25.0,
              balanceAfter: 148250.0,
              createdAt: "2026-09-30T09:12:00Z",
              description: "Doorstep Weigh-In Certified: 14.5 kg Kitchen Organics",
            },
            {
              id: 9811,
              txHash: "0x3e1b99af2810d912",
              transactionType: "MARKETPLACE_PURCHASE",
              direction: "DEBIT",
              amount: -45.0,
              balanceAfter: 148225.0,
              createdAt: "2026-09-30T08:50:00Z",
              description: "Redemption: Certified Organic Compost (3 units)",
            },
            {
              id: 9810,
              txHash: "0x77c2e0b19283f510",
              transactionType: "RESERVE_REBALANCE",
              direction: "CREDIT",
              amount: 500.0,
              balanceAfter: 148270.0,
              createdAt: "2026-09-29T18:00:00Z",
              description: "Municipal Organic Subsidy Reserve Allocation",
            },
          ],
          totalElements: 3,
          totalPages: 1,
          size: 20,
          number: 0,
        }),
      });
    });

    await page.route("**/api/v1/pickups*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 901,
            wasteSubmissionId: 501,
            status: "CLAIMED",
            pickupAddress: "452 Oak Tree Lane, Austin, TX",
            scheduledTime: "2026-09-30T14:00:00Z",
            createdAt: "2026-09-30T08:00:00Z",
          },
          {
            id: 902,
            wasteSubmissionId: 502,
            status: "SCHEDULED",
            pickupAddress: "782 Pinecrest Blvd, Austin, TX",
            scheduledTime: "2026-10-01T10:00:00Z",
            createdAt: "2026-09-30T09:15:00Z",
          },
          {
            id: 903,
            wasteSubmissionId: 503,
            status: "VERIFIED",
            pickupAddress: "12 Greenway Terrace, Austin, TX",
            scheduledTime: "2026-09-29T16:30:00Z",
            createdAt: "2026-09-29T11:00:00Z",
          },
        ]),
      });
    });
  };

  console.log("📸 [29/34] Capturing Desktop Solvency Audit Dashboard...");
  await setupDesktopOperatorMocks();
  await page.goto("http://localhost:1420/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(DESKTOP_DIR, "29_desktop_solvency_audit.png") });

  console.log("📸 [30/34] Capturing Desktop User Governance...");
  const governanceTab = page.getByRole("button", { name: /User Governance/i });
  if (await governanceTab.isVisible()) {
    await governanceTab.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(DESKTOP_DIR, "30_desktop_user_governance.png") });

  console.log("📸 [31/34] Capturing Desktop Marketplace & Disputes...");
  const disputesTab = page.getByRole("button", { name: /Marketplace & Disputes/i });
  if (await disputesTab.isVisible()) {
    await disputesTab.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(DESKTOP_DIR, "31_desktop_marketplace_disputes.png") });

  console.log("📸 [32/34] Capturing Desktop Ledger Explorer...");
  const ledgerTab = page.getByRole("button", { name: /Ledger Explorer/i });
  if (await ledgerTab.isVisible()) {
    await ledgerTab.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(DESKTOP_DIR, "32_desktop_ledger_explorer.png") });

  console.log("📸 [33/34] Capturing Desktop Fleet Logistics Telemetry...");
  const fleetTab = page.getByRole("button", { name: /Fleet Logistics Telemetry/i });
  if (await fleetTab.isVisible()) {
    await fleetTab.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(DESKTOP_DIR, "33_desktop_fleet_telemetry.png") });

  console.log("📸 [34/34] Capturing Desktop Server Manager Profile Modal...");
  const serverPill = page.locator('[data-testid="header-server-profile-btn"]');
  if (await serverPill.isVisible()) {
    await serverPill.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(DESKTOP_DIR, "34_desktop_server_manager.png") });

  await browser.close();
  console.log("✨ All 34 screenshots captured successfully!");
}

captureAll().catch((err) => {
  console.error("❌ Error capturing screenshots:", err);
  process.exit(1);
});
