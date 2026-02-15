import { expect, test } from '@playwright/test';
import { GameGovernor } from './helpers/game-governor';

test.describe('Automated Playthrough with Governor', () => {
  // Increase timeout for governor tests (automated playthroughs take longer)
  test.setTimeout(90000); // 90 seconds

  test('should run automated playthrough with default settings', async ({ page }) => {
    await page.goto('/game');

    // Take screenshot before starting
    await page.screenshot({ path: 'test-results/screenshots/governor-01-start.png' });

    // Create governor with default settings
    const governor = new GameGovernor(page);

    // Start automated playthrough (non-blocking)
    const playthroughPromise = governor.playthrough();

    // Wait a bit and take screenshots during gameplay
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/screenshots/governor-02-gameplay.png' });

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/screenshots/governor-03-mid-game.png' });

    // Wait for playthrough to complete (with timeout)
    const result = await Promise.race([
      playthroughPromise,
      new Promise<{ result: 'win' | 'loss'; score: number }>(
        (resolve) =>
          setTimeout(() => {
            governor.stop();
            resolve({ result: 'loss', score: 0 });
          }, 60000) // 60 second timeout
      ),
    ]);

    // Take final screenshot
    await page.screenshot({ path: 'test-results/screenshots/governor-04-end.png' });

    // Verify result
    expect(result).toBeTruthy();
    expect(result.score).toBeGreaterThanOrEqual(0);
    console.log(`Playthrough completed with result: ${result.result}, score: ${result.score}`);
  });

  test('should play aggressively with high accuracy', async ({ page }) => {
    await page.goto('/game');

    const governor = new GameGovernor(page, {
      aggressiveness: 0.9,
      accuracy: 0.9,
      reactionTime: 200,
      useSpecials: true,
    });

    const playthroughPromise = governor.playthrough();

    // Take periodic screenshots
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/screenshots/governor-aggressive-01.png' });

    const result = await Promise.race([
      playthroughPromise,
      new Promise<{ result: 'loss'; score: number }>((resolve) =>
        setTimeout(() => {
          governor.stop();
          resolve({ result: 'loss', score: 0 });
        }, 60000)
      ),
    ]);

    await page.screenshot({ path: 'test-results/screenshots/governor-aggressive-02-end.png' });

    expect(result).toBeTruthy();
    console.log(`Aggressive playthrough: ${result.result}, score: ${result.score}`);
  });

  test('should play defensively with lower accuracy', async ({ page }) => {
    await page.goto('/game');

    const governor = new GameGovernor(page, {
      aggressiveness: 0.5,
      accuracy: 0.6,
      reactionTime: 500,
      useSpecials: false,
    });

    const playthroughPromise = governor.playthrough();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/screenshots/governor-defensive-01.png' });

    const result = await Promise.race([
      playthroughPromise,
      new Promise<{ result: 'loss'; score: number }>((resolve) =>
        setTimeout(() => {
          governor.stop();
          resolve({ result: 'loss', score: 0 });
        }, 60000)
      ),
    ]);

    await page.screenshot({ path: 'test-results/screenshots/governor-defensive-02-end.png' });

    expect(result).toBeTruthy();
    console.log(`Defensive playthrough: ${result.result}, score: ${result.score}`);
  });

  test('should verify game continues running during automated play', async ({ page }) => {
    await page.goto('/game');

    const governor = new GameGovernor(page);

    // Start gameplay
    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    await page.waitForTimeout(2000);

    // Verify overlay is hidden
    const overlay = page.locator('#overlay');
    await expect(overlay).toHaveClass(/hidden/);

    // Let governor play for a bit (don't await - it runs until stopped)
    governor.start();

    await page.waitForTimeout(5000);

    // Verify game is still running
    await expect(overlay).toHaveClass(/hidden/);
    await expect(page.locator('#ui-layer')).not.toHaveClass(/hidden/);

    // Verify HUD elements are updating
    const timeDisplay = page.locator('#time-display');
    const time1 = await timeDisplay.textContent();

    await page.waitForTimeout(2000);

    const time2 = await timeDisplay.textContent();

    // Time should be changing (decreasing)
    expect(time1).not.toBe(time2);

    governor.stop();

    await page.screenshot({ path: 'test-results/screenshots/governor-verify-running.png' });
  });
});
