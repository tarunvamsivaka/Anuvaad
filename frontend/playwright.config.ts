import { defineConfig, devices } from '@playwright/test';


/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers.
   * CI: chromium only (fast, stable, headless). Full matrix runs locally.
   * TEST-02: Cross-browser coverage is preserved for local dev. */
  projects: process.env.CI
    ? [
        { name: 'setup', testMatch: 'e2e/auth.setup.ts' },
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            storageState: 'playwright/.auth/user.json',
          },
          dependencies: ['setup'],
        },
      ]
    : [
        { name: 'setup', testMatch: /.*\.setup\.ts/ },
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            storageState: 'playwright/.auth/user.json',
          },
          dependencies: ['setup'],
        },
        {
          name: 'firefox',
          use: {
            ...devices['Desktop Firefox'],
            storageState: 'playwright/.auth/user.json',
          },
          dependencies: ['setup'],
        },
        {
          name: 'webkit',
          use: {
            ...devices['Desktop Safari'],
            storageState: 'playwright/.auth/user.json',
          },
          dependencies: ['setup'],
        },
        {
          name: 'mobile-chrome',
          use: {
            ...devices['Pixel 7'],
            storageState: 'playwright/.auth/user.json',
          },
          dependencies: ['setup'],
        },
        {
          name: 'mobile-safari',
          use: {
            ...devices['iPhone 14'],
            storageState: 'playwright/.auth/user.json',
          },
          dependencies: ['setup'],
        },
      ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI
      ? 'node .next/standalone/server.js'
      : 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    /* Give the Next.js production server up to 2 minutes to start in CI */
    timeout: 120_000,
    env: process.env.CI
      ? {
          PORT: '3000',
          HOSTNAME: '127.0.0.1',
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
        }
      : undefined,
  },
});
