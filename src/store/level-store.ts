/**
 * Koota-backed proxy matching the old Zustand API.
 * State lives in `Level` trait on the world (src/sim/world.ts).
 */

import { useSyncExternalStore } from 'react';
import { addCoherence, advanceLevel, resetLevel, setTension } from '@/sim/actions';
import { Level, world } from '@/sim/world';

interface LevelState {
  currentLevel: number;
  coherence: number;
  peakCoherence: number;
  tension: number;
  advanceLevel: () => void;
  addCoherence: (amount: number) => void;
  setTension: (value: number) => void;
  reset: () => void;
}

function buildState(): LevelState {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const { currentLevel, coherence, peakCoherence, tension } = world.get(Level)!;
  return {
    currentLevel,
    coherence,
    peakCoherence,
    tension,
    advanceLevel,
    addCoherence,
    setTension,
    reset: resetLevel,
  };
}

function subscribe(listener: () => void): () => void {
  return world.onChange(Level, listener);
}

type Selector<T> = (state: LevelState) => T;

function useLevelStoreImpl<T = LevelState>(selector?: Selector<T>): T {
  const getSnapshot = () => {
    const state = buildState();
    return selector ? selector(state) : (state as unknown as T);
  };
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useLevelStore = Object.assign(useLevelStoreImpl, {
  getState: buildState,
  /** Test-only: write a partial state slice into the underlying Level trait. */
  setState: (partial: Partial<Pick<LevelState, 'currentLevel' | 'coherence' | 'peakCoherence' | 'tension'>>): void => {
    world.set(Level, (prev) => ({ ...prev, ...partial }));
  },
  subscribe: (listener: (state: LevelState, prev: LevelState) => void): (() => void) => {
    let prev = buildState();
    return subscribe(() => {
      const next = buildState();
      listener(next, prev);
      prev = next;
    });
  },
});
