/**
 * Koota-backed proxy matching the old Zustand API.
 *
 * State lives in the Koota world (src/sim/world.ts, `Game` trait). This module
 * preserves the old `useGameStore` call sites (`.getState()`, `.subscribe()`,
 * and React-hook form) so no caller needed to change during the migration.
 *
 * Reactive reads inside components re-render when `Game` changes via
 * `world.onChange(Game, listener)`. Non-reactive snapshot reads (inside
 * Babylon render loops) still work: `useGameStore.getState().phase` calls
 // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
 * `world.get(Game)!.phase`.
 */

import { useSyncExternalStore } from 'react';
import { setPhase, restart as simRestart, togglePause, triggerRestart } from '@/sim/actions';
import { Game, world } from '@/sim/world';

type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

interface GameState {
  phase: GamePhase;
  restartToken: number;
  setPhase: (phase: GamePhase) => void;
  togglePause: () => void;
  restart: () => void;
  triggerRestart: () => void;
}

function buildState(): GameState {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const { phase, restartToken } = world.get(Game)!;
  return {
    phase,
    restartToken,
    setPhase,
    togglePause,
    restart: simRestart,
    triggerRestart,
  };
}

function subscribe(listener: () => void): () => void {
  return world.onChange(Game, listener);
}

type Selector<T> = (state: GameState) => T;

function useGameStoreImpl<T = GameState>(selector?: Selector<T>): T {
  const getSnapshot = () => {
    const state = buildState();
    return selector ? selector(state) : (state as unknown as T);
  };
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useGameStore = Object.assign(useGameStoreImpl, {
  getState: buildState,
  /** Test-only: write a partial state slice into the underlying Game trait. */
  setState: (partial: Partial<Pick<GameState, 'phase' | 'restartToken'>>): void => {
    world.set(Game, (prev) => ({ ...prev, ...partial }));
  },
  subscribe: (listener: (state: GameState, prev: GameState) => void): (() => void) => {
    let prev = buildState();
    return subscribe(() => {
      const next = buildState();
      listener(next, prev);
      prev = next;
    });
  },
});
