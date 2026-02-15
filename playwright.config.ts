import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321/psyduck-panic',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    // Desktop
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile - Phones Portrait
    {
      name: 'iPhone 12 Portrait',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'iPhone 12 Pro Portrait',
      use: { ...devices['iPhone 12 Pro'] },
    },
    {
      name: 'iPhone 13 Portrait',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'iPhone 14 Portrait',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Pixel 5 Portrait',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Galaxy S21 Portrait',
      use: {
        ...devices['Pixel 5'], // Use Pixel 5 as base (similar Android specs)
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        userAgent:
          'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36',
      },
    },

    // Mobile - Phones Landscape
    {
      name: 'iPhone 12 Landscape',
      use: {
        ...devices['iPhone 12 landscape'],
      },
    },
    {
      name: 'Pixel 5 Landscape',
      use: {
        ...devices['Pixel 5 landscape'],
      },
    },

    // Tablets Portrait
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
    },

    // Tablets Landscape
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
    },

    // Foldables
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
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321/psyduck-panic',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
