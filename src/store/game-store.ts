import { create } from 'zustand';

type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

interface GameState {
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;
  togglePause: () => void;
  restart: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',

  setPhase: (phase: GamePhase) => set({ phase }),

  togglePause: () => {
    const current = get().phase;
    if (current === 'playing') set({ phase: 'paused' });
    else if (current === 'paused') set({ phase: 'playing' });
  },

  restart: () => {
    set({ phase: 'title' });
    // Level store and seed store will be reset by the gameboard when transitioning from title -> playing
  },
}));
