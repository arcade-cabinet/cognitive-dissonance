import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/web',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:8081',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // Expo web can take longer to start
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'gpu-playthrough',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        headless: false,
        viewport: { width: 1280, height: 720 },
        video: 'on',
      },
      testMatch: '**/multi-dream-playthrough.spec.ts',
      timeout: 180_000,
    },
  ],
});
