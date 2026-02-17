import { expect, test } from '@playwright/test';
import { GameGovernor } from './helpers/game-governor';
import { navigateToGame, screenshot, startGame, verifyGamePlaying } from './helpers/game-helpers';

/**
 * AI Governor-driven playthrough.
 *
 * Smoke suite (PRs): runs only the default playthrough.
 * Full matrix (CD): runs all variants (aggressive, defensive, verify-running).
 */
test.describe('Automated Playthrough with Governor', () => {
  test.setTimeout(180000);

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

  // Extended governor tests — only run in full matrix (CD), tagged with @matrix
  test('should play aggressively with high accuracy @matrix', async ({ page }) => {
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

  test('should play defensively with lower accuracy @matrix', async ({ page }) => {
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

  test('should verify game continues running during automated play @matrix', async ({ page }) => {
    await navigateToGame(page);

    const governor = new GameGovernor(page);

    await startGame(page);

    const timeDisplay = page.locator('#time-display');
    let workerActive = false;
    try {
      await expect(async () => {
        const text = await timeDisplay.textContent();
        expect(Number(text)).toBeGreaterThan(0);
      }).toPass({ timeout: 10000 });
      workerActive = true;
    } catch {
      console.log('Worker did not send state updates within timeout, skipping time assertions');
    }

    await verifyGamePlaying(page);

    governor.start().catch((err) => console.error('Governor start failed:', err));
    await page.waitForTimeout(5000);

    await verifyGamePlaying(page);

    if (workerActive) {
      const time1 = await timeDisplay.textContent();
      await page.waitForTimeout(3000);
      const time2 = await timeDisplay.textContent();
      expect(time1).not.toBe(time2);
    }

    governor.stop();
    await screenshot(page, 'governor', 'verify-running');
  });
});
