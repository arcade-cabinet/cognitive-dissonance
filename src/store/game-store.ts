import { create } from 'zustand';

export type GamePhase = 'loading' | 'title' | 'playing' | 'shattered' | 'error';

interface GameState {
  phase: GamePhase;
  errorMessage: string | null;

  // Actions
  setPhase: (phase: GamePhase) => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'loading',
  errorMessage: null,

  setPhase: (phase: GamePhase) => {
    set({ phase, errorMessage: phase === 'error' ? null : undefined });
  },

  setError: (message: string) => {
    set({ phase: 'error', errorMessage: message });
  },

  reset: () => {
    set({ phase: 'loading', errorMessage: null });
  },
}));
