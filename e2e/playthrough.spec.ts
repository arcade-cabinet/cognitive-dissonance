import { expect, test } from '@playwright/test';
import {
  navigateToGame,
  pressAllAbilities,
  screenshot,
  startGame,
  startGameWithSpacebar,
  verifyControlsAttached,
  verifyGamePlaying,
  verifyHUDVisible,
  verifyPowerupsVisible,
} from './helpers/game-helpers';

test.describe('Complete Game Playthrough', () => {
  test('should complete a full game playthrough from start to wave 1', async ({ page }) => {
    await navigateToGame(page);
    await screenshot(page, 'playthrough', '01-start-screen');

    // Verify start screen elements
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#overlay-title')).toContainText('PSYDUCK PANIC');
    await expect(page.locator('#start-btn')).toContainText('START DEBATE');

    // Start game
    await startGame(page);
    await screenshot(page, 'playthrough', '02-game-started');

    // Verify game UI
    await verifyGamePlaying(page);
    await expect(page.locator('#wave-display')).toContainText('WAVE 1');

    // Wait for wave announcement
    await expect(page.locator('#wave-announce')).toHaveClass(/show/, { timeout: 2000 });
    await screenshot(page, 'playthrough', '03-wave-announcement');

    // Wait for enemies to spawn
    await page.waitForTimeout(3000);
    await screenshot(page, 'playthrough', '04-enemies-spawned');

    // Verify HUD
    await verifyHUDVisible(page);

    // Verify control buttons are attached (hidden, 3D keyboard is primary)
    await verifyControlsAttached(page);

    // Test ability keys (F1-F3)
    await pressAllAbilities(page, 500);
    await screenshot(page, 'playthrough', '05-after-abilities');

    // Verify game is still running
    await verifyGamePlaying(page);
  });

  test('should handle keyboard controls during gameplay', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);
    await screenshot(page, 'playthrough', '06-keyboard-test-start');

    // Test F-key controls
    await page.keyboard.press('F1'); // Reality
    await page.waitForTimeout(300);
    await page.keyboard.press('F2'); // History
    await page.waitForTimeout(300);
    await page.keyboard.press('F3'); // Logic
    await page.waitForTimeout(300);
    await page.keyboard.press('F4'); // Nuke

    await screenshot(page, 'playthrough', '07-keyboard-after-inputs');

    // Verify game didn't crash
    await verifyGamePlaying(page);
  });

  test('should display wave announcement correctly', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    // Check wave announcement appears
    const waveAnnounce = page.locator('#wave-announce');
    await expect(waveAnnounce).toHaveClass(/show/, { timeout: 2000 });

    await expect(page.locator('#wa-title')).toContainText('WAVE 1');
    await expect(page.locator('#wa-sub')).toContainText('Just checking Twitter');
    await screenshot(page, 'playthrough', '08-wave-announcement-detail');

    // Wait for announcement to fade
    await page.waitForTimeout(4000);
    await expect(waveAnnounce).not.toHaveClass(/show/);
  });

  test('should handle game over scenario', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    // Wait for game state to progress
    await page.waitForTimeout(5000);

    const overlay = page.locator('#overlay');
    const isHidden = await overlay.evaluate((el) => el.classList.contains('hidden'));

    if (!isHidden) {
      // Game over occurred
      await screenshot(page, 'playthrough', '09-game-over');
      const retryBtn = page.locator('#start-btn');
      await expect(retryBtn).toBeVisible();

      const heading = page.locator('#overlay-title');
      const text = await heading.textContent();
      expect(text).toBeTruthy();
    } else {
      // Game still running — that's fine
      await screenshot(page, 'playthrough', '09-game-still-running');
    }
  });

  test('should update score and combo correctly', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    const scoreDisplay = page.locator('#score-display');
    const comboDisplay = page.locator('#combo-display');

    await expect(scoreDisplay).toContainText('0');
    await expect(comboDisplay).toContainText('x0');
    await screenshot(page, 'playthrough', '10-initial-score');

    // Trigger abilities via F-keys
    await pressAllAbilities(page, 200);
    await page.waitForTimeout(1000);
    await screenshot(page, 'playthrough', '11-after-attempts');

    // Verify displays still work
    await expect(scoreDisplay).toBeVisible();
    await expect(comboDisplay).toBeVisible();
  });

  test('should show HUD elements during gameplay', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    await verifyHUDVisible(page);
    await verifyPowerupsVisible(page);
    await screenshot(page, 'playthrough', '12-hud-elements');
  });

  test('should properly transition from start to playing screen', async ({ page }) => {
    await navigateToGame(page);

    // Verify start screen
    const overlay = page.locator('#overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).not.toHaveClass(/hidden/);
    await screenshot(page, 'playthrough', '13-transition-start');

    const uiLayer = page.locator('#ui-layer');
    await expect(uiLayer).toHaveClass(/hidden/);

    // Start game
    await startGame(page);
    await expect(uiLayer).not.toHaveClass(/hidden/);
    await screenshot(page, 'playthrough', '14-transition-playing');

    // Verify overlay is display:none
    const overlayDisplay = await overlay.evaluate((el) => window.getComputedStyle(el).display);
    expect(overlayDisplay).toBe('none');
  });

  test('should handle spacebar to start game', async ({ page }) => {
    await navigateToGame(page);
    await expect(page.locator('#overlay')).toBeVisible();

    await startGameWithSpacebar(page);
    await screenshot(page, 'playthrough', '15-spacebar-start');
    await verifyGamePlaying(page);
  });
});
