/**
 * Koota-backed proxy matching the old Zustand API.
 * State lives in `Input` trait on the world (src/sim/world.ts).
 */

import { useSyncExternalStore } from 'react';
import { pressKeycap, releaseAllKeycaps, releaseKeycap } from '@/sim/actions';
import { Input, world } from '@/sim/world';

interface InputState {
  heldKeycaps: Set<number>;
  pressKeycap: (index: number) => void;
  releaseKeycap: (index: number) => void;
  releaseAll: () => void;
}

function buildState(): InputState {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const { heldKeycaps } = world.get(Input)!;
  return {
    heldKeycaps,
    pressKeycap,
    releaseKeycap,
    releaseAll: releaseAllKeycaps,
  };
}

function subscribe(listener: () => void): () => void {
  return world.onChange(Input, listener);
}

type Selector<T> = (state: InputState) => T;

function useInputStoreImpl<T = InputState>(selector?: Selector<T>): T {
  const getSnapshot = () => {
    const state = buildState();
    return selector ? selector(state) : (state as unknown as T);
  };
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useInputStore = Object.assign(useInputStoreImpl, {
  getState: buildState,
  /** Test-only: write a partial state slice into the underlying Input trait. */
  setState: (partial: Partial<Pick<InputState, 'heldKeycaps'>>): void => {
    world.set(Input, (prev) => ({ ...prev, ...partial }));
  },
  subscribe: (listener: (state: InputState, prev: InputState) => void): (() => void) => {
    let prev = buildState();
    return subscribe(() => {
      const next = buildState();
      listener(next, prev);
      prev = next;
    });
  },
});
