import { test, expect } from "@playwright/test";

test.describe("Desktop UI - Operator Console & Governance Roles", () => {
  test("shows operator authentication gate when unauthenticated", async ({ page }) => {
    // Intercept auth/me with 401 unauthenticated
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({ status: 401, body: JSON.stringify({ message: "Unauthorized" }) });
    });

    await page.goto("/");

    // Verify Access Gate
    await expect(page.getByText("Privileged Operator Access Required")).toBeVisible();
    await expect(page.getByRole("button", { name: /Authenticate Operator Session/i })).toBeVisible();

    // Click to open Authorize Operator modal
    await page.getByRole("button", { name: /Authenticate Operator Session/i }).click();

    // Verify Modal elements
    await expect(page.getByRole("heading", { name: "Operator Authentication" })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Authorize Operator" })).toBeVisible();
  });

  test("authenticates operator and displays formatted role 'Admin' in header", async ({ page }) => {
    // Mock successful authentication
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          name: "System Admin",
          email: "admin@agroloop.com",
          role: "ROLE_ADMIN",
          enabled: true,
        }),
      });
    });

    // Mock Solvency Audit endpoint
    await page.route("**/api/v1/admin/solvency", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalTokensMinted: "10000.00",
          totalWasteCollectedKg: "5000.00",
          totalProductsSettled: "2500.00",
          backingReserveRatio: "1.25",
          solvencyStatus: "OPTIMAL",
          auditTimestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/");

    // Operator header should display user name and clean role 'Admin'
    await expect(page.getByText("System Admin")).toBeVisible();
    const headerRoleBadge = page.locator("header span").filter({ hasText: /^Admin$/ });
    await expect(headerRoleBadge).toBeVisible();
    await expect(page.locator("header").getByText("ROLE_ADMIN")).not.toBeVisible();

    // Verify Sidebar navigation is available
    await expect(page.getByRole("button", { name: /Solvency Audit/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /User Governance/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Marketplace & Disputes/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ledger Explorer/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fleet Logistics Telemetry/i })).toBeVisible();
  });

  test("renders User Governance role badges as 'Farmer', 'Household', and 'Admin'", async ({ page }) => {
    // Mock admin session
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          name: "Admin Operator",
          email: "admin@agroloop.com",
          role: "ROLE_ADMIN",
          enabled: true,
        }),
      });
    });

    // Mock User Governance users list with diverse roles
    await page.route("**/api/v1/admin/users*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            name: "Eleanor Admin",
            email: "eleanor@agroloop.com",
            role: "ROLE_ADMIN",
            enabled: true,
            createdAt: "2026-01-01T00:00:00Z",
          },
          {
            id: 2,
            name: "Farmer John",
            email: "john@farm.org",
            role: "ROLE_FARMER",
            enabled: true,
            createdAt: "2026-02-01T00:00:00Z",
          },
          {
            id: 3,
            name: "Household Mary",
            email: "mary@home.org",
            role: "ROLE_HOUSEHOLD",
            enabled: true,
            createdAt: "2026-03-01T00:00:00Z",
          },
        ]),
      });
    });

    await page.goto("/");

    // Navigate to User Governance tab
    await page.getByRole("button", { name: /User Governance/i }).click();

    // Verify user table headers
    await expect(page.getByRole("columnheader", { name: "Name / Contact" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Role" })).toBeVisible();

    // Assert that the badges render cleanly as "Admin", "Farmer", "Household"
    const adminBadge = page.locator("table tbody tr td span").filter({ hasText: /^Admin$/ });
    const farmerBadge = page.locator("table tbody tr td span").filter({ hasText: /^Farmer$/ });
    const householdBadge = page.locator("table tbody tr td span").filter({ hasText: /^Household$/ });

    await expect(adminBadge).toBeVisible();
    await expect(farmerBadge).toBeVisible();
    await expect(householdBadge).toBeVisible();

    // Strictly ensure no raw technical ROLE_* identifiers are rendered in the table
    await expect(page.locator("table").getByText("ROLE_ADMIN")).not.toBeVisible();
    await expect(page.locator("table").getByText("ROLE_FARMER")).not.toBeVisible();
    await expect(page.locator("table").getByText("ROLE_HOUSEHOLD")).not.toBeVisible();
  });

  test("opens server manager profile modal and verifies connectivity", async ({ page }) => {
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          name: "Admin Operator",
          email: "admin@agroloop.com",
          role: "ROLE_ADMIN",
          enabled: true,
        }),
      });
    });

    await page.goto("/");

    // Click server profile chip in header
    const serverPill = page.locator('[data-testid="header-server-profile-btn"]');
    await expect(serverPill).toBeVisible();
    await serverPill.click();

    // Verify Server Profiles modal
    await expect(page.getByRole("heading", { name: "Server Manager" })).toBeVisible();
    await expect(page.getByText("Select, verify, and switch authoritative AgroLoop server environments")).toBeVisible();
  });
});
