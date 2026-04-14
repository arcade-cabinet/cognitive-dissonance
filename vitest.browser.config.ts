import path from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * Vitest browser mode — runs component tests in a real Chromium browser via
 * Playwright, giving them access to real WebGL for Babylon.js rendering.
 *
 * Used for *.browser.test.tsx files that need to verify 3D components actually
 * render to canvas (isolation tests that complement the full-app E2E suite).
 */
export default defineConfig({
  test: {
    include: ['src/**/*.browser.test.tsx', 'src/**/*.browser.test.ts'],
    exclude: ['node_modules/**', 'e2e/**'],
    browser: {
      enabled: true,
      headless: true,
      // biome-ignore lint/suspicious/noExplicitAny: type duplication from pnpm dedup
      provider: playwright({
        launchOptions: {
          // ANGLE for software WebGL support (matches CI and playwright.config)
          args: ['--use-gl=angle'],
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
      '@babylonjs/core',
      'gsap',
      'gsap/CustomEase',
      'miniplex',
      'react-dom/client',
      'react',
      'react/jsx-dev-runtime',
      'reactylon',
      'reactylon/web',
      'seedrandom',
      'yuka',
      'zustand',
    ],
  },
});
