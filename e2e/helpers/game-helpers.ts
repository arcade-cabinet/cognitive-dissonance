/**
 * Shared E2E Test Helpers
 *
 * DRY utilities for common game testing patterns.
 * Used across all Playwright test suites.
 */

import type { Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';

// ─── Timeouts ────────────────────────────────────────────────

export const GAME_START_TIMEOUT = 10000;
export const WAVE_ANNOUNCE_TIMEOUT = 10000;
export const GAMEPLAY_TIMEOUT = 60000;

// ─── Navigation ──────────────────────────────────────────────

/** Navigate to the game page and wait for the container to load */
export async function navigateToGame(page: Page): Promise<void> {
  await page.goto('/game');
  await expect(page.locator('#game-container')).toBeVisible();
}

// ─── Game Start ──────────────────────────────────────────────

/** Start the game via spacebar and wait for the overlay to hide.
 *  Uses keyboard instead of click because an unhandled font-fetch
 *  rejection from troika-three-text (offline CI) breaks React 18's
 *  synthetic event dispatch for mouse/pointer events while native
 *  keyboard listeners remain unaffected. */
export async function startGame(page: Page): Promise<void> {
  const startBtn = page.locator('#start-btn');
  await expect(startBtn).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.locator('#overlay')).toHaveClass(/hidden/, {
    timeout: GAME_START_TIMEOUT,
  });
}

/** Start the game by pressing spacebar */
export async function startGameWithSpacebar(page: Page): Promise<void> {
  await page.keyboard.press(' ');
  await expect(page.locator('#overlay')).toHaveClass(/hidden/, {
    timeout: GAME_START_TIMEOUT,
  });
}

// ─── Verification ────────────────────────────────────────────

/** Verify all HUD elements are visible during gameplay */
export async function verifyHUDVisible(page: Page): Promise<void> {
  await expect(page.locator('#wave-display')).toBeVisible();
  await expect(page.locator('#time-display')).toBeVisible();
  await expect(page.locator('#score-display')).toBeVisible();
  await expect(page.locator('#panic-bar')).toBeVisible();
  await expect(page.locator('#combo-display')).toBeVisible();
}

/** Verify control buttons exist in the DOM (hidden for a11y/e2e, 3D keyboard is primary) */
export async function verifyControlsAttached(page: Page): Promise<void> {
  await expect(page.locator('#btn-reality')).toBeAttached();
  await expect(page.locator('#btn-history')).toBeAttached();
  await expect(page.locator('#btn-logic')).toBeAttached();
  await expect(page.locator('#btn-special')).toBeAttached();
}

/** Verify powerup indicators are visible */
export async function verifyPowerupsVisible(page: Page): Promise<void> {
  await expect(page.locator('#pu-slow')).toBeVisible();
  await expect(page.locator('#pu-shield')).toBeVisible();
  await expect(page.locator('#pu-double')).toBeVisible();
}

/** Verify the game is currently playing (overlay hidden, HUD visible) */
export async function verifyGamePlaying(page: Page): Promise<void> {
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  await expect(page.locator('#ui-layer')).not.toHaveClass(/hidden/);
}

// ─── Canvas ──────────────────────────────────────────────────

/** Get canvas bounding box with polling for WebGL init */
export async function getCanvasBoundingBox(
  page: Page
): Promise<{ x: number; y: number; width: number; height: number }> {
  const canvas = page.locator('#gameCanvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });

  let resultBox: { x: number; y: number; width: number; height: number } | null = null;
  await expect(async () => {
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box is null');
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    resultBox = box;
  }).toPass({ timeout: 10000 });

  if (!resultBox) throw new Error('Failed to get canvas bounding box');
  return resultBox;
}

// ─── Screenshots ─────────────────────────────────────────────

/** Get standardized device name from test info */
export function getDeviceName(testInfo: TestInfo): string {
  return testInfo.project.name.replace(/\s+/g, '-').toLowerCase();
}

/** Take a screenshot with a standardized name: {prefix}-{stage}.png */
export async function screenshot(page: Page, prefix: string, stage: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${prefix}-${stage}.png`,
    fullPage: false,
  });
}

/** Take a device-specific screenshot */
export async function deviceScreenshot(
  page: Page,
  testInfo: TestInfo,
  stage: string
): Promise<void> {
  const device = getDeviceName(testInfo);
  await screenshot(page, device, stage);
}

// ─── Keyboard Abilities ──────────────────────────────────────
// The 3D keyboard uses F1-F4 keys (not 1/2/3/Q)

/** Press all ability keys in sequence with optional condition-based waits */
export async function pressAllAbilities(
  page: Page,
  delayMs = 300,
  useConditionalWait = false
): Promise<void> {
  const keys = ['F1', 'F2', 'F3'] as const;

  for (const key of keys) {
    await page.keyboard.press(key);
    if (useConditionalWait) {
      // Wait for the cooldown indicator to appear on the key
      await page
        .waitForFunction(
          () => {
            const bar = document.querySelector('#panic-bar');
            return bar !== null;
          },
          { timeout: 2000 }
        )
        .catch(() => {});
    } else {
      await page.waitForTimeout(delayMs);
    }
  }
}

/** Press the nuke key */
export async function pressNuke(page: Page): Promise<void> {
  await page.keyboard.press('F4');
}
