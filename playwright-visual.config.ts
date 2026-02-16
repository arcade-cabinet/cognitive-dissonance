import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for visual verification screenshots
 * Optimized for a single Desktop Chrome run to capture all visual elements
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run sequentially for consistent screenshots
  forbidOnly: false,
  retries: 0, // No retries for screenshots
  workers: 1, // Single worker for consistent state
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/visual-verification-report' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on',
    screenshot: 'on', // Always capture screenshots
    video: 'on',
  },
  projects: [
    {
      name: 'Desktop Chrome - Visual Verification',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 }, // Standard desktop size
      },
      testMatch: /visual-verification\.spec\.ts/, // Only run visual verification tests
    },
  ],
  webServer: {
    command: 'pnpm exec vite preview --port 4173',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
