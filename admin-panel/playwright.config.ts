import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
// Check if rate limiting tests are being run
const isRateLimitTestMode = process.env.RATE_LIMIT_TEST_MODE === 'true';

export default defineConfig({
  testDir: './tests',
  /* Only run .spec.ts files (exclude .test.ts which are for Vitest) */
  testMatch: '**/*.spec.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests once */
  retries: 1,
  /* Use single worker for test stability (avoids race conditions with shared database) */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'list',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Exclude rate-limiting tests from default run
      testIgnore: '**/rate-limiting.spec.ts',
    },
    {
      name: 'rate-limiting',
      use: { ...devices['Desktop Chrome'] },
      // Only run rate-limiting tests with RATE_LIMIT_TEST_MODE enabled
      testMatch: '**/rate-limiting.spec.ts',
      // Note: To run these tests, use:
      // RATE_LIMIT_TEST_MODE=true npx playwright test --project=rate-limiting
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      // Pass RATE_LIMIT_TEST_MODE to the dev server when running rate-limit tests
      command: isRateLimitTestMode
        ? 'RATE_LIMIT_TEST_MODE=true npm run dev'
        : 'npm run dev',
      url: 'http://localhost:3000',
      // Don't reuse existing server for rate-limit tests (need fresh server with env var)
      reuseExistingServer: isRateLimitTestMode ? false : !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60000,
    },
    {
      command: 'npx http-server ../examples/test-pages -p 3002 --cors -c-1',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30000,
    },
  ],
});