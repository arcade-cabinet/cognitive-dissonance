import { test, expect } from '@playwright/test';
import { waitForCanvas, getCanvasDimensions } from './helpers/game-helpers';

test.describe('Smoke tests', () => {
  test('page loads with 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('loading overlay "INITIALIZING CORE" appears before first frame', async ({ page }) => {
    await page.goto('/');
    // The overlay is present while WebGL compiles + PMREM + rapier init run.
    // It may fade out quickly; assert it exists in the DOM at some point
    // within the first second.
    const overlay = page.locator('[data-testid="loading-overlay"]');
    await expect(overlay).toBeAttached({ timeout: 3_000 });
  });

  test('canvas exists and has non-zero dimensions', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    const dims = await getCanvasDimensions(page);
    expect(dims).not.toBeNull();
    expect(dims!.width).toBeGreaterThan(0);
    expect(dims!.height).toBeGreaterThan(0);
  });

  test('canvas has a WebGL-backed rendering context', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    const hasContext = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      return gl !== null && canvas.width > 0 && canvas.height > 0;
    });
    expect(hasContext).toBe(true);
  });

  test('no unhandled console errors during page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await waitForCanvas(page);
    await page.waitForTimeout(3_000);
    // Filter benign WebGL warnings that browsers emit but never break things.
    const criticalErrors = errors.filter(
      (e) => !e.includes('WebGL') && !e.includes('GL_INVALID') && !e.includes('WEBGL_'),
    );
    expect(criticalErrors).toEqual([]);
  });

  test('v4 bridge is available on window', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    // The bridge is populated after createCabinet resolves (awaits rapier wasm).
    await page.waitForFunction(
      () => {
        const w = window as Record<string, unknown>;
        return (
          typeof w.__world === 'object' &&
          typeof w.__setTension === 'function' &&
          typeof w.__getLevel === 'function' &&
          typeof w.__cabinet === 'object'
        );
      },
      { timeout: 10_000 },
    );
  });

  test('default Level trait has 12-control input schema', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await page.waitForFunction(() => typeof (window as Record<string, unknown>).__getLevel === 'function', {
      timeout: 10_000,
    });
    const schemaLength = await page.evaluate(() => {
      const w = window as Record<string, unknown> & { __getLevel?: () => { inputSchema?: unknown[] } | undefined };
      const level = w.__getLevel?.();
      return level?.inputSchema?.length ?? 0;
    });
    expect(schemaLength).toBe(12);
  });
});
