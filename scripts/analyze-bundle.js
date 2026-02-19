#!/usr/bin/env node
/**
 * Bundle Analysis Script
 * Generates a visual treemap of the production bundle
 * Requirement 40.2: Bundle analysis on CI
 */

const { visualizer } = require('rollup-plugin-visualizer');
const fs = require('node:fs');
const path = require('node:path');

const distDir = path.join(__dirname, '..', 'dist');
const outputFile = path.join(__dirname, '..', 'bundle-analysis.html');

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory not found. Run `pnpm build:web` first.');
  process.exit(1);
}

// Find all JS files in dist
const jsFiles = [];
/**
 * Recursively collects JavaScript file paths from a directory and appends them to the module-level `jsFiles` array.
 *
 * The search descends into subdirectories and adds any file whose name ends with `.js` to `jsFiles`.
 * @param {string} dir - Filesystem path of the directory to search.
 */
function findJsFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findJsFiles(fullPath);
    } else if (file.endsWith('.js')) {
      jsFiles.push(fullPath);
    }
  }
}
findJsFiles(distDir);

if (jsFiles.length === 0) {
  console.error('Error: No JS files found in dist/');
  process.exit(1);
}

// Calculate total bundle size (gzipped)
const { execSync } = require('node:child_process');
let totalSize = 0;
for (const file of jsFiles) {
  const gzipSize = execSync(`gzip -c "${file}" | wc -c`, { encoding: 'utf-8' });
  totalSize += Number.parseInt(gzipSize.trim(), 10);
}

const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
console.log(`Total bundle size (gzipped): ${totalSizeMB} MB`);

if (totalSize >= 5242880) {
  console.error(`Error: Bundle size ${totalSizeMB} MB exceeds 5 MB limit`);
  process.exit(1);
}

// Generate bundle analysis HTML
console.log('Generating bundle analysis...');
const plugin = visualizer({
  filename: outputFile,
  open: false,
  gzipSize: true,
  brotliSize: false,
  template: 'treemap',
  title: 'Cognitive Dissonance v3.0 Bundle Analysis',
});

// Create a minimal rollup config to analyze the bundle
const rollup = require('rollup');
(async () => {
  try {
    const bundle = await rollup.rollup({
      input: jsFiles[0], // Use the first JS file as entry point
      plugins: [plugin],
      external: () => true, // Treat all imports as external
    });
    await bundle.close();
    console.log(`Bundle analysis saved to: ${outputFile}`);
    console.log(`Bundle size check: PASSED (${totalSizeMB} MB / 5.00 MB)`);
  } catch (error) {
    console.error('Error generating bundle analysis:', error);
    process.exit(1);
  }
})();