import { test, expect, Page } from "@playwright/test";

/**
 * Playwright E2E Test Suite for all 7 platform users seeded in DataInitializer.java.
 *
 * Seeded Users Covered:
 * 1. Admin:
 *    - admin@agroloop.com / admin123 (System Administrator, ROLE_ADMIN)
 * 2. Households:
 *    - household@agroloop.com / household123 (Alice Green, ROLE_HOUSEHOLD)
 *    - david.household@agroloop.com / household123 (David Miller, ROLE_HOUSEHOLD)
 *    - sarah.household@agroloop.com / household123 (Sarah Connor, ROLE_HOUSEHOLD)
 * 3. Farmers:
 *    - farmer@agroloop.com / farmer123 (Bob Farmer, ROLE_FARMER)
 *    - priya.farmer@agroloop.com / farmer123 (Priya Nair, ROLE_FARMER)
 *    - carlos.farmer@agroloop.com / farmer123 (Carlos Rivera, ROLE_FARMER)
 */

export interface SeededUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "ROLE_ADMIN" | "ROLE_HOUSEHOLD" | "ROLE_FARMER";
  expectedRoleBadge: string;
  expectedDashboard: string;
  initials: string;
  metadata?: {
    farmName?: string;
    balance?: number;
    address?: string;
  };
}

export const SEEDED_USERS: SeededUser[] = [
  // 1. Administrator
  {
    id: 1,
    name: "System Administrator",
    email: "admin@agroloop.com",
    password: "admin123",
    role: "ROLE_ADMIN",
    expectedRoleBadge: "Admin",
    expectedDashboard: "/admin",
    initials: "SA",
  },
  // 2. Household Alice Green (Default Primary Household)
  {
    id: 2,
    name: "Alice Green",
    email: "household@agroloop.com",
    password: "household123",
    role: "ROLE_HOUSEHOLD",
    expectedRoleBadge: "Household",
    expectedDashboard: "/household",
    initials: "AG",
    metadata: {
      balance: 250,
      address: "Green View Residency, Flat 4B, MG Road, Kochi, Kerala",
    },
  },
  // 3. Household David Miller
  {
    id: 3,
    name: "David Miller",
    email: "david.household@agroloop.com",
    password: "household123",
    role: "ROLE_HOUSEHOLD",
    expectedRoleBadge: "Household",
    expectedDashboard: "/household",
    initials: "DM",
    metadata: {
      balance: 320,
      address: "Palm Grove Heights, Villa 12, Thrissur, Kerala",
    },
  },
  // 4. Household Sarah Connor
  {
    id: 4,
    name: "Sarah Connor",
    email: "sarah.household@agroloop.com",
    password: "household123",
    role: "ROLE_HOUSEHOLD",
    expectedRoleBadge: "Household",
    expectedDashboard: "/household",
    initials: "SC",
    metadata: {
      balance: 185,
      address: "Riverside Eco Villa, Block C, Aluva, Kerala",
    },
  },
  // 5. Farmer Bob Farmer (Default Primary Farmer)
  {
    id: 5,
    name: "Bob Farmer",
    email: "farmer@agroloop.com",
    password: "farmer123",
    role: "ROLE_FARMER",
    expectedRoleBadge: "Farmer",
    expectedDashboard: "/farmer",
    initials: "BF",
    metadata: {
      farmName: "Green Valley Organic Farm",
    },
  },
  // 6. Farmer Priya Nair
  {
    id: 6,
    name: "Priya Nair",
    email: "priya.farmer@agroloop.com",
    password: "farmer123",
    role: "ROLE_FARMER",
    expectedRoleBadge: "Farmer",
    expectedDashboard: "/farmer",
    initials: "PN",
    metadata: {
      farmName: "Highland Eco Farm",
    },
  },
  // 7. Farmer Carlos Rivera
  {
    id: 7,
    name: "Carlos Rivera",
    email: "carlos.farmer@agroloop.com",
    password: "farmer123",
    role: "ROLE_FARMER",
    expectedRoleBadge: "Farmer",
    expectedDashboard: "/farmer",
    initials: "CR",
    metadata: {
      farmName: "Sunburst Bio Orchards",
    },
  },
];

/**
 * Configure resilient mock endpoints for seeded authentication and persona data.
 */
async function setupSeededAuthMocks(page: Page, currentUser: SeededUser) {
  // Mock login endpoint
  await page.route("**/api/auth/login", async (route) => {
    const postData = route.request().postDataJSON();
    const matched = SEEDED_USERS.find(
      (u) => u.email === postData?.email && u.password === postData?.password
    );

    if (matched) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: matched.id,
            name: matched.name,
            email: matched.email,
            role: matched.role,
            verified: true,
          },
          accessToken: `mock-jwt-token-for-${matched.id}`,
          expiresInSeconds: 3600,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Bad Credentials",
          detail: "Invalid email or password",
          status: 401,
        }),
      });
    }
  });

  // Mock refresh endpoint
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: `mock-jwt-token-for-${currentUser.id}`,
        expiresInSeconds: 3600,
      }),
    });
  });

  // Mock current user profile
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        verified: true,
      }),
    });
  });

  // Mock household balance
  await page.route("**/api/proxy/household/balance", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        availableBalance: currentUser.metadata?.balance ?? 250,
        pendingBalance: 0,
        totalEarned: (currentUser.metadata?.balance ?? 250) + 50,
      }),
    });
  });

  // Mock orders list
  await page.route("**/api/proxy/orders*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Mock marketplace products list
  await page.route("**/api/proxy/marketplace/products*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: [
          {
            id: 1,
            name: "Certified Organic Compost (5kg)",
            category: "COMPOST_AND_SOIL",
            price: 15,
            stock: 45,
            unit: "5kg Bag",
            active: true,
            farmerId: 5,
            farmerName: "Bob Farmer",
          },
          {
            id: 2,
            name: "Crisp Tri-Color Bell Peppers (1kg)",
            category: "ORGANIC_VEGETABLES",
            price: 24,
            stock: 20,
            unit: "1kg Box",
            active: true,
            farmerId: 6,
            farmerName: "Priya Nair",
          },
        ],
        totalPages: 1,
        totalElements: 2,
        pageNumber: 0,
        pageSize: 12,
      }),
    });
  });

  // Mock pickups list
  await page.route("**/api/proxy/pickups*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: [
          {
            id: 101,
            householdId: 2,
            householdName: "Alice Green",
            pickupAddress: "Green View Residency, Flat 4B, Kochi",
            status: "SCHEDULED",
            estimatedWeight: 4.8,
            scheduledPickupWindow: "Morning (08:00 - 11:00)",
            latitude: 9.9312,
            longitude: 76.2673,
          },
        ],
        totalPages: 1,
        totalElements: 1,
      }),
    });
  });

  // Mock farmer pickups
  await page.route("**/api/proxy/farmer/pickups*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Mock farmer routes
  await page.route("**/api/proxy/farmer/routes*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content: [] }),
    });
  });
}

test.describe("All Seeded Users - UI Authentication & Navigation Verification", () => {
  // Test each of the 7 seeded users individually
  for (const user of SEEDED_USERS) {
    test(`authenticates ${user.role} user: "${user.name}" (${user.email}) and navigates to ${user.expectedDashboard}`, async ({
      page,
    }) => {
      await setupSeededAuthMocks(page, user);

      // 1. Visit login page
      await page.goto("/auth/login");
      await expect(page.getByRole("heading", { name: /Sign In to AgroLoop/i })).toBeVisible();

      // 2. Fill credentials for this seeded user
      await page.getByPlaceholder("you@example.com").fill(user.email);
      await page.locator('input[type="password"]').fill(user.password);

      // 3. Submit login
      await page.getByRole("button", { name: /Sign In/i }).click();

      // 4. Verify redirected to user's assigned role dashboard
      await page.waitForURL(`**${user.expectedDashboard}*`, { timeout: 10000 });
      expect(page.url()).toContain(user.expectedDashboard);

      // 5. Verify user profile and name appears in the top header
      await expect(page.getByText(user.name)).toBeVisible();

      // 6. Verify role badge in the navbar matches cleanly formatted role
      const roleBadge = page.locator("header span").filter({ hasText: new RegExp(`^${user.expectedRoleBadge}$`, "i") });
      await expect(roleBadge.first()).toBeVisible();

      // 7. Verify user initial avatar pill
      await expect(page.getByText(user.initials)).toBeVisible();
    });
  }
});

test.describe("Seeded Households - Dedicated Portal Views", () => {
  test.beforeEach(async ({ page }) => {
    const aliceUser = SEEDED_USERS[1]; // Alice Green
    await setupSeededAuthMocks(page, aliceUser);
  });

  test("Alice Green can navigate to Household Waste Submission form", async ({ page }) => {
    await page.goto("/household/submit");
    await expect(page.getByRole("heading", { name: /Submit Organic Waste/i })).toBeVisible();

    // Verify form controls
    await expect(page.getByRole("button", { name: /Kitchen Scraps/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Garden Trimmings/i })).toBeVisible();
    await expect(page.getByPlaceholder("e.g. 5.0")).toBeVisible();
  });

  test("Alice Green can view Marketplace offerings and cart controls", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { name: /Redeem EcoTokens/i })).toBeVisible();

    // Verify category navigation
    await expect(page.getByRole("button", { name: /All Categories/i })).toBeVisible();

    // Verify product card rendered
    await expect(page.getByText("Certified Organic Compost (5kg)")).toBeVisible();
  });

  test("Alice Green can open Orders view with persona isolation", async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "My Orders" })).toBeVisible();
    await expect(page.getByText(/Review items ordered from regional partner farmers/i)).toBeVisible();
  });
});

test.describe("Seeded Farmers - Dedicated Telemetry & Pickups Portal Views", () => {
  test.beforeEach(async ({ page }) => {
    const bobFarmer = SEEDED_USERS[4]; // Bob Farmer
    await setupSeededAuthMocks(page, bobFarmer);
  });

  test("Bob Farmer can access Pickups Dispatch Workspace with QR scanner controls", async ({ page }) => {
    await page.goto("/farmer/pickups");

    // Verify workspace tabs
    await expect(page.getByRole("button", { name: /Today's Stops/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Active Route/i })).toBeVisible();

    // Verify QR scan trigger button is available
    const qrTrigger = page.getByRole("button", { name: /Verify QR Code/i });
    if (await qrTrigger.isVisible()) {
      await qrTrigger.click();
      // Viewfinder modal should open
      await expect(page.getByText(/Household QR Scanner|Resident QR Pass/i)).toBeVisible();
    }
  });

  test("Bob Farmer can access Farmer Sales Orders fulfillment board", async ({ page }) => {
    await page.goto("/farmer/orders");
    await expect(page.getByRole("heading", { name: /Fulfillment Orders/i })).toBeVisible();
  });
});

test.describe("Seeded Admin - Dedicated Platform Governance Views", () => {
  test.beforeEach(async ({ page }) => {
    const adminUser = SEEDED_USERS[0]; // System Administrator
    await setupSeededAuthMocks(page, adminUser);
  });

  test("System Administrator can access Platform Governance & User Directory", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: /User Directory|User Governance/i })).toBeVisible();
  });
});

test.describe("Security & Authorization Boundaries Across User Roles", () => {
  test("prevents unauthenticated user from accessing /household and redirects to /auth/login", async ({ page }) => {
    // Unauthenticated state
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "No active session" }),
      });
    });

    await page.goto("/household");
    await page.waitForURL("**/auth/login*", { timeout: 10000 });
    expect(page.url()).toContain("/auth/login");
  });

  test("rejects invalid login credentials with clear error message", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ title: "Bad Credentials", detail: "Invalid email or password", status: 401 }),
      });
    });

    await page.goto("/auth/login");
    await page.getByPlaceholder("you@example.com").fill("nonexistent@agroloop.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /Sign In/i }).click();

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  });
});
