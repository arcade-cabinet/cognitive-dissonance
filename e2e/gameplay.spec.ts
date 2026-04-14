import { test, expect } from '@playwright/test';
import { waitForCanvas } from './helpers/game-helpers';

/**
 * Gameplay tests — v4 edition.
 *
 * v4 is zero-framework: the cabinet IS the UI. There is no title overlay,
 * no game-over overlay, no diegetic menu. The only DOM element outside
 * the canvas is the boot "INITIALIZING CORE" overlay that fades on first
 * frame.
 *
 * These tests assert the v4 bridge drives Level/Input correctly and the
 * cabinet remains responsive to state mutations.
 */

test.describe('Gameplay tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await page.waitForFunction(
      () => typeof (window as Record<string, unknown>).__setTension === 'function',
      { timeout: 10_000 },
    );
  });

  test('canvas stays visible through tension changes', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    await page.evaluate(() => {
      const w = window as Record<string, unknown> & { __setTension?: (v: number) => void };
      w.__setTension?.(0.5);
    });
    await page.waitForTimeout(300);
    await expect(canvas).toBeVisible();

    await page.evaluate(() => {
      const w = window as Record<string, unknown> & { __setTension?: (v: number) => void };
      w.__setTension?.(0.95);
    });
    await page.waitForTimeout(300);
    await expect(canvas).toBeVisible();
  });

  test('setTension propagates to Level trait', async ({ page }) => {
    const applied = await page.evaluate(() => {
      const w = window as Record<string, unknown> & {
        __setTension?: (v: number) => void;
        __getLevel?: () => { tension?: number } | undefined;
      };
      w.__setTension?.(0.7);
      return w.__getLevel?.()?.tension;
    });
    // tension is clamped to [0,1] in the setter
    expect(applied).toBeGreaterThan(0.69);
    expect(applied).toBeLessThan(0.71);
  });

  test('gameOver event fires without crashing the cabinet', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    await page.evaluate(() => {
      const w = window as Record<string, unknown> & { __fireGameOver?: () => void };
      w.__fireGameOver?.();
    });

    await page.waitForTimeout(1_000);

    // Canvas must still be visible and rendering (WebGL context alive).
    await expect(canvas).toBeVisible();
    const stillRendering = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (!c) return false;
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      return gl !== null && !gl.isContextLost();
    });
    expect(stillRendering).toBe(true);
  });
});
