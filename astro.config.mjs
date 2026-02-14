import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Psyduck Panic: Evolution Deluxe',
        short_name: 'Psyduck Panic',
        description: 'Counter AI hype thought bubbles before your brother\'s brain melts!',
        theme_color: '#0a0a18',
        background_color: '#0a0a18',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,mp3,wav}']
      }
    })
  ],
  site: 'https://arcade-cabinet.github.io',
  base: '/psyduck-panic',
  outDir: './dist',
  build: {
    assets: 'assets',
  },
});
