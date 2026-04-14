import path from 'node:path';
import { defineConfig } from 'vite';

/**
 * Vite config for Cognitive Dissonance (v4 — zero UI framework).
 *
 * The game is 100% procedural: Koota ECS owns all state, three.js owns the
 * one scene (hand-rolled, no reconciler), postprocessing handles effects,
 * gsap drives motion, Tone.js drives audio, yuka handles AI steering,
 * rapier handles rigid-body physics, three-text handles diegetic labels.
 * No React, no Solid, no R3F — the cabinet IS the UI.
 *
 * GitHub Pages deploy: GITHUB_PAGES=true makes base = /cognitive-dissonance/.
 */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'cognitive-dissonance';

export default defineConfig({
  base: isGitHubPages ? `/${repoName}/` : '/',
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
          if (id.includes('node_modules/three-stdlib') || id.includes('node_modules/postprocessing') || id.includes('node_modules/three-text')) {
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
      'tone',
      'yuka',
    ],
  },
});
