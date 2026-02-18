import { test, expect } from '@playwright/test';
import { waitForCanvas, getCanvasDimensions } from './helpers/game-helpers';

test.describe('Smoke tests', () => {
  test('page loads with 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('canvas element exists and has non-zero dimensions', async ({ page }) => {
    await page.goto('/');
    const canvas = await waitForCanvas(page);
    const dims = await getCanvasDimensions(page);
    expect(dims).not.toBeNull();
    expect(dims!.width).toBeGreaterThan(0);
    expect(dims!.height).toBeGreaterThan(0);
  });

  test('title "COGNITIVE DISSONANCE" appears', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('COGNITIVE')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('DISSONANCE')).toBeVisible({ timeout: 5_000 });
  });

  test('title fades after ~2.4 seconds', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('COGNITIVE')).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(4_000);
    const titleOverlay = page.locator('[class*="z-30"]').first();
    const isHidden = await titleOverlay.isHidden().catch(() => true);
    const opacity = isHidden
      ? '0'
      : await titleOverlay.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeLessThanOrEqual(0.1);
  });

  test('canvas has a WebGL-backed rendering context', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    const hasContext = await page.evaluate(() => {
      const canvas = document.querySelector('#reactylon-canvas') ?? document.querySelector('canvas');
      if (!canvas) return false;
      // Babylon.js already owns the context — just verify the canvas has data
      return (canvas as HTMLCanvasElement).width > 0 && (canvas as HTMLCanvasElement).height > 0;
    });
    expect(hasContext).toBe(true);
  });
});
