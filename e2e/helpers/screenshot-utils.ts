/**
 * Screenshot utilities for capturing game canvas properly
 */

import type { Page } from '@playwright/test';

/**
 * Capture a screenshot that includes canvas content
 *
 * Regular Playwright screenshots may not capture WebGL/Canvas content properly.
 * This function ensures the canvas is captured correctly.
 */
export async function captureGameScreenshot(page: Page, filename: string): Promise<void> {
  // Wait a moment for canvas to render
  await page.waitForTimeout(100);

  // Force a full page screenshot to ensure canvas is captured
  await page.screenshot({
    path: filename,
    fullPage: false,
    animations: 'disabled',
  });
}

/**
 * Capture the game canvas as a base64 image
 * This directly extracts the canvas content
 */
export async function captureCanvasAsDataURL(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Game canvas not found');
    }
    return canvas.toDataURL('image/png');
  });
}

/**
 * Save canvas content to a file using Playwright's screenshot
 */
export async function saveCanvasScreenshot(page: Page, filename: string): Promise<void> {
  await page.locator('#gameCanvas').screenshot({ path: filename });
}

/**
 * Wait for game to be fully loaded and rendering
 */
export async function waitForGameReady(page: Page): Promise<void> {
  // Wait for canvas to exist
  await page.waitForSelector('#gameCanvas', { state: 'attached' });

  // Wait for game container to be visible
  await page.waitForSelector('#game-container', { state: 'visible' });

  // Give PixiJS time to initialize and render first frame
  await page.waitForTimeout(1000);

  // Verify canvas has content by checking if it has a context
  const hasContent = await page.evaluate(() => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    return ctx !== null;
  });

  if (!hasContent) {
    console.warn('Canvas may not be fully initialized');
  }
}

/**
 * Take a screenshot with retry logic to ensure canvas is captured
 */
export async function captureWithRetry(
  page: Page,
  filename: string,
  maxRetries = 3
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Wait a bit for canvas to render
      await page.waitForTimeout(200 * (i + 1));

      // Try to capture
      await page.screenshot({
        path: filename,
        animations: 'disabled',
      });

      // Verify the screenshot was taken
      const fs = await import('node:fs');
      const stats = fs.statSync(filename);
      if (stats.size > 1000) {
        // At least 1KB
        return;
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Screenshot attempt ${i + 1} failed, retrying...`);
    }
  }
}
