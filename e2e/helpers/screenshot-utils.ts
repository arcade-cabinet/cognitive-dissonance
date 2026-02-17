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
 * R3F wraps the actual canvas inside a container div
 */
export async function captureCanvasAsDataURL(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const container = document.getElementById('gameCanvas');
    if (!container) {
      throw new Error('Game canvas container not found');
    }
    // R3F places the actual canvas element inside the container div
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('WebGL canvas not found inside R3F container');
    }
    return canvas.toDataURL('image/png');
  });
}

/**
 * Save canvas content to a file using Playwright's screenshot
 */
export async function saveCanvasScreenshot(page: Page, filename: string): Promise<void> {
  // Target the actual canvas inside R3F's container div
  const canvas = page.locator('#gameCanvas canvas');
  const count = await canvas.count();
  if (count > 0) {
    await canvas.first().screenshot({ path: filename });
  } else {
    // Fallback to the container itself
    await page.locator('#gameCanvas').screenshot({ path: filename });
  }
}

/**
 * Wait for game to be fully loaded and rendering
 */
export async function waitForGameReady(page: Page): Promise<void> {
  // Wait for R3F container to exist
  await page.waitForSelector('#gameCanvas', { state: 'attached' });

  // Wait for game container to be visible
  await page.waitForSelector('#game-container', { state: 'visible' });

  // Give R3F/Three.js time to initialize and render first frame
  await page.waitForTimeout(1000);

  // Verify canvas has WebGL content (R3F uses WebGL, not 2d)
  const hasContent = await page.evaluate(() => {
    const container = document.getElementById('gameCanvas');
    if (!container) return false;
    const canvas = container.querySelector('canvas');
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return false;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return gl !== null;
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
      console.info(`Screenshot attempt ${i + 1} failed, retrying...`);
    }
  }
}
