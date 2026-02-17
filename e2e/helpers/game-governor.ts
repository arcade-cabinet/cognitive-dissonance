/**
 * Game Governor - Automated playthrough controller for testing
 *
 * This module provides automated game control for E2E testing,
 * simulating realistic player behavior and decision-making.
 */

import type { Page } from '@playwright/test';
import { startGame } from './game-helpers';

export interface GovernorConfig {
  /** How aggressively to counter enemies (0-1) */
  aggressiveness?: number;
  /** Reaction time in ms */
  reactionTime?: number;
  /** Whether to use special abilities */
  useSpecials?: boolean;
  /** Target accuracy (0-1) */
  accuracy?: number;
  /** Seed for deterministic RNG (defaults to 42) */
  seed?: number;
}

/** Mulberry32 seeded PRNG — deterministic random for reproducible E2E runs */
function createRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameGovernor {
  private page: Page;
  private config: Required<Omit<GovernorConfig, 'seed'>>;
  private isRunning = false;
  private rng: () => number;

  constructor(page: Page, config: GovernorConfig = {}) {
    this.page = page;
    this.config = {
      aggressiveness: config.aggressiveness ?? 0.7,
      reactionTime: config.reactionTime ?? 300,
      useSpecials: config.useSpecials ?? true,
      accuracy: config.accuracy ?? 0.8,
    };
    this.rng = createRng(config.seed ?? 42);
  }

  /**
   * Start automated gameplay
   */
  async start(): Promise<void> {
    this.isRunning = true;

    // Check if game is already running (overlay hidden)
    const overlay = this.page.locator('#overlay');
    if (await overlay.isVisible()) {
      // Use robust helper instead of manual implementation
      await startGame(this.page);
    }

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

  /** Map enemy counter type to its keyboard shortcut */
  private static readonly COUNTER_MAP: Record<string, string> = {
    reality: 'F1',
    history: 'F2',
    logic: 'F3',
  };

  /**
   * Try to counter visible enemies using exposed game state
   */
  private async tryCounterEnemies(): Promise<void> {
    // Simulate human error based on accuracy
    if (this.rng() > this.config.accuracy) {
      const keys = ['F1', 'F2', 'F3'];
      await this.page.keyboard.press(keys[Math.floor(this.rng() * 3)]);
      return;
    }

    // Read enemy counter types from exposed game state (set by Game.tsx)
    const counters: string[] = await this.page.evaluate(
      () => ((window as unknown as Record<string, unknown>).__gameEnemyCounters as string[]) || []
    );

    if (counters.length > 0) {
      // Pick the most common enemy type and press its counter ability
      const freq: Record<string, number> = {};
      for (const c of counters) {
        freq[c] = (freq[c] || 0) + 1;
      }
      const bestCounter = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
      const key = GameGovernor.COUNTER_MAP[bestCounter] || 'F1';

      if (this.rng() < this.config.aggressiveness) {
        await this.page.keyboard.press(key);
      }
    } else {
      // No enemy info available — fall back to cycling abilities
      const keys = ['F1', 'F2', 'F3'];
      if (this.rng() < this.config.aggressiveness) {
        await this.page.keyboard.press(keys[Math.floor(this.rng() * 3)]);
      }
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

    // Parse score from the specific stat-value element (first row is FINAL SCORE)
    // toLocaleString() may add commas, so strip them before parsing
    let score = 0;
    const endStats = this.page.locator('#end-stats');
    if ((await endStats.count()) > 0) {
      const scoreValue = await endStats.locator('.stat-value').first().textContent();
      score = Number.parseInt((scoreValue || '0').replace(/,/g, ''), 10);
    }

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
