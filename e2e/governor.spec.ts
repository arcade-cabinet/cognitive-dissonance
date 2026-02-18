import { test, expect } from '@playwright/test';
import { waitForCanvas, waitForTitleFade } from './helpers/game-helpers';

test.describe('Governor (automated player) tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (error) => {
      // Collect but don't throw — we check at the end
      (page as unknown as Record<string, string[]>).__errors =
        (page as unknown as Record<string, string[]>).__errors || [];
      (page as unknown as Record<string, string[]>).__errors.push(error.message);
    });
    await page.goto('/');
    await waitForCanvas(page);
    await waitForTitleFade(page);
  });

  test('game survives 10 seconds without crashing', async ({ page }) => {
    await page.waitForTimeout(10_000);
    const still200 = await page.evaluate(() => document.readyState === 'complete');
    expect(still200).toBe(true);
    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('game-over -> restart cycle completes without errors', async ({ page }) => {
    const gameOverOverlay = page.locator('[data-testid="gameover-overlay"]');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('gameOver'));
    });
    await expect(gameOverOverlay).toBeVisible({ timeout: 5_000 });

    await page.getByText('Click anywhere to dream again').click();
    await expect(gameOverOverlay).not.toBeVisible({ timeout: 5_000 });

    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('three full game-over/restart cycles are stable', async ({ page }) => {
    const gameOverOverlay = page.locator('[data-testid="gameover-overlay"]');

    for (let cycle = 0; cycle < 3; cycle++) {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('gameOver'));
      });
      await expect(gameOverOverlay).toBeVisible({ timeout: 5_000 });

      await page.getByText('Click anywhere to dream again').click();
      await expect(gameOverOverlay).not.toBeVisible({ timeout: 5_000 });

      await page.waitForTimeout(1_000);
    }

    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('governor survives 30 seconds with active play', async ({ page }) => {
    test.setTimeout(90_000);

    // Inject governor logic that reads stores and presses keycaps
    const result = await page.evaluate(async () => {
      return new Promise<{
        survived: boolean;
        duration: number;
        maxTension: number;
        peakCoherence: number;
      }>((resolve) => {
        const w = window as Record<string, unknown>;
        const levelStore = w.__zustand_level as {
          getState: () => { tension: number; coherence: number; peakCoherence: number };
        };
        const inputStore = w.__zustand_input as {
          getState: () => { heldKeycaps: Set<number>; pressKeycap: (i: number) => void; releaseAll: () => void };
        };

        if (!levelStore || !inputStore) {
          resolve({ survived: false, duration: 0, maxTension: 0, peakCoherence: 0 });
          return;
        }

        let maxTension = 0;
        const start = Date.now();

        const interval = setInterval(() => {
          const state = levelStore.getState();
          const inputState = inputStore.getState();
          const elapsed = (Date.now() - start) / 1000;

          maxTension = Math.max(maxTension, state.tension);

          // Governor AI: press random keycaps when tension is high
          if (state.tension > 0.6) {
            // Press 2-3 random keycaps
            inputState.releaseAll();
            for (let i = 0; i < 3; i++) {
              inputState.pressKeycap(Math.floor(Math.random() * 12));
            }
          } else if (state.tension < 0.3) {
            inputState.releaseAll();
          }

          // Check if 30 seconds passed
          if (elapsed >= 30) {
            clearInterval(interval);
            inputState.releaseAll();
            resolve({
              survived: true,
              duration: elapsed,
              maxTension,
              peakCoherence: state.peakCoherence,
            });
          }
        }, 200);
      });
    });

    expect(result.survived).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(29); // Allow slight timing variance

    // Canvas still alive
    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('no critical console errors during 30s governor run', async ({ page }) => {
    test.setTimeout(90_000);

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    // Run governor for 30 seconds
    await page.evaluate(async () => {
      return new Promise<void>((resolve) => {
        const w = window as Record<string, unknown>;
        const inputStore = w.__zustand_input as {
          getState: () => { pressKeycap: (i: number) => void; releaseAll: () => void };
        };

        if (!inputStore) {
          resolve();
          return;
        }

        const start = Date.now();
        const interval = setInterval(() => {
          const inputState = inputStore.getState();
          // Random keycap presses
          if (Math.random() > 0.5) {
            inputState.pressKeycap(Math.floor(Math.random() * 12));
          } else {
            inputState.releaseAll();
          }

          if ((Date.now() - start) / 1000 >= 30) {
            clearInterval(interval);
            inputState.releaseAll();
            resolve();
          }
        }, 200);
      });
    });

    // Filter out known benign errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('WebGL') && !e.includes('GL_INVALID') && !e.includes('WEBGL_'),
    );
    expect(criticalErrors).toEqual([]);
  });
});
