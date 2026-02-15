import { defineConfig, devices } from '@playwright/test';

// Detect Copilot CI environment (used by GitHub Copilot Workspace)
const isCopilotCI = process.env.GITHUB_ACTIONS && process.env.RUNNER_NAME?.includes('copilot');
const isCI = !!process.env.CI || isCopilotCI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,
  reporter: isCI 
    ? [['@bdellegrazie/playwright-sonar-reporter', { outputFile: 'test-results/e2e-sonar-report.xml' }], ['line']]
    : 'html',
  use: {
    baseURL: 'http://localhost:4173', // Vite preview default port
    // Only capture traces/screenshots/video on failure
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Core smoke tests on primary devices only
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.(spec|test)\.ts/, // Run all tests
    },
    {
      name: 'iPhone 12 Portrait',
      use: { ...devices['iPhone 12'] },
      testMatch: /.*\.(spec|test)\.ts/, // Run all tests
    },
    {
      name: 'iPad Pro 11 Portrait',
      use: {
        viewport: { width: 834, height: 1194 },
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /.*\.(spec|test)\.ts/, // Run all tests
    },

    // Comprehensive device testing (only for device-responsive.spec.ts)
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'iPhone 12 Pro Portrait',
      use: { ...devices['iPhone 12 Pro'] },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'iPhone 13 Portrait',
      use: { ...devices['iPhone 13'] },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'iPhone 14 Portrait',
      use: { ...devices['iPhone 14'] },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'Pixel 5 Portrait',
      use: { ...devices['Pixel 5'] },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'Galaxy S21 Portrait',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        userAgent:
          'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36',
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'iPhone 12 Landscape',
      use: {
        ...devices['iPhone 12 landscape'],
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'Pixel 5 Landscape',
      use: {
        ...devices['Pixel 5 landscape'],
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'iPad Pro 12.9 Portrait',
      use: {
        viewport: { width: 1024, height: 1366 },
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'iPad Pro 11 Landscape',
      use: {
        viewport: { width: 1194, height: 834 },
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'Samsung Galaxy Fold Folded',
      use: {
        viewport: { width: 280, height: 653 },
        userAgent:
          'Mozilla/5.0 (Linux; Android 11; SM-F916U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'Samsung Galaxy Fold Unfolded',
      use: {
        viewport: { width: 717, height: 512 },
        userAgent:
          'Mozilla/5.0 (Linux; Android 11; SM-F916U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'Surface Duo Portrait',
      use: {
        viewport: { width: 540, height: 720 },
        userAgent:
          'Mozilla/5.0 (Linux; Android 11; Surface Duo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        deviceScaleFactor: 2.5,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
    {
      name: 'Surface Duo Landscape',
      use: {
        viewport: { width: 720, height: 540 },
        userAgent:
          'Mozilla/5.0 (Linux; Android 11; Surface Duo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        deviceScaleFactor: 2.5,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /device-responsive\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm exec vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !isCI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
