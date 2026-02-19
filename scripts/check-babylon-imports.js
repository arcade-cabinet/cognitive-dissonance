#!/usr/bin/env node
/**
 * Babylon.js Import Checker
 * Flags barrel imports from @babylonjs/core (must use subpath imports for tree-shaking)
 * Requirement 40.4: Biome lint rule for barrel imports
 */

const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.join(__dirname, '..', 'src');
let hasErrors = false;

// Regex to match barrel imports: import { ... } from '@babylonjs/core' or 'babylonjs'
const barrelImportRegex = /import\s+{[^}]+}\s+from\s+['"](@babylonjs\/core|babylonjs)['"]/g;

/**
 * Inspect a TypeScript file for barrel imports from `@babylonjs/core` or `babylonjs` and report each occurrence.
 *
 * For every detected barrel import, an error is logged with the file path, line number, and the matched import,
 * and a suggestion to use a tree-shakable subpath import is printed. Detected issues set the module-level
 * `hasErrors` flag to `true`.
 *
 * @param {string} filePath - Path to the file to inspect.
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = content.matchAll(barrelImportRegex);
  
  for (const match of matches) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    console.error(`❌ ${filePath}:${lineNumber} - Barrel import detected: ${match[0]}`);
    console.error('   Use subpath imports instead: import { Mesh } from "@babylonjs/core/Meshes/mesh"');
    hasErrors = true;
  }
}

/**
 * Recursively traverses a directory and invokes checkFile for each .ts or .tsx file found.
 *
 * @param {string} dir - Path to the directory to scan.
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      checkFile(fullPath);
    }
  }
}

console.log('Checking for @babylonjs/core barrel imports...');
scanDirectory(srcDir);

if (hasErrors) {
  console.error('\n❌ Barrel imports detected. Use tree-shakable subpath imports only.');
  process.exit(1);
} else {
  console.log('✅ No barrel imports detected. All @babylonjs/core imports are tree-shakable.');
}