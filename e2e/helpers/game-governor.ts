/**
 * Game Governor - Automated playthrough controller for testing
 *
 * This module provides automated game control for E2E testing,
 * simulating realistic player behavior and decision-making.
 */

import type { Page } from '@playwright/test';

export interface GovernorConfig {
  /** How aggressively to counter enemies (0-1) */
  aggressiveness?: number;
  /** Reaction time in ms */
  reactionTime?: number;
  /** Whether to use special abilities */
  useSpecials?: boolean;
  /** Target accuracy (0-1) */
  accuracy?: number;
}

export class GameGovernor {
  private page: Page;
  private config: Required<GovernorConfig>;
  private isRunning = false;

  constructor(page: Page, config: GovernorConfig = {}) {
    this.page = page;
    this.config = {
      aggressiveness: config.aggressiveness ?? 0.7,
      reactionTime: config.reactionTime ?? 300,
      useSpecials: config.useSpecials ?? true,
      accuracy: config.accuracy ?? 0.8,
    };
  }

  /**
   * Start automated gameplay
   */
  async start(): Promise<void> {
    this.isRunning = true;

    // Click start button
    const startBtn = this.page.locator('#start-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Wait for game to start
    await this.page.waitForTimeout(1000);

    // Start gameplay loop
    await this.playLoop();
  }

  /**
   * Stop automated gameplay
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Main gameplay loop
   */
  private async playLoop(): Promise<void> {
    while (this.isRunning) {
      // Check if game is still running
      const overlay = this.page.locator('#overlay');
      const isHidden = await overlay.evaluate((el) => el.classList.contains('hidden'));

      if (!isHidden) {
        // Game over or paused
        break;
      }

      // Get game state
      const state = await this.getGameState();

      // Make decisions based on state
      if (state.panic > 50 && this.config.useSpecials && state.nukeReady) {
        await this.activateNuke();
      } else {
        await this.tryCounterEnemies();
      }

      // Wait for reaction time
      await this.page.waitForTimeout(this.config.reactionTime);
    }
  }

  /**
   * Get current game state
   */
  private async getGameState(): Promise<{
    panic: number;
    score: number;
    time: number;
    nukeReady: boolean;
  }> {
    return await this.page.evaluate(() => {
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
  }

  /**
   * Try to counter visible enemies
   */
  private async tryCounterEnemies(): Promise<void> {
    // Random decision based on accuracy
    if (Math.random() > this.config.accuracy) {
      // Miss intentionally to simulate human error
      const randomKey = ['F1', 'F2', 'F3'][Math.floor(Math.random() * 3)];
      await this.page.keyboard.press(randomKey);
      return;
    }

    // Try to counter enemies intelligently
    // In a real implementation, we'd analyze the canvas or game state
    // For now, cycle through abilities
    const abilities = ['F1', 'F2', 'F3'];
    const ability = abilities[Math.floor(Math.random() * abilities.length)];

    if (Math.random() < this.config.aggressiveness) {
      await this.page.keyboard.press(ability);
    }
  }

  /**
   * Activate nuke ability
   */
  private async activateNuke(): Promise<void> {
    await this.page.keyboard.press('F4');
  }

  /**
   * Play through the game until completion
   * @returns Game result (win/loss) and final score
   */
  async playthrough(): Promise<{ result: 'win' | 'loss'; score: number }> {
    await this.start();

    // Wait for game to end
    while (this.isRunning) {
      await this.page.waitForTimeout(1000);

      // Check if game ended
      const overlay = this.page.locator('#overlay');
      const isHidden = await overlay.evaluate((el) => el.classList.contains('hidden'));

      if (!isHidden) {
        // Game ended
        break;
      }
    }

    // Get final result
    const title = await this.page.locator('#overlay-title').textContent();
    const scoreText = await this.page.locator('#end-stats').textContent();
    const score = Number.parseInt(scoreText?.match(/SCORE: (\d+)/)?.[1] || '0', 10);

    const result = title?.includes('CRISIS AVERTED') ? 'win' : 'loss';

    return { result, score };
  }
}

/**
 * Helper function to run automated playthrough
 */
export async function runAutomatedPlaythrough(
  page: Page,
  config?: GovernorConfig
): Promise<{ result: 'win' | 'loss'; score: number }> {
  const governor = new GameGovernor(page, config);
  return await governor.playthrough();
}
