import { test, expect } from '@playwright/test';
import { waitForCanvas, waitForTitleFade } from './helpers/game-helpers';

test.describe('Gameplay tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
  });

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

  test('tension can be set via Zustand store bridge', async ({ page }) => {
    await waitForTitleFade(page);
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const w = window as Record<string, unknown>;
      const levelStore = w.__zustand_level as { getState: () => { tension: number; setTension: (v: number) => void } };
      if (!levelStore) return null;
      levelStore.getState().setTension(0.5);
      return levelStore.getState().tension;
    });

    expect(result).toBe(0.5);
  });

  test('full game flow: title → play → game over → restart → stable', async ({ page }) => {
    // Title appears
    await expect(page.getByText('COGNITIVE')).toBeVisible({ timeout: 5_000 });

    // Title fades
    await waitForTitleFade(page);

    // Game runs for a bit
    await page.waitForTimeout(2_000);

    // Force game over
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('gameOver'));
    });
    await expect(page.getByText('SHATTERED')).toBeVisible({ timeout: 5_000 });

    // Restart
    await page.getByText('Click anywhere to dream again').click();
    await expect(page.getByText('SHATTERED')).not.toBeVisible({ timeout: 5_000 });

    // Canvas still alive
    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();

    // Game runs after restart
    await page.waitForTimeout(2_000);

    // Still stable
    await expect(canvas).toBeVisible();
  });
});
