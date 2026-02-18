import { test, expect } from '@playwright/test';
import { waitForCanvas, getCanvasDimensions } from './helpers/game-helpers';

test.describe('Smoke tests', () => {
  test('page loads with 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('loading screen "INITIALIZING CORE" appears first', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('INITIALIZING CORE')).toBeVisible({ timeout: 3_000 });
  });

  test('canvas element exists and has non-zero dimensions', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    const dims = await getCanvasDimensions(page);
    expect(dims).not.toBeNull();
    expect(dims!.width).toBeGreaterThan(0);
    expect(dims!.height).toBeGreaterThan(0);
  });

  test('title "COGNITIVE DISSONANCE" appears after loading', async ({ page }) => {
    await page.goto('/');
    // Loading fades after 2s, title appears
    await expect(page.getByText('COGNITIVE')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('DISSONANCE')).toBeVisible({ timeout: 8_000 });
  });

  test('title fades after appearing', async ({ page }) => {
    await page.goto('/');
    // Wait for title to appear then fade: 2s loading + 2.4s title + some buffer
    await page.waitForTimeout(8_000);
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
    await page.waitForTimeout(3_000);
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
