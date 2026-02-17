/**
 * Game State Reader
 *
 * Thin Playwright adapter that reads game state from the browser.
 * All decision logic lives in strategies.ts — this module only reads data.
 */

import type { Page } from '@playwright/test';
import type { CounterType, GameSnapshot, PlaythroughResult } from './types';

const VALID_COUNTERS = new Set<string>(['reality', 'history', 'logic']);

/** Type guard: is this string a valid CounterType? */
function isValidCounter(value: string): value is CounterType {
  return VALID_COUNTERS.has(value);
}

/** Read enemy counter types from the exposed game state (window.__gameEnemyCounters) */
export async function readEnemyCounters(page: Page): Promise<CounterType[]> {
  try {
    const counters: string[] = await page.evaluate(
      () => ((window as unknown as Record<string, unknown>).__gameEnemyCounters as string[]) || []
    );
    return counters.filter(isValidCounter);
  } catch {
    return [];
  }
}

/** Read the current game snapshot from the DOM and exposed window state */
export async function readSnapshot(page: Page): Promise<GameSnapshot> {
  const domState = await page.evaluate(() => {
    const panicBar = document.getElementById('panic-bar');
    const scoreDisplay = document.getElementById('score-display');
    const timeDisplay = document.getElementById('time-display');
    const nukeBtn = document.getElementById('btn-special');

    const panicWidth = panicBar?.style.width || '0%';
    const panic = Number.parseFloat(panicWidth.replace('%', ''));

    const score = Number.parseInt(scoreDisplay?.textContent || '0', 10);
    const time = Number.parseInt(timeDisplay?.textContent || '0', 10);

    const nukeCd = nukeBtn?.querySelector('.cooldown-bar');
    const nukeCdWidth = (nukeCd as HTMLElement)?.style.width || '0%';
    const nukeReady = Number.parseFloat(nukeCdWidth.replace('%', '')) === 0;

    return { panic, score, time, nukeReady };
  });

  const enemyCounters = await readEnemyCounters(page);
  return { ...domState, enemyCounters };
}

/** Check if the game is currently running (overlay hidden) */
export async function isGameRunning(page: Page): Promise<boolean> {
  const overlay = page.locator('#overlay');
  return overlay.evaluate((el) => el.classList.contains('hidden'));
}

/** Read the final game result from the end screen */
export async function readResult(page: Page): Promise<PlaythroughResult> {
  const title = await page.locator('#overlay-title').textContent();

  let score = 0;
  const endStats = page.locator('#end-stats');
  if ((await endStats.count()) > 0) {
    const scoreValue = await endStats.locator('.stat-value').first().textContent();
    score = Number.parseInt((scoreValue || '0').replace(/,/g, ''), 10);
  }

  const result: 'win' | 'loss' = title?.includes('CRISIS AVERTED') ? 'win' : 'loss';
  return { result, score };
}
