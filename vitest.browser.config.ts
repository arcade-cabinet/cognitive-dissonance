import path from 'node:path';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { createLogger } from 'vite';
import { defineConfig } from 'vitest/config';

// Suppress plugin-react-v4-vs-rolldown deprecation warnings (same fix as
// vite.config.ts — they're cosmetic, behavior is identical).
const silentLogger = createLogger();
const origWarn = silentLogger.warn.bind(silentLogger);
silentLogger.warn = (msg, ...rest) => {
  if (
    typeof msg === 'string' &&
    (msg.includes('`esbuild` option was specified by "vite:react-babel"') ||
      msg.includes('optimizeDeps.rollupOptions') ||
      msg.includes('Both esbuild and oxc options were set'))
  ) {
    return;
  }
  origWarn(msg, ...rest);
};

/**
 * Vitest browser mode — runs component tests in a real Chromium browser via
 * Playwright, giving them access to real WebGL.
 *
 * Used for *.browser.test.tsx files that need to verify 3D components actually
 * render to canvas (isolation tests that complement the full-app E2E suite).
 */
export default defineConfig({
  customLogger: silentLogger,
  plugins: [react()],
  test: {
    include: [
      'src/**/*.browser.test.tsx',
      'src/**/*.browser.test.ts',
      // Visual isolation research: standalone Three.js shader captures.
      'research/**/*.browser.test.ts',
    ],
    exclude: ['node_modules/**', 'e2e/**'],
    // CI SwiftShader is slower than local ANGLE; give the Vite transform/
    // optimize step headroom before declaring import timeouts.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Serialize test files — vitest browser mode otherwise triggers concurrent
    // on-demand dep optimization that invalidates in-flight module fetches
    // and causes random "Failed to fetch dynamically imported module" errors
    // in CI (first cold run). Local reruns pass because the optimizer cache
    // is warm; CI has no warm cache, so we need determinism here.
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      // biome-ignore lint/suspicious/noExplicitAny: type duplication from pnpm dedup
      provider: playwright({
        launchOptions: {
          // WebGL: SwiftShader (software) in CI/headless Linux, ANGLE on Mac/Windows.
          // Both are Chromium-bundled software renderers — no hardware needed.
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
    // Pre-bundle every heavy dep the test files import transitively, so the
    // first test request doesn't serialize N cold module graph fetches over
    // the vitest browser server.
    include: [
      '@react-three/drei',
      '@react-three/fiber',
      'gsap',
      'gsap/CustomEase',
      'koota',
      'postprocessing',
      'react',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'seedrandom',
      'three',
      'three-stdlib',
      'yuka',
    ],
  },
});
