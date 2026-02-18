import { create } from 'zustand';

interface InputState {
  /** Which keycap indices (0-11) are currently held (pointer down). */
  heldKeycaps: Set<number>;

  pressKeycap: (index: number) => void;
  releaseKeycap: (index: number) => void;
  releaseAll: () => void;
}

export const useInputStore = create<InputState>((set, get) => ({
  heldKeycaps: new Set(),

  pressKeycap: (index: number) => {
    const next = new Set(get().heldKeycaps);
    next.add(index);
    set({ heldKeycaps: next });
  },

  releaseKeycap: (index: number) => {
    const next = new Set(get().heldKeycaps);
    next.delete(index);
    set({ heldKeycaps: next });
  },

  releaseAll: () => {
    set({ heldKeycaps: new Set() });
  },
}));
