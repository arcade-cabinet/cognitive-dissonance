/**
 * Koota-backed proxy matching the old Zustand API.
 * State lives in `Seed` trait on the world (src/sim/world.ts).
 */

import { useSyncExternalStore } from 'react';
import type seedrandom from 'seedrandom';
import { generateNewSeed, replayLastSeed } from '@/sim/actions';
import { Seed, world } from '@/sim/world';

interface SeedState {
  seedString: string;
  rng: ReturnType<typeof seedrandom>;
  lastSeedUsed: string;
  generateNewSeed: () => void;
  replayLastSeed: () => void;
}

function buildState(): SeedState {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const { seedString, rng, lastSeedUsed } = world.get(Seed)!;
  return {
    seedString,
    rng,
    lastSeedUsed,
    generateNewSeed,
    replayLastSeed,
  };
}

function subscribe(listener: () => void): () => void {
  return world.onChange(Seed, listener);
}

type Selector<T> = (state: SeedState) => T;

function useSeedStoreImpl<T = SeedState>(selector?: Selector<T>): T {
  const getSnapshot = () => {
    const state = buildState();
    return selector ? selector(state) : (state as unknown as T);
  };
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useSeedStore = Object.assign(useSeedStoreImpl, {
  getState: buildState,
  /** Test-only: write a partial state slice into the underlying Seed trait. */
  setState: (partial: Partial<Pick<SeedState, 'seedString' | 'lastSeedUsed' | 'rng'>>): void => {
    world.set(Seed, (prev) => ({ ...prev, ...partial }));
  },
  subscribe: (listener: (state: SeedState, prev: SeedState) => void): (() => void) => {
    let prev = buildState();
    return subscribe(() => {
      const next = buildState();
      listener(next, prev);
      prev = next;
    });
  },
});
