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
 * Playwright, giving them access to real WebGL for Babylon.js rendering.
 *
 * Used for *.browser.test.tsx files that need to verify 3D components actually
 * render to canvas (isolation tests that complement the full-app E2E suite).
 */
export default defineConfig({
  customLogger: silentLogger,
  plugins: [
    // Run babel-plugin-reactylon so lowercase JSX tags (<hemisphericLight>) get
    // auto-registered to Babylon classes in the test bundle, same as the app.
    react({
      babel: {
        plugins: ['babel-plugin-reactylon'],
      },
    }),
  ],
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
    // Suppress unhandled rejections from Babylon.js async texture loaders
    // (race between scene disposal and env texture async completion).
    // Very narrow match — only suppress the specific env-texture teardown race
    // ('postProcessManager' property access on a null scene reference).
    onUnhandledError: (error) => {
      const msg = error?.message ?? '';
      const stack = error?.stack ?? '';
      // Tight match: both the exact property name AND a Babylon stack frame
      // must appear. Prevents masking unrelated TypeError null-derefs.
      const isBabylonTeardownRace =
        msg.includes("reading 'postProcessManager'") &&
        /@babylonjs|envTextureLoader|rgbdTextureTools|EnvironmentHelper|environmentTextures|EnvironmentTexture|Effect\.executeWhenCompiled/i.test(
          stack,
        );
      if (isBabylonTeardownRace) return false;
      return true;
    },
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
      '@babylonjs/core',
      // babel-plugin-reactylon imports deep-path classes on demand; these get
      // discovered mid-test-run otherwise and invalidate the optimizer cache.
      '@babylonjs/core/Buffers/buffer.align',
      '@babylonjs/core/Misc/environmentTextureTools',
      '@babylonjs/core/Misc/rgbdTextureTools',
      '@babylonjs/gui',
      'gsap',
      'gsap/CustomEase',
      'koota',
      'react',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'reactylon',
      'reactylon/web',
      'seedrandom',
      'three',
      'postprocessing',
      'yuka',
    ],
  },
});
