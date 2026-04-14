import { expect, test } from '@playwright/test';
import { waitForCanvas } from './helpers/game-helpers';

/**
 * Gameplay tests — v4 edition.
 *
 * v4 is zero-framework: the cabinet IS the UI. There is no title overlay,
 * no game-over overlay, no diegetic menu. The only DOM element outside
 * the canvas is the boot "INITIALIZING CORE" overlay that fades on first
 * frame.
 *
 * All gameplay tests drive state through the v4 bridge (__setTension /
 * __getLevel / __fireGameOver) which requires rapier's WASM to finish
 * loading. That's slow-and-sometimes-hangs under CI's SwiftShader, so
 * the whole describe is skipped in CI until we land a fix (lazy rapier
 * import, SIMD variant, or hardware-GL CI runners).
 */

const SKIP_IN_CI = Boolean(process.env.CI);

test.describe('Gameplay tests', () => {
  test.skip(SKIP_IN_CI, 'rapier WASM init hangs under SwiftShader in CI');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await page.waitForFunction(
      () => typeof (window as Record<string, unknown>).__setTension === 'function',
      { timeout: 30_000 },
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
