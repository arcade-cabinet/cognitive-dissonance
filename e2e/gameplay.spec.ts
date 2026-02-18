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

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('gameOver'));
    });

    const gameOverOverlay = page.locator('[data-testid="gameover-overlay"]');
    await expect(gameOverOverlay).toBeVisible({ timeout: 5_000 });
    await expect(gameOverOverlay.getByRole('heading', { name: 'SHATTERED' })).toBeVisible();
  });

  test('clicking game-over overlay triggers restart', async ({ page }) => {
    await waitForTitleFade(page);

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('gameOver'));
    });

    const gameOverOverlay = page.locator('[data-testid="gameover-overlay"]');
    await expect(gameOverOverlay).toBeVisible({ timeout: 5_000 });

    // Click to restart
    await page.getByText('Click anywhere to dream again').click();

    await expect(gameOverOverlay).not.toBeVisible({ timeout: 5_000 });
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
    // Loading screen appears
    await expect(page.getByText('INITIALIZING CORE')).toBeVisible({ timeout: 3_000 });

    // Title appears after loading
    await expect(page.locator('[data-testid="title-overlay"]')).toBeVisible({ timeout: 8_000 });

    // Title fades
    await waitForTitleFade(page);

    // Game runs for a bit
    await page.waitForTimeout(2_000);

    // Force game over
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('gameOver'));
    });

    const gameOverOverlay = page.locator('[data-testid="gameover-overlay"]');
    await expect(gameOverOverlay).toBeVisible({ timeout: 5_000 });

    // High score info visible
    await expect(gameOverOverlay.getByText('Peak coherence')).toBeVisible();

    // Share button visible
    await expect(gameOverOverlay.getByText('Share this dream')).toBeVisible();

    // Restart
    await page.getByText('Click anywhere to dream again').click();
    await expect(gameOverOverlay).not.toBeVisible({ timeout: 5_000 });

    // Canvas still alive
    const canvas = page.locator('#reactylon-canvas, canvas').first();
    await expect(canvas).toBeVisible();

    await page.waitForTimeout(2_000);
    await expect(canvas).toBeVisible();
  });
});
