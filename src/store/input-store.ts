import { create } from 'zustand';

interface InputState {
  // Which keycap indices are currently held (pointer down)
  heldKeycaps: Set<number>;
  // Any keycap held at all?
  isAnyHeld: boolean;

  pressKeycap: (index: number) => void;
  releaseKeycap: (index: number) => void;
  releaseAll: () => void;
}

export const useInputStore = create<InputState>((set, get) => ({
  heldKeycaps: new Set(),
  isAnyHeld: false,

  pressKeycap: (index: number) => {
    const next = new Set(get().heldKeycaps);
    next.add(index);
    set({ heldKeycaps: next, isAnyHeld: next.size > 0 });
  },

  releaseKeycap: (index: number) => {
    const next = new Set(get().heldKeycaps);
    next.delete(index);
    set({ heldKeycaps: next, isAnyHeld: next.size > 0 });
  },

  releaseAll: () => {
    set({ heldKeycaps: new Set(), isAnyHeld: false });
  },
}));
