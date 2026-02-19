import { create } from 'zustand';

interface InputState {
  pressedKeys: Set<string>;

  // Actions
  pressKey: (key: string) => void;
  releaseKey: (key: string) => void;
  isKeyPressed: (key: string) => boolean;
  reset: () => void;
}

export const useInputStore = create<InputState>((set, get) => ({
  pressedKeys: new Set<string>(),

  pressKey: (key: string) => {
    set((state) => {
      const newPressed = new Set(state.pressedKeys);
      newPressed.add(key.toUpperCase());
      return { pressedKeys: newPressed };
    });
  },

  releaseKey: (key: string) => {
    set((state) => {
      const newPressed = new Set(state.pressedKeys);
      newPressed.delete(key.toUpperCase());
      return { pressedKeys: newPressed };
    });
  },

  isKeyPressed: (key: string) => {
    return get().pressedKeys.has(key.toUpperCase());
  },

  reset: () => {
    set({ pressedKeys: new Set<string>() });
  },
}));
