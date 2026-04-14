/**
 * Game-over flow — listens for the `gameOver` event, freezes the sim,
 * and auto-restarts after a short interval. A future pass will add a
 * diegetic shatter (glass sphere cracks, particles burst, red bloom
 * drowns the scene) via rapier.
 *
 * The restart rebuilds the sim state: resets Level trait, generates a new
 * seed, transitions Game.phase back to 'playing'. Keycap emergence will
 * replay because the inputSchema reference is preserved (same array);
 * bring in a proper schema-swap later if we want a different level
 * automatically on restart.
 */

import type { World } from 'koota';
import { generateNewSeed, resetLevel, setPhase } from '@/sim/actions';

const RESTART_DELAY_MS = 3000;

export interface GameOverHandlerOptions {
  world: World;
  restartDelayMs?: number;
}

export function mountGameOverHandler(opts: GameOverHandlerOptions): () => void {
  const { world: _world, restartDelayMs = RESTART_DELAY_MS } = opts;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  function onGameOver(): void {
    // Phase is already set to 'gameover' by the tension-driver; schedule
    // restart. Tension stays high and patterns stop spawning (stabilizer
    // gates on phase), giving the player a moment to read "cognition
    // shattered" before the cabinet resets.
    if (restartTimer !== null) return; // already mid-restart
    restartTimer = setTimeout(() => {
      restartTimer = null;
      resetLevel();
      generateNewSeed();
      setPhase('playing');
    }, restartDelayMs);
  }

  window.addEventListener('gameOver', onGameOver);

  return function unmount() {
    window.removeEventListener('gameOver', onGameOver);
    if (restartTimer !== null) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };
}
