import { expect, test } from '@playwright/test';
import {
  navigateToGame,
  startGame,
  verifyControlsAttached,
  verifyGamePlaying,
  verifyHUDVisible,
} from './helpers/game-helpers';

test.describe('Psyduck Panic Game', () => {
  test('should load the game page', async ({ page }) => {
    await navigateToGame(page);
  });

  test('should display game title on overlay', async ({ page }) => {
    await navigateToGame(page);
    const title = page.locator('#overlay-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('PSYDUCK PANIC');
  });

  test('should have start button', async ({ page }) => {
    await navigateToGame(page);
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('START DEBATE');
  });

  test('should have game canvas', async ({ page }) => {
    await navigateToGame(page);
    const container = page.locator('#gameCanvas');
    await expect(container).toBeVisible();

    // R3F wraps the actual canvas inside a container div
    // Use polling to handle potential layout shifts/hydration
    await expect(async () => {
      const box = await container.boundingBox();
      if (!box) throw new Error('Canvas container bounding box is null');
      expect(box.width).toBeGreaterThanOrEqual(100);
      expect(box.height).toBeGreaterThanOrEqual(75);
    }).toPass({ timeout: 10000 });

    // Verify an actual WebGL canvas exists inside the R3F container
    // Use retrying assertion for robust check
    await expect(container.locator('canvas')).toHaveCount(1, { timeout: 10000 });
  });

  test('should have control buttons', async ({ page }) => {
    await navigateToGame(page);
    await verifyControlsAttached(page);
  });

  test('should display HUD elements', async ({ page }) => {
    await navigateToGame(page);
    await expect(page.locator('.meter-container')).toBeAttached();
    await startGame(page);
    await verifyHUDVisible(page);
  });

  test('should start game when clicking start button', async ({ page }) => {
    await navigateToGame(page);
    await expect(page.locator('#overlay')).toBeVisible();
    await startGame(page);
  });

  test('should respond to keyboard controls', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    // Press ability keys (F1-F4 for 3D keyboard)
    await page.keyboard.press('F1');
    await page.keyboard.press('F2');
    await page.keyboard.press('F3');

    // Should not crash
    await verifyGamePlaying(page);
  });
});
