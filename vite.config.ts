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
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pixi': ['pixi.js'],
          'vendor-anime': ['animejs'],

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
          'game-renderer': ['./src/lib/pixi-renderer.ts', './src/lib/character-renderer.ts'],
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
    port: 4321,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@capacitor/core', '@capacitor/app'],
  },
});
