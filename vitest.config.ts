import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'e2e/helpers/governor/__tests__/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    reporters: [
      'default',
      ['vitest-sonar-reporter', { outputFile: 'test-results/sonar-report.xml' }],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.spec.tsx',
        '**/*.test.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@lib': resolve(__dirname, './src/lib'),
    },
  },
});
