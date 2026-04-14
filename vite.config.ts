import path from 'node:path';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

/**
 * Vite config for Cognitive Dissonance (v4 — zero UI framework).
 *
 * The game is 100% procedural: Koota ECS owns all state, three.js owns the
 * one scene (hand-rolled, no reconciler), postprocessing handles effects,
 * gsap drives motion, Tone.js drives audio, yuka handles AI steering,
 * rapier handles rigid-body physics, three-text handles diegetic labels.
 * No React, no Solid, no R3F — the cabinet IS the UI.
 *
 * Rapier (non-compat) imports its WASM via `import * as wasm from "./*.wasm"`.
 * Vite 8 / rolldown doesn't handle that natively, so we lean on
 * vite-plugin-wasm to route the .wasm through the asset pipeline. The
 * companion top-level-await plugin lets rapier's init sequence work in
 * ES module output.
 *
 * GitHub Pages deploy: GITHUB_PAGES=true makes base = /cognitive-dissonance/.
 */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'cognitive-dissonance';

export default defineConfig({
  base: isGitHubPages ? `/${repoName}/` : '/',
  // ES2022 output supports top-level await natively — no plugin required.
  plugins: [wasm()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: { port: 3000, strictPort: false },
  preview: { port: 3000, strictPort: false },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@dimforge')) return 'physics';
          if (
            id.includes('node_modules/three-stdlib') ||
            id.includes('node_modules/postprocessing') ||
            id.includes('node_modules/three-text')
          ) {
            return 'three-ext';
          }
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/tone')) return 'audio';
          if (id.includes('node_modules/yuka')) return 'ai';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d'], // let vite-plugin-wasm intercept the import
    include: [
      'gsap',
      'gsap/CustomEase',
      'koota',
      'postprocessing',
      'seedrandom',
      'three',
      'three-stdlib',
      'three-text',
      'tone',
      'yuka',
    ],
  },
});
