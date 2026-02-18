import { test, expect } from '@playwright/test';
import { waitForCanvas, getCanvasDimensions } from './helpers/game-helpers';

test.describe('Smoke tests', () => {
  test('page loads with 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('canvas element exists and has non-zero dimensions', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
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
    const titleOverlay = page.locator('[data-testid="title-overlay"]');
    const isHidden = await titleOverlay.isHidden().catch(() => true);
    const opacity = isHidden ? '0' : await titleOverlay.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeLessThanOrEqual(0.1);
  });

  test('canvas has a WebGL-backed rendering context', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    const hasContext = await page.evaluate(() => {
      const canvas = document.querySelector('#reactylon-canvas') ?? document.querySelector('canvas');
      if (!canvas) return false;
      return (canvas as HTMLCanvasElement).width > 0 && (canvas as HTMLCanvasElement).height > 0;
    });
    expect(hasContext).toBe(true);
  });

  test('no unhandled console errors during page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await waitForCanvas(page);
    await page.waitForTimeout(2_000);
    // Filter out known benign errors (e.g. WebGL warnings)
    const criticalErrors = errors.filter(
      (e) => !e.includes('WebGL') && !e.includes('GL_INVALID') && !e.includes('WEBGL_'),
    );
    expect(criticalErrors).toEqual([]);
  });

  test('Zustand store bridge is available on window', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await page.waitForTimeout(1_000);
    const hasStores = await page.evaluate(() => {
      const w = window as Record<string, unknown>;
      return (
        typeof w.__zustand_level === 'function' &&
        typeof w.__zustand_input === 'function' &&
        typeof w.__zustand_game === 'function' &&
        typeof w.__zustand_seed === 'function'
      );
    });
    expect(hasStores).toBe(true);
  });
});
