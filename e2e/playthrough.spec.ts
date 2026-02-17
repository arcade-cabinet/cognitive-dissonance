import { expect, test } from '@playwright/test';
import {
  E2E_PLAYTHROUGH_TIMEOUT,
  navigateToGame,
  pressAllAbilities,
  screenshot,
  startGame,
  verifyControlsAttached,
  verifyGamePlaying,
  verifyHUDVisible,
  verifyPowerupsVisible,
  WAVE_ANNOUNCE_TIMEOUT,
} from './helpers/game-helpers';

/**
 * Single comprehensive playthrough test.
 *
 * Covers the full game flow in ONE test instead of 8 separate game starts:
 * start screen → start game → wave announcement → HUD → abilities →
 * score/combo → controls → game still running.
 *
 * The governor.spec.ts handles AI-driven extended playthroughs.
 * The device-responsive.spec.ts handles cross-device validation.
 */
test.describe('Complete Game Playthrough', () => {
  test('should complete a full game playthrough from start to wave 1', async ({ page }) => {
    test.setTimeout(E2E_PLAYTHROUGH_TIMEOUT);

    await navigateToGame(page);
    await screenshot(page, 'playthrough', '01-start-screen');

    // ── Start screen ──────────────────────────────────
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#overlay')).not.toHaveClass(/hidden/);
    await expect(page.locator('#overlay-title')).toContainText('COGNITIVE');
    await expect(page.locator('#start-btn')).toContainText('NEW GAME');
    await expect(page.locator('#ui-layer')).toHaveClass(/hidden/);

    // ── Start game via spacebar ───────────────────────
    await startGame(page);

    // Check wave announcement immediately (it has a 5s duration)
    await expect(page.locator('#wave-announce')).toHaveClass(/show/, {
      timeout: WAVE_ANNOUNCE_TIMEOUT,
    });

    await screenshot(page, 'playthrough', '02-game-started');

    // Verify transition: overlay hidden, UI visible
    await verifyGamePlaying(page);
    await expect(page.locator('#ui-layer')).not.toHaveClass(/hidden/);

    // ── Wave announcement ─────────────────────────────
    await expect(page.locator('#wave-display')).toContainText('WAVE 1');
    // Already checked wave-announce above
    await screenshot(page, 'playthrough', '03-wave-announcement');

    // ── HUD elements ──────────────────────────────────
    await verifyHUDVisible(page);
    await verifyPowerupsVisible(page);
    await verifyControlsAttached(page);

    // ── Score and combo initial state ─────────────────
    await expect(page.locator('#score-display')).toContainText('0');
    await expect(page.locator('#combo-display')).toContainText('x0');

    // ── Wait for enemies to spawn ─────────────────────
    await page.waitForTimeout(3000);
    await screenshot(page, 'playthrough', '04-enemies-spawned');

    // ── Ability keys (F1-F3) + nuke (F4) ──────────────
    await pressAllAbilities(page, 500);
    await page.keyboard.press('F4'); // Nuke
    await page.waitForTimeout(500);
    await screenshot(page, 'playthrough', '05-after-abilities');

    // ── Verify game is still running ──────────────────
    await verifyGamePlaying(page);
    await expect(page.locator('#score-display')).toBeVisible();
    await expect(page.locator('#combo-display')).toBeVisible();
  });
});
