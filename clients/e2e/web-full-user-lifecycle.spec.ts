import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Playwright End-to-End Test Suite: Comprehensive User Lifecycle & Platform Governance
 *
 * Covers:
 * 1. User Registration & Initial Login (Fresh dynamic user)
 * 2. Admin Token Adjustment (Credit EcoTokens with mandatory audit justification)
 * 3. Household Waste Submission & Placement Cancellation
 * 4. Marketplace Shopping & Order Placement
 * 5. Order Cancellation & Atomic Token Refund (with Ledger verification)
 * 6. Household Farmer Conversion Application
 * 7. Admin Farmer Rejection Modal & Approval Governance
 * 8. Admin Direct Conversion (Convert household to farmer without application)
 * 9. Admin User Governance (Disable & Re-enable user)
 * 10. Farmer Catalog Management (Add product, verify in marketplace, delete/deactivate)
 * 11. Farmer Route & Pickups Overview
 */

// Target URL dynamically configurable via PLAYWRIGHT_WEB_URL or default to localhost:3002
const TARGET_URL = process.env.PLAYWRIGHT_WEB_URL || process.env.BASE_URL || "http://localhost:3002";

// Unique credentials generated per test run to guarantee total isolation
const timestamp = Date.now();
const testUser = {
  name: `Lifecycle User ${timestamp.toString().slice(-4)}`,
  email: `e2e_user_${timestamp}@agroloop.com`,
  password: "Password123!",
  address: "74 Green Meadow Way, Kochi, Kerala",
  farmName: `Sunrise Agro ${timestamp.toString().slice(-4)}`,
  farmAddress: "Plot 12, Agro-Corridor, Aluva, Kerala",
};

const directConvertUser = {
  name: `Direct Convert ${timestamp.toString().slice(-4)}`,
  email: `direct_${timestamp}@agroloop.com`,
  password: "Password123!",
  address: "88 Riverside Road, Kochi, Kerala",
};

async function dismissCookieBanner(page: Page) {
  try {
    const acceptBtn = page.getByRole("button", { name: /Accept All/i });
    if (await acceptBtn.isVisible({ timeout: 1500 })) {
      await acceptBtn.click();
    }
  } catch {
    // Ignore if not present
  }
}

async function login(page: Page, email: string, pass: string) {
  await page.goto("/auth/login");
  await dismissCookieBanner(page);
  await page.locator("input[type='email'], input#login-email").fill(email);
  await page.locator("input[type='password'], input#login-password").fill(pass);
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/login") && res.status() === 200, { timeout: 15000 }),
    page.getByRole("button", { name: /Sign In|Authenticating/i }).click(),
  ]);
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 });
}

test.describe.serial("AgroLoop Full End-to-End User Lifecycle & Platform Governance", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      baseURL: TARGET_URL,
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // Step 1: User Registration
  // ---------------------------------------------------------------------------
  test("1. Household user registers successfully with fresh credentials", async () => {
    await page.goto("/auth/register");
    await dismissCookieBanner(page);
    await expect(page.getByRole("heading", { level: 2, name: /Join the Circular Mission/i })).toBeVisible();

    await page.getByLabel("Full Name").fill(testUser.name);
    await page.getByLabel("Email Address").fill(testUser.email);
    await page.getByLabel(/Password \(min 8 characters\)/i).fill(testUser.password);
    await page.getByLabel("Default Pickup Address").fill(testUser.address);

    await page.getByRole("button", { name: /Complete Registration/i }).click();

    // After registration, system redirects to /household or /auth/login
    await page.waitForURL(/(\/household|\/auth\/login)/, { timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // Step 2: Household Login & Dashboard Verification
  // ---------------------------------------------------------------------------
  test("2. Newly registered household logs in and views household dashboard", async () => {
    // If redirected to login, authenticate
    if (page.url().includes("/auth/login")) {
      await login(page, testUser.email, testUser.password);
      await page.waitForURL(/\/household/, { timeout: 15000 });
    }

    await dismissCookieBanner(page);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByText(/Household Dashboard/i).first()).toBeVisible();

    // Verify initial wallet balance is cleanly rendered
    const balanceCard = page.locator("text=Available Balance").first();
    await expect(balanceCard).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Step 3: Admin Grants Token Credit to the New Household
  // ---------------------------------------------------------------------------
  test("3. Admin logs in and credits 250 EcoTokens to the new household", async () => {
    await context.clearCookies();
    await login(page, "admin@agroloop.com", "admin123");
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Switch to User Governance Directory tab
    const usersTab = page.getByRole("button", { name: /User Governance Directory/i });
    if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usersTab.click();
    } else {
      await page.goto("/admin?tab=users");
    }
    await expect(page.getByRole("heading", { name: /User Identity & Access Governance/i })).toBeVisible({ timeout: 15000 });

    // Search for the newly created user
    const searchInput = page.getByPlaceholder(/Search by name, email, or user ID/i);
    await searchInput.fill(testUser.email);
    await page.waitForTimeout(600); // debounce

    // Locate the user's row
    const userRow = page.locator(`tr:has-text("${testUser.email}")`);
    await expect(userRow).toBeVisible({ timeout: 10000 });

    // Click "Adjust" button in the row
    const tokensBtn = userRow.getByRole("button", { name: /Adjust/i });
    await tokensBtn.click();

    // Verify Token Adjustment Modal opens
    await expect(page.getByRole("heading", { name: /Audit-Locked Token Adjustment/i })).toBeVisible();

    // Credit 250 tokens with justification
    const directionSelect = page.locator("select").filter({ hasText: /Credit \(\+\) Tokens/i });
    await directionSelect.selectOption("CREDIT");

    const amountInput = page.locator("input[type='number']");
    await amountInput.fill("250");

    const reasonInput = page.getByPlaceholder(/Compensatory credit/i);
    await reasonInput.fill("E2E full lifecycle test grant");

    await page.getByRole("button", { name: /Apply Token Adjustment/i }).click();

    // Verify confirmation banner in modal
    await expect(page.getByText(/Token Adjustment Processed Successfully/i)).toBeVisible({ timeout: 10000 });

    // Close modal
    await page.getByRole("button", { name: "Close" }).click();
  });

  // ---------------------------------------------------------------------------
  // Step 4: Household Waste Placement & Cancellation
  // ---------------------------------------------------------------------------
  test("4. Household schedules organic waste pickup and cancels it", async () => {
    await context.clearCookies();
    await login(page, testUser.email, testUser.password);
    await page.waitForURL(/\/household/, { timeout: 15000 });

    // Verify credited balance (250 tokens)
    await expect(page.getByText("250").first()).toBeVisible({ timeout: 10000 });

    // Navigate to Submit Waste page
    const submitWasteLink = page.locator("a[href='/household/submit']").first();
    if (await submitWasteLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitWasteLink.click();
    } else {
      await page.goto("/household/submit");
    }
    await expect(page.getByRole("heading", { name: /Submit Organic Waste/i })).toBeVisible({ timeout: 15000 });

    // Select category (Kitchen Scraps)
    await page.getByRole("button", { name: /Kitchen Scraps/i }).click();

    // Enter weight
    const weightInput = page.getByPlaceholder("e.g. 5.0");
    await weightInput.fill("6.5");

    // Ensure pickup address is filled
    const addressInput = page.getByPlaceholder(/123 Green Way/i);
    await addressInput.fill(testUser.address);

    // Enter special notes
    const notesInput = page.getByPlaceholder(/Gate code, bin location/i);
    await notesInput.fill("Green bin by the porch — E2E test");

    // Submit form -> triggers ConfirmationModal
    await page.getByRole("button", { name: /Review & Submit Pickup/i }).click();

    // In modal, click "Confirm & Queue Pickup"
    const confirmBtn = page.getByRole("button", { name: /Confirm & Queue Pickup/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Redirects to pickups tracker
    await page.waitForURL(/\/household\/pickups/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /Pickup Tracker & QR Passes/i })).toBeVisible();

    // Locate the newly queued pickup and click Cancel Pickup
    const cancelPickupBtn = page.getByRole("button", { name: /Cancel Pickup/i }).first();
    await expect(cancelPickupBtn).toBeVisible({ timeout: 10000 });
    await cancelPickupBtn.click();

    // Verify status changes to CANCELLED
    await expect(page.getByText(/CANCELLED/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Step 5: Household Marketplace Purchase & Order Placement
  // ---------------------------------------------------------------------------
  test("5. Household browses marketplace, adds produce to cart, and checks out", async () => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Redeem EcoTokens/i, { timeout: 15000 });

    // Wait for product cards to load and click Add
    const addToCartButtons = page.getByRole("button", { name: /^Add$/i });
    await expect(addToCartButtons.first()).toBeVisible({ timeout: 10000 });

    // Add first available product to cart
    await addToCartButtons.first().click();

    // Open shopping cart drawer
    const openCartBtn = page.getByRole("button", { name: /Open Shopping Cart/i });
    await openCartBtn.click();

    // Verify Drawer displays items
    await expect(page.getByRole("heading", { name: /Your Cart/i })).toBeVisible();

    // Proceed to checkout
    const checkoutLink = page.getByRole("link", { name: /^Checkout$/i });
    await checkoutLink.click();

    await page.waitForURL(/\/marketplace\/checkout/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Review & Place Order|Checkout/i })).toBeVisible();

    // Click "Confirm & Place Order"
    const placeOrderBtn = page.getByRole("button", { name: /Confirm & Place/i });
    await expect(placeOrderBtn).toBeEnabled();
    await placeOrderBtn.click();

    // Redirects to /orders/[id]
    await page.waitForURL(/\/orders/, { timeout: 15000 });
    await expect(page.getByText(/PLACED/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Step 6: Household Cancels Order & Receives Atomic Refund
  // ---------------------------------------------------------------------------
  test("6. Household cancels placed order and verifies atomic refund in token ledger", async () => {
    // If on /orders list, click into the first order
    if (!page.url().match(/\/orders\/\d+/)) {
      const viewReceiptLink = page.getByRole("link", { name: /View Receipt/i }).first();
      if (await viewReceiptLink.isVisible()) {
        await viewReceiptLink.click();
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      }
    }

    // Click "Cancel Order"
    const cancelOrderBtn = page.getByRole("button", { name: /Cancel Order/i }).first();
    await expect(cancelOrderBtn).toBeVisible({ timeout: 10000 });
    await cancelOrderBtn.click();

    // Fill cancellation reason in confirmation modal
    const reasonInput = page.getByPlaceholder(/Ordered wrong quantity/i);
    await expect(reasonInput).toBeVisible({ timeout: 5000 });
    await reasonInput.fill("Household E2E test cancellation");

    // Confirm cancellation
    const confirmCancelBtn = page.getByRole("button", { name: /Confirm Cancellation/i });
    await confirmCancelBtn.click();

    // Assert order status becomes CANCELLED
    await expect(page.getByText(/Cancelled/i).first()).toBeVisible({ timeout: 10000 });

    // Navigate to Token Ledger to verify ORDER_REFUND record via navbar link
    const ledgerLink = page.getByRole("link", { name: "Ledger" });
    if (await ledgerLink.isVisible()) {
      await ledgerLink.click();
    } else {
      await page.goto("/household/ledger");
    }
    await page.waitForURL(/\/household\/ledger/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /EcoToken Ledger/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/ORDER_REFUND|Refund for Order/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Step 7: Household Applies for Farmer Conversion
  // ---------------------------------------------------------------------------
  test("7. Household submits farmer partnership application", async () => {
    await page.goto("/household/apply-farmer");

    // Wait for page hydration: either the application form or authentication gate
    const gateHeading = page.getByRole("heading", { name: /Apply to Become a Farmer Partner|Household Account Required/i });
    await expect(gateHeading).toBeVisible({ timeout: 15000 });

    if (await page.getByRole("heading", { name: /Household Account Required/i }).isVisible()) {
      await login(page, testUser.email, testUser.password);
      await page.goto("/household/apply-farmer");
      await expect(page.getByRole("heading", { name: /Apply to Become a Farmer Partner/i })).toBeVisible({ timeout: 15000 });
    }

    await page.getByPlaceholder(/Malabar Organic Agroforestry/i).fill(testUser.farmName);
    await page.getByPlaceholder(/Survey No. 104/i).fill(testUser.farmAddress);
    await page.getByPlaceholder(/Describe your current crops/i).fill("Compost facility producing verified rich organic humus.");

    await page.getByRole("button", { name: /Submit Farmer Partner Application/i }).click();

    // Verify submission status becomes PENDING
    await expect(page.getByText(/Application Under Administrative Review/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Step 8: Admin Approves Farmer Application
  // ---------------------------------------------------------------------------
  test("8. Admin approves farmer application and inspects rejection modal controls", async () => {
    await context.clearCookies();
    await login(page, "admin@agroloop.com", "admin123");
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Switch to Farmer Conversion Queue tab
    const queueTab = page.getByRole("button", { name: /Farmer Conversion Queue/i });
    if (await queueTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await queueTab.click();
    } else {
      await page.goto("/admin?tab=farmer-applications");
    }
    await expect(page.getByRole("heading", { name: /Household to Farmer Conversion Queue/i })).toBeVisible({ timeout: 15000 });

    // Locate the test user's application card
    const appCard = page.locator(`div:has-text("${testUser.email}")`).filter({ hasText: /App #/i }).first();
    await expect(appCard).toBeVisible({ timeout: 10000 });

    // Test Rejection Modal opens with mandatory justification
    const rejectBtn = appCard.getByRole("button", { name: /Reject Application/i });
    await rejectBtn.click();

    const rejectModal = page.getByRole("heading", { name: /Reject Farmer Application/i });
    await expect(rejectModal).toBeVisible();

    // Cancel modal to keep application eligible for approval
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(rejectModal).not.toBeVisible();

    // Click "Approve & Onboard as Farmer"
    const approveBtn = appCard.getByRole("button", { name: /Approve & Onboard as Farmer/i });
    await approveBtn.click();

    // Verify confirmation banner appears
    await expect(page.getByText(/Farmer application approved successfully/i)).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Step 9: Admin Converts a New User to Farmer Without Application
  // ---------------------------------------------------------------------------
  test("9. Admin directly converts a new household user to farmer without application", async () => {
    const directUserEmail = directConvertUser.email;

    // Register a fresh household user first
    await page.goto("/auth/register");
    await dismissCookieBanner(page);
    await page.getByLabel("Full Name").fill(directConvertUser.name);
    await page.getByLabel("Email Address").fill(directUserEmail);
    await page.getByLabel(/Password \(min 8 characters\)/i).fill(directConvertUser.password);
    await page.getByLabel("Default Pickup Address").fill(directConvertUser.address);
    await page.getByRole("button", { name: /Complete Registration/i }).click();
    await page.waitForURL(/(\/household|\/auth\/login)/, { timeout: 15000 });

    // Switch back to Admin
    await context.clearCookies();
    await login(page, "admin@agroloop.com", "admin123");
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    const usersTab = page.getByRole("button", { name: /User Governance Directory/i });
    if (await usersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usersTab.click();
    } else {
      await page.goto("/admin?tab=users");
    }
    await expect(page.getByRole("heading", { name: /User Identity & Access Governance/i })).toBeVisible({ timeout: 15000 });

    // Search for direct conversion user
    const searchInput = page.getByPlaceholder(/Search by name, email, or user ID/i);
    await searchInput.fill(directUserEmail);
    await page.waitForTimeout(600);

    const row = page.locator(`tr:has-text("${directUserEmail}")`);
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click "Convert" (Direct Conversion to Farmer)
    const convertBtn = row.getByRole("button", { name: /Convert/i });
    await convertBtn.click();

    // Direct Conversion Modal opens
    await expect(page.getByRole("heading", { name: /Convert Household to Verified Farmer/i })).toBeVisible();

    // Fill required farm details
    await page.getByPlaceholder(/e\.g\. Green Valley Agroforestry/i).fill("Sunrise Agro Organic");
    await page.getByPlaceholder(/Plot 42, Sector 9/i).fill("Sector 12 Organic Belt, Green District");

    // Confirm conversion
    const executeConvertBtn = page.getByRole("button", { name: /Confirm & Promote to Farmer/i });
    await executeConvertBtn.click();

    // Verify user row role updates to Farmer in directory table
    await expect(row.getByText(/Farmer/i)).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Step 10: Admin Disables and Re-Enables a User
  // ---------------------------------------------------------------------------
  test("10. Admin disables a user and re-enables them in the user governance directory", async () => {
    // Switch to User Governance Directory tab
    const usersTab = page.getByRole("button", { name: /User Governance Directory/i });
    if (await usersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersTab.click();
    } else {
      await page.goto("/admin?tab=users");
      if (await page.getByRole("heading", { name: /Restricted Administrator Console/i }).isVisible().catch(() => false)) {
        await login(page, "admin@agroloop.com", "admin123");
        await page.goto("/admin?tab=users");
      }
    }
    await expect(page.getByRole("heading", { name: /User Identity & Access Governance/i })).toBeVisible({ timeout: 15000 });

    // Search for direct user
    const searchInput = page.getByPlaceholder(/Search by name, email, or user ID/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill(directConvertUser.email);
    await page.waitForTimeout(600);

    const userRow = page.locator(`tr:has-text("${directConvertUser.email}")`);
    await expect(userRow).toBeVisible({ timeout: 10000 });

    // Click "Disable" (handles window.confirm)
    const disableBtn = userRow.getByRole("button", { name: /^Disable$/i });
    page.once("dialog", (dialog) => dialog.accept());
    await disableBtn.click();

    // Verify "Disabled" badge appears
    await expect(userRow.getByText(/Disabled/i)).toBeVisible({ timeout: 10000 });

    // Click "Enable" (handles window.confirm)
    const enableBtn = userRow.getByRole("button", { name: /^Enable$/i });
    page.once("dialog", (dialog) => dialog.accept());
    await enableBtn.click();

    // Verify user returns to active state
    await expect(userRow.getByText(/Active/i)).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Step 11: Newly Approved Farmer Lists & Deletes Products, Checks Operations
  // ---------------------------------------------------------------------------
  test("11. Approved farmer logs in, lists a product, deletes/deactivates it, and accesses pickups", async () => {
    // Log in as testUser (who was approved as farmer in Step 8)
    await context.clearCookies();
    await login(page, testUser.email, testUser.password);

    // Role has been upgraded to ROLE_FARMER -> redirects to /farmer
    await page.waitForURL(/\/farmer/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /Farmer Dashboard|Farmer Partner Hub|Welcome back/i })).toBeVisible();

    // 1. Product Catalog Management: Navigate to /farmer/products
    await page.goto("/farmer/products");
    await expect(page.getByRole("heading", { name: /Product Catalog Management/i })).toBeVisible();

    // Click "+ List New Product"
    await page.getByRole("button", { name: /\+ List New Product/i }).click();

    // Fill product details
    const productName = `Organic Compost Batch ${timestamp.toString().slice(-4)}`;
    await page.getByPlaceholder(/e\.g\. Organic Vermicompost/i).fill(productName);
    await page.getByPlaceholder(/kg, bag, bundle/i).fill("kg");
    await page.getByPlaceholder(/Nutrient composition/i).fill("High-nitrogen enriched compost from residential organics.");
    // Click "Publish Product"
    await page.getByRole("button", { name: /Publish Product/i }).click();

    // Verify product appears in farmer table
    await expect(page.getByText(productName).first()).toBeVisible({ timeout: 10000 });

    // 2. Delete/Deactivate Product: Click Deactivate on the newly created product row
    const productRow = page.locator(`tr:has-text("${productName}")`);
    await expect(productRow).toBeVisible({ timeout: 10000 });
    const deactivateBtn = productRow.getByRole("button", { name: /Deactivate/i });
    await deactivateBtn.click();

    // 3. Return to Farmer Operations Hub
    const backToHubLink = page.getByRole("link", { name: /Back to Hub/i });
    if (await backToHubLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backToHubLink.click();
    } else {
      await page.goto("/farmer");
    }
    await page.waitForURL(/\/farmer/, { timeout: 15000 });

    // 4. Waste Collection / Pickups Navigation: Verify farmer pickup operations
    const pickupsLink = page.locator("a[href='/farmer/pickups']").first();
    if (await pickupsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pickupsLink.click();
    } else {
      await page.goto("/farmer/pickups");
    }
    await page.waitForURL(/\/farmer\/pickups/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /Available Pickups|Collection Routes|Doorstep/i }).first()).toBeVisible({ timeout: 15000 });

    // 5. Farmer Orders Console
    const ordersLink = page.locator("a[href='/farmer/orders']").first();
    if (await ordersLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ordersLink.click();
    } else {
      await page.goto("/farmer/orders");
    }
    await page.waitForURL(/\/farmer\/orders/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /Customer Orders|Farmer Orders|Order Management/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
