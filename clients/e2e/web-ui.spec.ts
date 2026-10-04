import { test, expect } from "@playwright/test";

test.describe("Web UI - Navigation, Marketplace & Roles", () => {
  test("loads marketplace page with category pills and search input", async ({ page }) => {
    // Intercept marketplace products API
    await page.route("**/marketplace/products*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: 1,
              name: "Certified Organic Compost",
              category: "COMPOST",
              price: "15.00",
              unit: "KG",
              stock: 50,
              farmerName: "Green Valley Farm",
              rating: 4.8,
            },
            {
              id: 2,
              name: "Heirloom Tomato Seedlings",
              category: "SEEDS",
              price: "8.50",
              unit: "PACK",
              stock: 30,
              farmerName: "Sunrise Organics",
              rating: 4.9,
            },
          ],
          totalElements: 2,
          totalPages: 1,
          size: 20,
          number: 0,
        }),
      });
    });

    await page.goto("/marketplace");

    // Verify Marketplace Header
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Redeem EcoTokens");

    // Verify Category Pills exist
    await expect(page.getByRole("button", { name: "All Categories" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Compost" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Organic Fertilizer" })).toBeVisible();

    // Verify products are rendered
    await expect(page.getByRole("heading", { name: "Certified Organic Compost" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Heirloom Tomato Seedlings" })).toBeVisible();
  });

  test("opens and closes shopping cart drawer", async ({ page }) => {
    await page.goto("/marketplace");

    const cartBtn = page.getByRole("button", { name: "Open Shopping Cart" });
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();

    // Verify Drawer is displayed
    await expect(page.getByRole("heading", { name: /Your Cart/i })).toBeVisible();
    await expect(page.getByText(/Your cart is currently empty/i)).toBeVisible();

    // Close Drawer
    const closeBtn = page.getByRole("button", { name: /Close/i });
    await closeBtn.click();
    await expect(page.getByText(/Your cart is currently empty/i)).not.toBeVisible();
  });

  test("displays user role cleanly as 'Household' in navbar when logged in as household", async ({ page }) => {
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accessToken: "mock-household-token" }),
      });
    });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 101,
          name: "Alice Johnson",
          email: "alice@household.org",
          role: "ROLE_HOUSEHOLD",
          verified: true,
        }),
      });
    });

    await page.goto("/marketplace");

    // Role badge in navbar should say "Household", NOT "ROLE_HOUSEHOLD"
    const roleBadge = page.locator("header span").filter({ hasText: /^Household$/ });
    await expect(roleBadge).toBeVisible();
    await expect(page.getByText("ROLE_HOUSEHOLD")).not.toBeVisible();

    // Verify Household specific navigation links are visible
    await expect(page.getByRole("link", { name: "Household Hub" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Submit Waste" })).toBeVisible();
  });

  test("displays user role cleanly as 'Farmer' in navbar when logged in as farmer", async ({ page }) => {
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accessToken: "mock-farmer-token" }),
      });
    });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 202,
          name: "Bob Builder Farm",
          email: "bob@farmer.org",
          role: "ROLE_FARMER",
          verified: true,
        }),
      });
    });

    await page.goto("/marketplace");

    // Role badge in navbar should say "Farmer", NOT "ROLE_FARMER"
    const roleBadge = page.locator("header span").filter({ hasText: /^Farmer$/ });
    await expect(roleBadge).toBeVisible();
    await expect(page.getByText("ROLE_FARMER")).not.toBeVisible();

    // Verify Farmer specific navigation links are visible
    await expect(page.getByRole("link", { name: "Farmer Hub" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pickup Queue" })).toBeVisible();
  });

  test("displays user role cleanly as 'Admin' in navbar when logged in as admin", async ({ page }) => {
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accessToken: "mock-admin-token" }),
      });
    });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 303,
          name: "Chief Admin",
          email: "admin@agroloop.com",
          role: "ROLE_ADMIN",
          verified: true,
        }),
      });
    });

    await page.goto("/marketplace");

    // Role badge in navbar should say "Admin", NOT "ROLE_ADMIN"
    const roleBadge = page.locator("header span").filter({ hasText: /^Admin$/ });
    await expect(roleBadge).toBeVisible();
    await expect(page.getByText("ROLE_ADMIN")).not.toBeVisible();

    // Verify Admin Portal link is visible
    await expect(page.getByRole("link", { name: /Admin Portal/ })).toBeVisible();
  });

  test("redirects to home '/' route on logout by default", async ({ page }) => {
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accessToken: "mock-household-token" }),
      });
    });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 101,
          name: "Alice Johnson",
          email: "alice@household.org",
          role: "ROLE_HOUSEHOLD",
          verified: true,
        }),
      });
    });

    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/marketplace");

    // Open user menu dropdown
    const userMenuButton = page.getByRole("button", { name: /Alice Johnson/i });
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    // Next refresh call after logout must return unauthenticated
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "No active session" }),
      });
    });

    // Click sign out button
    const signOutBtn = page.getByTestId("navbar-logout-btn");
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Verify redirected to home route '/'
    await page.waitForURL("**/");
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
