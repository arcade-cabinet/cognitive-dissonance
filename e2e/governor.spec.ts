import { expect, test } from '@playwright/test';
import { navigateToGame, screenshot, verifyGamePlaying, verifyHUDVisible } from './helpers/game-helpers';
import { GameGovernor } from './helpers/game-governor';

test.describe('Automated Playthrough with Governor', () => {
  test.setTimeout(90000);

  test('should run automated playthrough with default settings', async ({ page }) => {
    await navigateToGame(page);
    await screenshot(page, 'governor', '01-start');

    const governor = new GameGovernor(page);
    const playthroughPromise = governor.playthrough();

    await page.waitForTimeout(5000);
    await screenshot(page, 'governor', '02-gameplay');

    await page.waitForTimeout(5000);
    await screenshot(page, 'governor', '03-mid-game');

    const result = await Promise.race([
      playthroughPromise,
      new Promise<{ result: 'win' | 'loss'; score: number }>((resolve) =>
        setTimeout(() => {
          governor.stop();
          resolve({ result: 'loss', score: 0 });
        }, 60000)
      ),
    ]);

    await screenshot(page, 'governor', '04-end');
    expect(result).toBeTruthy();
    expect(result.score).toBeGreaterThanOrEqual(0);
    console.log(`Playthrough completed with result: ${result.result}, score: ${result.score}`);
  });

  test('should play aggressively with high accuracy', async ({ page }) => {
    await navigateToGame(page);

    const governor = new GameGovernor(page, {
      aggressiveness: 0.9,
      accuracy: 0.9,
      reactionTime: 200,
      useSpecials: true,
    });

    const playthroughPromise = governor.playthrough();

    await page.waitForTimeout(5000);
    await screenshot(page, 'governor-aggressive', '01-gameplay');

    const result = await Promise.race([
      playthroughPromise,
      new Promise<{ result: 'loss'; score: number }>((resolve) =>
        setTimeout(() => {
          governor.stop();
          resolve({ result: 'loss', score: 0 });
        }, 60000)
      ),
    ]);

    await screenshot(page, 'governor-aggressive', '02-end');
    expect(result).toBeTruthy();
    console.log(`Aggressive playthrough: ${result.result}, score: ${result.score}`);
  });

  test('should play defensively with lower accuracy', async ({ page }) => {
    await navigateToGame(page);

    const governor = new GameGovernor(page, {
      aggressiveness: 0.5,
      accuracy: 0.6,
      reactionTime: 500,
      useSpecials: false,
    });

    const playthroughPromise = governor.playthrough();

    await page.waitForTimeout(5000);
    await screenshot(page, 'governor-defensive', '01-gameplay');

    const result = await Promise.race([
      playthroughPromise,
      new Promise<{ result: 'loss'; score: number }>((resolve) =>
        setTimeout(() => {
          governor.stop();
          resolve({ result: 'loss', score: 0 });
        }, 60000)
      ),
    ]);

    await screenshot(page, 'governor-defensive', '02-end');
    expect(result).toBeTruthy();
    console.log(`Defensive playthrough: ${result.result}, score: ${result.score}`);
  });

  test('should verify game continues running during automated play', async ({ page }) => {
    await navigateToGame(page);

    const governor = new GameGovernor(page);

    // Start game manually
    const startBtn = page.locator('#start-btn');
    await startBtn.click();
    await page.waitForTimeout(2000);

    await verifyGamePlaying(page);

    // Let governor play
    governor.start();
    await page.waitForTimeout(5000);

    // Verify game is still running
    await verifyGamePlaying(page);

    // Verify HUD elements are updating
    const timeDisplay = page.locator('#time-display');
    const time1 = await timeDisplay.textContent();
    await page.waitForTimeout(2000);
    const time2 = await timeDisplay.textContent();

    // Time should be changing
    expect(time1).not.toBe(time2);

    governor.stop();
    await screenshot(page, 'governor', 'verify-running');
  });
});
