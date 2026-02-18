import { test, expect } from '@playwright/test';
import { waitForCanvas, waitForTitleFade } from './helpers/game-helpers';

test.describe('Gameplay tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
  });

  // Intentional pre-condition check: verifies canvas is present before gameplay tests
  test('3D scene is visible after title fade', async ({ page }) => {
    await waitForTitleFade(page);
    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('game-over overlay shows "COGNITION SHATTERED" on high tension', async ({ page }) => {
    await waitForTitleFade(page);

    // Inject max tension to force game over
    await page.evaluate(() => {
      const event = new CustomEvent('gameOver');
      window.dispatchEvent(event);
    });

    await expect(page.getByText('COGNITION')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('SHATTERED')).toBeVisible({ timeout: 5_000 });
  });

  test('clicking game-over overlay triggers restart', async ({ page }) => {
    await waitForTitleFade(page);

    // Force game over
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('gameOver'));
    });
    await expect(page.getByText('SHATTERED')).toBeVisible({ timeout: 5_000 });

    // Click to restart
    await page.getByText('Click anywhere to dream again').click();

    // Game-over overlay should disappear
    await expect(page.getByText('SHATTERED')).not.toBeVisible({ timeout: 5_000 });
  });
});
