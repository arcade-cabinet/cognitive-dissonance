import path from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * Vitest browser mode — runs component tests in a real Chromium browser via
 * Playwright, giving them access to real WebGL.
 *
 * Serial file execution (`fileParallelism: false`) avoids the dep-optimizer
 * race that produced flaky "Failed to fetch dynamically imported module"
 * errors in CI's cold-cache first run.
 */
export default defineConfig({
  test: {
    include: [
      'src/**/*.browser.test.tsx',
      'src/**/*.browser.test.ts',
      'research/**/*.browser.test.ts',
    ],
    exclude: ['node_modules/**', 'e2e/**'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      // biome-ignore lint/suspicious/noExplicitAny: pnpm type dedup
      provider: playwright({
        launchOptions: {
          args: process.env.CI
            ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox']
            : ['--use-gl=angle'],
        },
        // biome-ignore lint/suspicious/noExplicitAny: pnpm type dedup
      }) as any,
      instances: [{ browser: 'chromium' }],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: [
      '@dimforge/rapier3d-compat',
      'gsap',
      'gsap/CustomEase',
      'koota',
      'postprocessing',
      'seedrandom',
      'three',
      'three-stdlib',
      'three-text',
      'yuka',
    ],
  },
});
