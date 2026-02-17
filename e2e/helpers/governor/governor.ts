/**
 * GameGovernor — Automated Playthrough Controller
 *
 * Orchestrates E2E playthroughs by composing:
 *   - State reader (Playwright adapter for DOM/window state)
 *   - Decision strategies (pure functions for counter logic)
 *   - Seeded RNG (deterministic randomness for reproducibility)
 *
 * Usage:
 *   const governor = new GameGovernor(page, { accuracy: 0.9, seed: 123 });
 *   const result = await governor.playthrough();
 */

import type { Page } from '@playwright/test';
import { startGame } from '../game-helpers';
import { createRng } from './rng';
import { isGameRunning, readResult, readSnapshot } from './state-reader';
import { decideAction } from './strategies';
import type { GovernorConfig, PlaythroughResult, ResolvedConfig } from './types';
import { resolveConfig } from './types';

export class GameGovernor {
  private page: Page;
  private config: ResolvedConfig;
  private isRunning = false;
  private rng: () => number;

  constructor(page: Page, config: GovernorConfig = {}) {
    this.page = page;
    const { resolved, seed } = resolveConfig(config);
    this.config = resolved;
    this.rng = createRng(seed);
  }

  /** Start automated gameplay */
  async start(): Promise<void> {
    this.isRunning = true;

    // Start the game if we're still on the start screen
    const overlay = this.page.locator('#overlay');
    if (await overlay.isVisible()) {
      await startGame(this.page);
    }

    await this.playLoop();
  }

  /** Stop automated gameplay */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Play through the game until completion.
   * @returns Final result (win/loss) and score.
   */
  async playthrough(): Promise<PlaythroughResult> {
    await this.start();

    // Wait for game to end (play loop already exited when overlay reappeared)
    while (this.isRunning) {
      await this.page.waitForTimeout(1000);
      if (!(await isGameRunning(this.page))) break;
    }

    return readResult(this.page);
  }

  /** Main gameplay loop — read state, decide action, execute */
  private async playLoop(): Promise<void> {
    try {
      while (this.isRunning) {
        if (!(await isGameRunning(this.page))) break;

        const snapshot = await readSnapshot(this.page);
        const action = decideAction(snapshot, this.config, this.rng);

        if (action.type === 'press') {
          await this.page.keyboard.press(action.key);
        }

        await this.page.waitForTimeout(this.config.reactionTime);
      }
    } finally {
      this.isRunning = false;
    }
  }
}

/** Helper function to run automated playthrough.
 *  Defaults accuracy to 1 (deterministic) unless caller overrides. */
export async function runAutomatedPlaythrough(
  page: Page,
  config?: GovernorConfig
): Promise<PlaythroughResult> {
  const governor = new GameGovernor(page, { accuracy: 1, ...config });
  return governor.playthrough();
}
