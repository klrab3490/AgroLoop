import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for AgroLoop multi-app workspace.
 * Covers both Web UI (Next.js @ port 3456) and Desktop Operator UI (Vite @ port 1420).
 * Uses port 3456 to avoid collisions with any background docker containers on 3000/3001.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.RECORD_VIDEO ? "on" : "off",
    launchOptions: {
      slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO, 10) : 0,
    },
  },

  projects: [
    {
      name: "web-ui",
      testMatch: /.*web.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.PLAYWRIGHT_WEB_URL || "http://localhost:3100",
      },
    },
    {
      name: "desktop-ui",
      testMatch: /.*desktop.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.PLAYWRIGHT_DESKTOP_URL || "http://localhost:1420",
      },
    },
  ],

  webServer: [
    {
      command: "pnpm --filter=@agroloop/web dev:e2e",
      url: "http://localhost:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "pnpm --filter=@agroloop/desktop dev",
      url: "http://localhost:1420",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
