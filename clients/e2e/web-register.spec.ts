import { test, expect } from "@playwright/test";

test.describe("Web UI - Household Registration (/auth/register)", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean unauthenticated state for register tests
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "No active session" }),
      });
    });
  });

  test("renders all registration form elements, labels, and placeholders", async ({ page }) => {
    await page.goto("/auth/register");

    // Header & description
    await expect(page.getByRole("heading", { level: 2, name: /Join the Circular Mission/i })).toBeVisible();
    await expect(page.getByText(/Register as a Household composter to earn EcoTokens/i)).toBeVisible();

    // Inputs & labels
    const nameInput = page.getByLabel("Full Name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute("placeholder", "Jane Doe");
    await expect(nameInput).toHaveAttribute("required", "");

    const emailInput = page.getByLabel("Email Address");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("placeholder", "jane@example.com");
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");

    const passwordInput = page.getByLabel(/Password \(min 8 characters\)/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveAttribute("minlength", "8");
    await expect(passwordInput).toHaveAttribute("required", "");

    const addressInput = page.getByLabel("Default Pickup Address");
    await expect(addressInput).toBeVisible();
    await expect(addressInput).toHaveAttribute("placeholder", "123 Green Way, Eco City");
    await expect(addressInput).toHaveAttribute("minlength", "5");
    await expect(addressInput).toHaveAttribute("required", "");

    // Action button
    const submitBtn = page.getByRole("button", { name: /Complete Registration/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // Sign in link
    const signInLink = page.getByRole("link", { name: /Sign In here/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/auth/login");
  });

  test("handles 422 validation failure with field-specific errors from backend", async ({ page }) => {
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          type: "https://agroloop.com/errors/validation-failed",
          title: "Validation Failed",
          status: 422,
          detail: "One or more fields failed validation",
          instance: "/api/v1/auth/register",
          code: "VALIDATION_FAILED",
          fieldErrors: {
            password: "Password must be at least 8 characters",
          },
        }),
      });
    });

    await page.goto("/auth/register");

    await page.getByLabel("Full Name").fill("Agna");
    await page.getByLabel("Email Address").fill("agna@gmail.com");
    await page.getByLabel(/Password \(min 8 characters\)/i).fill("12345678"); // Passes client minlength to reach backend
    await page.getByLabel("Default Pickup Address").fill("Mala, Kerala");

    await page.getByRole("button", { name: /Complete Registration/i }).click();

    // Verify main error banner
    const errorBanner = page.locator("[data-testid='register-error-banner']");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("One or more fields failed validation");

    // Verify field-level error displayed under password input
    const passwordError = page.locator("[data-testid='error-password']");
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toContainText("Password must be at least 8 characters");
  });

  test("displays multiple field-level validation errors simultaneously", async ({ page }) => {
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          type: "https://agroloop.com/errors/validation-failed",
          title: "Validation Failed",
          status: 422,
          detail: "One or more fields failed validation",
          instance: "/api/v1/auth/register",
          code: "VALIDATION_FAILED",
          fieldErrors: {
            name: "Name must be between 2 and 100 characters",
            email: "Invalid email format",
            password: "Password must be at least 8 characters",
            address: "Address must be between 5 and 500 characters",
          },
        }),
      });
    });

    await page.goto("/auth/register");

    await page.getByLabel("Full Name").fill("A");
    await page.getByLabel("Email Address").fill("test@example.com");
    await page.getByLabel(/Password \(min 8 characters\)/i).fill("12345678");
    await page.getByLabel("Default Pickup Address").fill("123 Street");

    await page.getByRole("button", { name: /Complete Registration/i }).click();

    // Verify all field errors appear
    await expect(page.locator("[data-testid='error-name']")).toContainText("Name must be between 2 and 100 characters");
    await expect(page.locator("[data-testid='error-email']")).toContainText("Invalid email format");
    await expect(page.locator("[data-testid='error-password']")).toContainText("Password must be at least 8 characters");
    await expect(page.locator("[data-testid='error-address']")).toContainText("Address must be between 5 and 500 characters");
  });

  test("displays error message when email is already registered", async ({ page }) => {
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Bad Request",
          detail: "An account with this email address already exists.",
          status: 400,
          code: "BAD_REQUEST",
        }),
      });
    });

    await page.goto("/auth/register");

    await page.getByLabel("Full Name").fill("Existing User");
    await page.getByLabel("Email Address").fill("existing@example.com");
    await page.getByLabel(/Password \(min 8 characters\)/i).fill("SecurePassword123!");
    await page.getByLabel("Default Pickup Address").fill("456 Green Way, Eco City");

    await page.getByRole("button", { name: /Complete Registration/i }).click();

    const errorBanner = page.locator("[data-testid='register-error-banner']");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("An account with this email address already exists.");
  });

  test("submits successfully and redirects to household dashboard", async ({ page }) => {
    let registrationPayload: Record<string, unknown> | null = null;

    await page.route("**/api/auth/register", async (route) => {
      const request = route.request();
      registrationPayload = request.postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: {
          "set-cookie": "eco_refresh_token=mock-refresh-token; Path=/; HttpOnly; SameSite=Lax",
        },
        body: JSON.stringify({
          user: {
            id: 101,
            name: "Agna Mariya",
            email: "agna.mariya@example.com",
            role: "ROLE_HOUSEHOLD",
            tokenBalance: 0,
            active: true,
          },
          accessToken: "mock-new-access-token",
          expiresInSeconds: 900,
        }),
      });
    });

    // Mock household dashboard endpoint if needed upon redirect
    await page.route("**/api/household/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tokenBalance: 0,
          totalWasteKg: 0,
          pickupsCompleted: 0,
        }),
      });
    });

    await page.goto("/auth/register");

    await page.getByLabel("Full Name").fill("Agna Mariya");
    await page.getByLabel("Email Address").fill("agna.mariya@example.com");
    await page.getByLabel(/Password \(min 8 characters\)/i).fill("SecurePass123!");
    await page.getByLabel("Default Pickup Address").fill("Mala, Thrissur, Kerala");

    await page.getByRole("button", { name: /Complete Registration/i }).click();

    // Verify submission payload
    expect(registrationPayload).not.toBeNull();
    expect(registrationPayload).toMatchObject({
      name: "Agna Mariya",
      email: "agna.mariya@example.com",
      password: "SecurePass123!",
      address: "Mala, Thrissur, Kerala",
      clientType: "WEB",
    });

    // Verify redirect to household hub
    await page.waitForURL("**/household");
    expect(page.url()).toContain("/household");
  });

  test("navigates to sign in page when clicking 'Sign In here'", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByRole("link", { name: /Sign In here/i }).click();
    await page.waitForURL("**/auth/login");
    expect(page.url()).toContain("/auth/login");
  });
});
