import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: ['log', 'info', 'debug'],
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-tone': ['tone'],
          'vendor-anime': ['animejs'],
          // Spline 3D (lazy loaded — only when SPLINE_BUST_URL is set)
          'vendor-spline': ['@splinetool/runtime', '@splinetool/react-spline'],
          // yuka is bundled into game.worker.js (worker-only dependency)

          // Capacitor chunks (lazy loaded)
          'capacitor-core': ['@capacitor/core', '@capacitor/app'],
          'capacitor-plugins': [
            '@capacitor/device',
            '@capacitor/haptics',
            '@capacitor/keyboard',
            '@capacitor/screen-orientation',
            '@capacitor/status-bar',
          ],

          // Game logic chunks
          'game-logic': [
            './src/lib/game-logic.ts',
            './src/lib/constants.ts',
            './src/lib/events.ts',
          ],
          'game-ecs': ['./src/ecs/world.ts', './src/ecs/react.ts', './src/ecs/state-sync.ts'],
          'game-utils': [
            './src/lib/audio.ts',
            './src/lib/storage.ts',
            './src/lib/device-utils.ts',
            './src/lib/capacitor-device.ts',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase from default 500KB
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  worker: {
    format: 'iife',
  },
  optimizeDeps: {
    exclude: ['@capacitor/core', '@capacitor/app'],
  },
});
