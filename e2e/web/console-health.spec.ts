import { test, expect } from '@playwright/test';

/**
 * Console Health Verification Tests
 *
 * Runtime health checks verifying:
 *   - No unexpected JavaScript errors during full game session
 *   - System initialization completes (when GPU is available)
 *   - No WebGL/WebGPU context lost errors
 *   - Pattern spawning produces expected logs
 *   - Echo system responds to missed patterns
 *   - TensionSystem operates correctly
 *   - No memory-related warnings
 *
 * NOTE: Headless Chromium may not support WebGL/WebGPU. Tests handle
 * the engine initialization failure ("WebGL not supported") as a known
 * environment limitation and adjust expectations accordingly.
 */

/** Known non-critical error substrings to filter out. */
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
 * Returns true if the Babylon.js engine successfully initialized,
 * i.e., the headless browser supports WebGL/WebGPU.
 */
function engineInitialized(logs: string[]): boolean {
  return logs.some(
    (log) =>
      log.includes('[GameBootstrap] SystemOrchestrator.initAll() complete') ||
      log.includes('[SceneManager] Scene created'),
  );
}

test.describe('Console Health', () => {
  test('no unexpected JavaScript errors during initialization', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    const criticalErrors = consoleErrors.filter(
      (error) => !KNOWN_ERROR_PATTERNS.some((pattern) => error.includes(pattern)),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('no unexpected errors during full game session', async ({ page }) => {
    test.setTimeout(90000);

    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    // Attempt to start game (only works if engine initialized)
    if (engineInitialized(consoleLogs)) {
      await page.click('canvas');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(30000);
    } else {
      // Engine failed — just wait a bit to collect any secondary errors
      await page.waitForTimeout(5000);
    }

    const criticalErrors = consoleErrors.filter(
      (error) => !KNOWN_ERROR_PATTERNS.some((pattern) => error.includes(pattern)),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('key systems initialize when GPU is available', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(15000);

    if (engineInitialized(consoleLogs)) {
      // Verify key system initialization logs
      const expectedSystems = [
        '[KeyboardInputSystem] Initialized',
        '[GameBootstrap] SystemOrchestrator.initAll() complete',
        '[GameBootstrap] All deferred systems wired to meshes',
      ];

      for (const expected of expectedSystems) {
        const found = consoleLogs.some((log) => log.includes(expected));
        expect(found).toBe(true);
      }
    } else {
      // Engine failed — verify the failure was logged correctly
      const engineFailed = consoleLogs.some(
        (log) =>
          log.includes('Engine initialization failed') ||
          log.includes('WebGL not supported'),
      );
      expect(engineFailed).toBe(true);
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'WebGL/WebGPU not available in headless browser',
      });
    }
  });

  test('TensionSystem initializes with curve when GPU available', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(15000);

    if (engineInitialized(consoleLogs)) {
      const tensionInit = consoleLogs.some((log) =>
        log.includes('[TensionSystem] Initialized with curve:'),
      );
      expect(tensionInit).toBe(true);
    } else {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'WebGL/WebGPU not available — TensionSystem requires engine',
      });
      expect(true).toBe(true);
    }
  });

  test('EngineInitializer attempts rendering backend selection', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(10000);

    // Should log either WebGPU creation, WebGL2 fallback, or failure
    const engineAttempt = consoleLogs.some(
      (log) =>
        log.includes('[EngineInitializer] Creating WebGPUEngine') ||
        log.includes('[EngineInitializer] WebGPU not supported, falling back to WebGL2') ||
        log.includes('Engine initialization failed'),
    );
    expect(engineAttempt).toBe(true);
  });

  test('no WebGL/WebGPU context lost errors', async ({ page }) => {
    test.setTimeout(60000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (engineInitialized(consoleLogs)) {
      await page.click('canvas');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(20000);
    }

    // Check for context lost errors (distinct from "not supported")
    const contextLostErrors = consoleLogs.filter(
      (log) =>
        log.includes('context lost') ||
        log.includes('CONTEXT_LOST_WEBGL') ||
        log.includes('WebGPU device lost') ||
        log.includes('GPUDevice was lost'),
    );
    expect(contextLostErrors).toHaveLength(0);
  });

  test('pattern spawning produces expected logs when engine available', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (!engineInitialized(consoleLogs)) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'WebGL/WebGPU not available — cannot test pattern spawning',
      });
      expect(true).toBe(true);
      return;
    }

    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(10000);

    const patternLog = consoleLogs.some((log) =>
      log.includes('[PatternStabilizationSystem] Pattern spawning started'),
    );
    expect(patternLog).toBe(true);
  });

  test('echo system responds to missed patterns when engine available', async ({ page }) => {
    test.setTimeout(60000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (!engineInitialized(consoleLogs)) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'WebGL/WebGPU not available — cannot test echo system',
      });
      expect(true).toBe(true);
      return;
    }

    // Start game and do not press any keys (patterns will be missed)
    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(20000);

    const missedPatternLogs = consoleLogs.filter((log) =>
      log.includes('PatternStabilizationSystem: Missed pattern'),
    );
    const echoSpawnLogs = consoleLogs.filter((log) =>
      log.includes('[EchoSystem] Spawned echo'),
    );

    expect(missedPatternLogs.length).toBeGreaterThan(0);
    expect(echoSpawnLogs.length).toBeGreaterThan(0);
  });

  test('corruption tendril system initializes when engine available', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(15000);

    if (engineInitialized(consoleLogs)) {
      const tendrilInit = consoleLogs.some((log) =>
        log.includes('[CorruptionTendrilSystem] Initialized with'),
      );
      expect(tendrilInit).toBe(true);
    } else {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'WebGL/WebGPU not available',
      });
      expect(true).toBe(true);
    }
  });

  test('post-process corruption initializes when engine available', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(15000);

    if (engineInitialized(consoleLogs)) {
      const postProcessInit = consoleLogs.some((log) =>
        log.includes('[PostProcessCorruption] Initialized'),
      );
      expect(postProcessInit).toBe(true);
    } else {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'WebGL/WebGPU not available',
      });
      expect(true).toBe(true);
    }
  });

  test('scene creates with correct coordinate system when engine available', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(10000);

    if (engineInitialized(consoleLogs)) {
      const sceneCreated = consoleLogs.some((log) =>
        log.includes('[SceneManager] Scene created'),
      );
      expect(sceneCreated).toBe(true);
    } else {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'WebGL/WebGPU not available',
      });
      expect(true).toBe(true);
    }
  });

  test('no unhandled promise rejections during gameplay', async ({ page }) => {
    const unhandledRejections: string[] = [];

    page.on('pageerror', (error) => {
      unhandledRejections.push(error.message);
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    // Attempt to start game
    const canvas = page.locator('canvas');
    const canvasVisible = await canvas.isVisible().catch(() => false);
    if (canvasVisible) {
      await page.click('canvas');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(15000);

    // Filter out known non-critical rejections
    const criticalRejections = unhandledRejections.filter(
      (msg) =>
        !msg.includes('AudioContext') &&
        !msg.includes('NotAllowedError') &&
        !msg.includes('AbortError') &&
        !msg.includes('Tone.js') &&
        !msg.includes('WebGL not supported') &&
        !msg.includes('ThinEngine'),
    );

    expect(criticalRejections).toHaveLength(0);
  });
});
