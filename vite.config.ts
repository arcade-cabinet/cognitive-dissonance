import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';

/**
 * Vite config for Cognitive Dissonance.
 *
 * Uses @vitejs/plugin-react v4 with Babel — we need `babel-plugin-reactylon`
 * to register Babylon.js classes for lowercase JSX tags (<hemisphericLight>,
 * <arcRotateCamera>, etc.). plugin-react v6 dropped the babel.plugins option
 * (now SWC-only), so we stay on v4 until babel-plugin-reactylon ships an
 * SWC-compatible variant.
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
  plugins: [
    // @vitejs/plugin-react v4 uses Babel and exposes babel.plugins, which is
    // what babel-plugin-reactylon needs to auto-register Babylon.js classes
    // for lowercase JSX tags (<hemisphericLight>, <arcRotateCamera>, …).
    react({
      babel: {
        plugins: ['babel-plugin-reactylon'],
      },
    }),
  ],
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
    chunkSizeWarningLimit: 1500, // Babylon is large; we ship it as a single chunk
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@babylonjs/')) return 'babylon';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
          if (id.includes('node_modules/tone')) return 'audio';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@babylonjs/core',
      // Reactylon imports @babylonjs/gui internally for its 3D GUI manager;
      // even if we don't use GUI features in our JSX, the package needs to
      // resolve at module-init time.
      '@babylonjs/gui',
      'gsap',
      'koota',
      'react',
      'react-dom',
      'reactylon',
      'reactylon/web',
      'seedrandom',
      'tone',
      'yuka',
    ],
  },
});
