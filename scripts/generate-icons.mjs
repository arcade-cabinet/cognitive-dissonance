#!/usr/bin/env node

/**
 * Generate apple-touch-icon.png from icon.svg
 * Requires: sharp package
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, '../public/icon.svg');
const pngPath = join(__dirname, '../public/apple-touch-icon.png');

async function generateIcon() {
  try {
    console.log('📱 Generating apple-touch-icon.png from icon.svg...');

    const svgBuffer = readFileSync(svgPath);

    await sharp(svgBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 24, alpha: 1 }, // Match app background
      })
      .png({
        quality: 100,
        compressionLevel: 9,
      })
      .toFile(pngPath);

    console.log('✅ Successfully generated apple-touch-icon.png (180x180)');
    console.log(`   Location: ${pngPath}`);
  } catch (error) {
    console.error('❌ Error generating icon:', error.message);
    process.exit(1);
  }
}

generateIcon();
