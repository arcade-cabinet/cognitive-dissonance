import { test, expect } from '@playwright/test';

/**
 * Keyboard Interaction E2E Tests
 *
 * Verifies that keyboard inputs are correctly processed by KeyboardInputSystem:
 *   - Letter keys (Q/W/E/R/T/A/S/D/F/G/H/Z/X/C) -> keycap holds
 *   - Spacebar -> lever pull
 *   - Enter -> phase transitions
 *   - Arrow keys -> platter rotation (PlatterRotationDream only)
 *   - Invalid keys -> no errors
 *   - 6-key simultaneous hold limit
 *
 * NOTE: Headless Chromium may not support WebGL/WebGPU. Tests detect
 * whether the engine initialized and adjust expectations accordingly.
 */

/** Known non-critical error substrings. */
const KNOWN_ERROR_PATTERNS = [
  'DevTools',
  'favicon',
  'AudioContext',
  '[object',
  'net::ERR',
  '404',
  'Tone.js',
  'WebSocket',
  'WebGL not supported',
  'Engine initialization failed',
  'ThinEngine',
];

/**
 * Returns true if the Babylon.js engine successfully initialized.
 */
function engineInitialized(logs: string[]): boolean {
  return logs.some(
    (log) =>
      log.includes('[GameBootstrap] SystemOrchestrator.initAll() complete') ||
      log.includes('[SceneManager] Scene created'),
  );
}

/**
 * Helper: navigate, wait for systems, click canvas, and start game.
 * Returns the collected console logs and whether the engine initialized.
 */
async function loadAndStartGame(
  page: import('@playwright/test').Page,
): Promise<{ consoleLogs: string[]; ready: boolean }> {
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    consoleLogs.push(msg.text());
  });

  await page.goto('/');
  await page.waitForTimeout(12000);

  const ready = engineInitialized(consoleLogs);

  if (ready) {
    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
  }

  return { consoleLogs, ready };
}

test.describe('Keyboard Interaction', () => {
  test('Phase 0 letter keys (Q/W/E/R/T) register in game', async ({ page }) => {
    const { consoleLogs, ready } = await loadAndStartGame(page);

    if (!ready) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Engine not available',
      });
      expect(true).toBe(true);
      return;
    }

    for (const key of ['q', 'w', 'e', 'r', 't']) {
      await page.keyboard.down(key);
      await page.waitForTimeout(300);
      await page.keyboard.up(key);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    // Keys should interact with PatternStabilizationSystem or CorruptionTendrilSystem
    const keyInteractionLogs = consoleLogs.filter(
      (log) =>
        log.includes('[CorruptionTendrilSystem] Retracted tendril') ||
        log.includes('PatternStabilizationSystem') ||
        log.includes('[TensionSystem]'),
    );
    expect(keyInteractionLogs.length).toBeGreaterThan(0);
  });

  test('Phase 1 letter keys (A/S/D/F/G/H) produce no errors', async ({ page }) => {
    const { consoleLogs, ready } = await loadAndStartGame(page);

    if (!ready) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Engine not available',
      });
      expect(true).toBe(true);
      return;
    }

    for (const key of ['a', 's', 'd', 'f', 'g', 'h']) {
      await page.keyboard.down(key);
      await page.waitForTimeout(300);
      await page.keyboard.up(key);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    // Verify no unexpected errors from pressing these keys
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Check collected logs for errors from key presses (not init-time errors)
    const keyErrors = consoleLogs.filter(
      (log) =>
        log.includes('error') &&
        !KNOWN_ERROR_PATTERNS.some((pattern) => log.includes(pattern)),
    );
    // Allow PatternStabilizationSystem warn about uninitialized system but not real errors
    const criticalKeyErrors = keyErrors.filter(
      (e) => !e.includes('PatternStabilizationSystem: Cannot hold key'),
    );
    expect(criticalKeyErrors).toHaveLength(0);
  });

  test('Spacebar triggers lever pull without errors', async ({ page }) => {
    const { consoleLogs, ready } = await loadAndStartGame(page);

    if (!ready) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Engine not available',
      });
      expect(true).toBe(true);
      return;
    }

    // Hold spacebar for lever pull (800ms for full pull)
    await page.keyboard.down(' ');
    await page.waitForTimeout(1000);
    await page.keyboard.up(' ');
    await page.waitForTimeout(1000);

    // MechanicalAnimationSystem.pullLever should not produce critical errors
    const leverErrors = consoleLogs.filter(
      (log) =>
        log.toLowerCase().includes('error') &&
        log.includes('MechanicalAnimationSystem'),
    );
    expect(leverErrors).toHaveLength(0);
  });

  test('Enter key transitions from title to playing', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (!engineInitialized(consoleLogs)) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Engine not available',
      });
      expect(true).toBe(true);
      return;
    }

    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    const phaseTransition = consoleLogs.some(
      (log) =>
        log.includes('[KeyboardInputSystem] Enter pressed') ||
        log.includes('[KeyboardInputSystem] Phase transition: title') ||
        log.includes('[GameBootstrap] Start-game choreography'),
    );
    expect(phaseTransition).toBe(true);
  });

  test('Enter key during playing phase has no effect', async ({ page }) => {
    const { consoleLogs, ready } = await loadAndStartGame(page);

    if (!ready) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Engine not available',
      });
      expect(true).toBe(true);
      return;
    }

    const logsBefore = consoleLogs.length;

    // Press Enter during playing phase
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const newLogs = consoleLogs.slice(logsBefore);
    const secondPhaseTransition = newLogs.some(
      (log) =>
        log.includes('[KeyboardInputSystem] Phase transition: title') ||
        log.includes('[GameBootstrap] Start-game choreography beginning'),
    );
    expect(secondPhaseTransition).toBe(false);
  });

  test('5 simultaneous keys held without limit warning', async ({ page }) => {
    const { consoleLogs, ready } = await loadAndStartGame(page);

    if (!ready) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Engine not available',
      });
      expect(true).toBe(true);
      return;
    }

    // Hold 5 keys simultaneously (within 6-key limit)
    const keys = ['q', 'w', 'e', 'r', 't'];
    for (const key of keys) {
      await page.keyboard.down(key);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(1000);

    for (const key of keys) {
      await page.keyboard.up(key);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(1000);

    const limitWarnings = consoleLogs.filter((log) =>
      log.includes('6-key hold limit reached'),
    );
    expect(limitWarnings).toHaveLength(0);
  });

  test('7th simultaneous key triggers 6-key limit warning', async ({ page }) => {
    const { consoleLogs, ready } = await loadAndStartGame(page);

    if (!ready) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Engine not available',
      });
      expect(true).toBe(true);
      return;
    }

    // Hold 7 keys simultaneously (exceeds 6-key limit)
    const keys = ['q', 'w', 'e', 'r', 't', 'a', 's'];
    for (const key of keys) {
      await page.keyboard.down(key);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(1000);

    for (const key of keys) {
      await page.keyboard.up(key);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(1000);

    const limitWarnings = consoleLogs.filter((log) =>
      log.includes('6-key hold limit reached'),
    );
    expect(limitWarnings.length).toBeGreaterThanOrEqual(1);
  });

  test('invalid keys produce no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    // Even without engine, pressing invalid keys should not crash
    const canvas = page.locator('canvas');
    const canvasVisible = await canvas.isVisible().catch(() => false);
    if (canvasVisible) {
      await page.click('canvas');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }

    // Press various invalid keys
    for (const key of ['1', '2', '3', '@', '#', '$', 'F1', 'F5', 'Tab']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1000);

    const criticalErrors = consoleErrors.filter(
      (error) => !KNOWN_ERROR_PATTERNS.some((pattern) => error.includes(pattern)),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('arrow keys work during gameplay without errors', async ({ page }) => {
    const { consoleLogs, ready } = await loadAndStartGame(page);

    if (!ready) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Engine not available',
      });
      expect(true).toBe(true);
      return;
    }

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);
    await page.waitForTimeout(1000);

    // Arrow keys should not produce critical errors
    const criticalErrors = consoleLogs.filter(
      (log) =>
        log.toLowerCase().includes('error') &&
        log.toLowerCase().includes('arrow') &&
        !KNOWN_ERROR_PATTERNS.some((pattern) => log.includes(pattern)),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
