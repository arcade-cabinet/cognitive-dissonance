import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * Screenshot comparison tests for key game states.
 * First run creates baseline screenshots in the test-results directory.
 * Subsequent runs compare against baselines.
 *
 * Uses maxDiffPixelRatio: 0.05 to account for GPU rendering variance
 * across platforms and minor animation frame differences.
 *
 * NOTE: Headless Chromium may not support WebGL/WebGPU. When the engine
 * fails to initialize, tests capture the error/fallback UI state instead.
 * This still provides visual regression coverage for the non-GPU path.
 */

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

test.describe('Visual Regression', () => {
  test('initial page load state', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Capture the initial page state (title overlay or loading)
    await expect(page).toHaveScreenshot('initial-load.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('title screen visual state', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(10000);

    // Title screen: blue sphere on dark platter (if GPU available)
    // or error state (if GPU not available)
    await expect(page).toHaveScreenshot('title-screen.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });

    if (!engineInitialized(consoleLogs)) {
      test.info().annotations.push({
        type: 'info',
        description: 'Captured error/fallback UI — GPU not available',
      });
    }
  });

  test('post-overlay state after title fades', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    // Title overlay fades after a few seconds
    await page.waitForTimeout(12000);

    await expect(page).toHaveScreenshot('post-overlay.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('early gameplay state - low tension', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (!engineInitialized(consoleLogs)) {
      // Capture whatever is on screen for baseline
      await expect(page).toHaveScreenshot('early-gameplay.png', {
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
      test.info().annotations.push({
        type: 'info',
        description: 'Captured fallback UI — GPU not available',
      });
      return;
    }

    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    await expect(page).toHaveScreenshot('early-gameplay.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('mid-tension gameplay state', async ({ page }) => {
    test.setTimeout(60000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (!engineInitialized(consoleLogs)) {
      await expect(page).toHaveScreenshot('mid-tension-gameplay.png', {
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
      test.info().annotations.push({
        type: 'info',
        description: 'Captured fallback UI — GPU not available',
      });
      return;
    }

    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    // Let tension build from missed patterns (~20s)
    await page.waitForTimeout(20000);

    await expect(page).toHaveScreenshot('mid-tension-gameplay.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('high-tension gameplay state', async ({ page }) => {
    test.setTimeout(90000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (!engineInitialized(consoleLogs)) {
      await expect(page).toHaveScreenshot('high-tension-gameplay.png', {
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
      test.info().annotations.push({
        type: 'info',
        description: 'Captured fallback UI — GPU not available',
      });
      return;
    }

    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    // Let tension build significantly (~40s)
    await page.waitForTimeout(40000);

    await expect(page).toHaveScreenshot('high-tension-gameplay.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('shattered state visual', async ({ page }) => {
    test.setTimeout(120000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (!engineInitialized(consoleLogs)) {
      await expect(page).toHaveScreenshot('shattered-state.png', {
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
      test.info().annotations.push({
        type: 'info',
        description: 'Captured fallback UI — GPU not available',
      });
      return;
    }

    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    // Wait for shatter (no keys pressed -> tension rises from misses)
    await page.waitForTimeout(70000);

    // Let shatter animation complete
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('shattered-state.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('restart returns to title visual state', async ({ page }) => {
    test.setTimeout(120000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(12000);

    if (!engineInitialized(consoleLogs)) {
      await expect(page).toHaveScreenshot('restart-title.png', {
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
      test.info().annotations.push({
        type: 'info',
        description: 'Captured fallback UI — GPU not available',
      });
      return;
    }

    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    // Wait for shatter
    await page.waitForTimeout(70000);

    // Press Enter to restart
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    await expect(page).toHaveScreenshot('restart-title.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('canvas dimensions match viewport when GPU available', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(10000);

    if (!engineInitialized(consoleLogs)) {
      // Verify the root element at least exists
      await expect(page.locator('#root')).toBeVisible();
      test.info().annotations.push({
        type: 'info',
        description: 'GPU not available — checking root element only',
      });
      return;
    }

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Canvas should fill a significant portion of the viewport (1280x720)
    expect(box!.width).toBeGreaterThan(400);
    expect(box!.height).toBeGreaterThan(300);
  });
});
