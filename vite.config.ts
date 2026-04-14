import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';

/**
 * Vite config for Cognitive Dissonance (v4 — R3F stack).
 *
 * Uses @vitejs/plugin-react v4. No custom Babel plugins needed — R3F's
 * reconciler handles lowercase JSX tags internally; we just need the standard
 * React JSX transform.
 *
 * GitHub Pages deploy: set `GITHUB_PAGES=true` so `base` becomes
 * `/cognitive-dissonance/`. Default build serves from root.
 */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'cognitive-dissonance';

// plugin-react v4 sets esbuild.{jsx,jsxImportSource} and
// optimizeDeps.rollupOptions.jsx via the older API; Vite 8 / rolldown wants
// `oxc.*` and `rolldownOptions.*` instead. The behavior is identical (both
// resolve to the same JSX transform), but Vite logs a deprecation warning
// for each one. Filter them out so logs stay readable.
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

export default defineConfig({
  base: isGitHubPages ? `/${repoName}/` : '/',
  customLogger: silentLogger,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
  preview: {
    port: 3000,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (
            id.includes('node_modules/@react-three') ||
            id.includes('node_modules/three-stdlib') ||
            id.includes('node_modules/postprocessing')
          ) {
            return 'r3f';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
          if (id.includes('node_modules/tone')) return 'audio';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@react-three/drei',
      '@react-three/fiber',
      'gsap',
      'koota',
      'postprocessing',
      'react',
      'react-dom',
      'seedrandom',
      'three',
      'three-stdlib',
      'tone',
      'yuka',
    ],
  },
});
