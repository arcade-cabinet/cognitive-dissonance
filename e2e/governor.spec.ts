import { test, expect } from '@playwright/test';
import { waitForCanvas, waitForTitleFade } from './helpers/game-helpers';

test.describe('Governor (automated player) tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForTitleFade(page);
  });

  test('game survives 10 seconds without crashing', async ({ page }) => {
    // Expose game state for monitoring
    await page.evaluate(() => {
      (window as any).__governorStart = Date.now();
    });

    // Wait 10 seconds — game should not crash or navigate away
    await page.waitForTimeout(10_000);

    const still200 = await page.evaluate(() => document.readyState === 'complete');
    expect(still200).toBe(true);

    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('game-over -> restart cycle completes without errors', async ({ page }) => {
    // Force game over
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('gameOver'));
    });
    await expect(page.getByText('SHATTERED')).toBeVisible({ timeout: 5_000 });

    // Restart
    await page.getByText('Click anywhere to dream again').click();
    await expect(page.getByText('SHATTERED')).not.toBeVisible({ timeout: 5_000 });

    // Canvas should still be alive
    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('three full game-over/restart cycles are stable', async ({ page }) => {
    for (let cycle = 0; cycle < 3; cycle++) {
      // Force game over
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('gameOver'));
      });
      await expect(page.getByText('SHATTERED')).toBeVisible({ timeout: 5_000 });

      // Restart
      await page.getByText('Click anywhere to dream again').click();
      await expect(page.getByText('SHATTERED')).not.toBeVisible({ timeout: 5_000 });

      // Brief settle time
      await page.waitForTimeout(1_000);
    }

    // Canvas still alive after 3 cycles
    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();
  });
});
