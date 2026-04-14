import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite config for Cognitive Dissonance.
 *
 * Uses @vitejs/plugin-react with Babel — we need `babel-plugin-reactylon`
 * to register Babylon.js classes for lowercase JSX tags (<hemisphericLight>,
 * <arcRotateCamera>, etc.). The plugin wraps esbuild's SWC pipeline.
 *
 * GitHub Pages deploy: set `GITHUB_PAGES=true` so `base` becomes
 * `/cognitive-dissonance/`. Default build serves from root.
 */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'cognitive-dissonance';

export default defineConfig({
  base: isGitHubPages ? `/${repoName}/` : '/',
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
      '@babylonjs/gui',
      '@babylonjs/loaders',
      'gsap',
      'miniplex',
      'react',
      'react-dom',
      'reactylon',
      'reactylon/web',
      'seedrandom',
      'tone',
      'yuka',
      'zustand',
    ],
  },
});
