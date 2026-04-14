import { test, expect } from '@playwright/test';
import { waitForCanvas } from './helpers/game-helpers';

/**
 * Governor (automated player) tests — v4 edition.
 *
 * v4 has no DOM game-over overlay. These tests exercise long-run stability:
 * the cabinet keeps rendering, the WebGL context doesn't get lost, the
 * v4 bridge stays functional, and no uncaught exceptions fire during
 * continuous tension cycling + keycap input.
 */

test.describe('Governor (automated player) tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await page.waitForFunction(
      () => typeof (window as Record<string, unknown>).__setTension === 'function',
      { timeout: 10_000 },
    );
  });

  test('cabinet survives 10 seconds without crashing', async ({ page }) => {
    await page.waitForTimeout(10_000);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const intact = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (!c) return false;
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      return gl !== null && !gl.isContextLost();
    });
    expect(intact).toBe(true);
  });

  test('gameOver event does not kill the cabinet', async ({ page }) => {
    await page.evaluate(() => {
      const w = window as Record<string, unknown> & { __fireGameOver?: () => void };
      w.__fireGameOver?.();
    });
    await page.waitForTimeout(1_000);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('repeated gameOver events remain stable', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const w = window as Record<string, unknown> & { __fireGameOver?: () => void };
        w.__fireGameOver?.();
      });
      await page.waitForTimeout(500);
    }
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('governor survives 20 seconds with tension cycling', async ({ page }) => {
    test.setTimeout(60_000);

    const result = await page.evaluate(async () => {
      return new Promise<{ survived: boolean; duration: number; cycles: number }>((resolve) => {
        const w = window as Record<string, unknown> & {
          __setTension?: (v: number) => void;
          __getLevel?: () => { tension?: number } | undefined;
        };
        if (!w.__setTension || !w.__getLevel) {
          resolve({ survived: false, duration: 0, cycles: 0 });
          return;
        }
        const start = Date.now();
        let cycles = 0;
        const interval = setInterval(() => {
          const elapsed = (Date.now() - start) / 1000;
          // Cycle tension in a sine-ish pattern so we exercise every state.
          const t = 0.5 + 0.45 * Math.sin(elapsed * 1.3);
          w.__setTension?.(t);
          cycles++;
          if (elapsed >= 20) {
            clearInterval(interval);
            resolve({ survived: true, duration: elapsed, cycles });
          }
        }, 200);
      });
    });

    expect(result.survived).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(19);
    expect(result.cycles).toBeGreaterThan(50);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('no critical console errors during 20s tension cycling', async ({ page }) => {
    test.setTimeout(60_000);

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.evaluate(async () => {
      return new Promise<void>((resolve) => {
        const w = window as Record<string, unknown> & { __setTension?: (v: number) => void };
        if (!w.__setTension) {
          resolve();
          return;
        }
        const start = Date.now();
        const interval = setInterval(() => {
          const elapsed = (Date.now() - start) / 1000;
          w.__setTension?.(Math.random());
          if (elapsed >= 20) {
            clearInterval(interval);
            resolve();
          }
        }, 250);
      });
    });

    const criticalErrors = errors.filter(
      (e) => !e.includes('WebGL') && !e.includes('GL_INVALID') && !e.includes('WEBGL_'),
    );
    expect(criticalErrors).toEqual([]);
  });
});
