import { create } from 'zustand';

type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

interface GameState {
  phase: GamePhase;
  restartToken: number;
  setPhase: (phase: GamePhase) => void;
  togglePause: () => void;
  restart: () => void;
  triggerRestart: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',
  restartToken: 0,

  setPhase: (phase: GamePhase) => set({ phase }),

  togglePause: () => {
    const current = get().phase;
    if (current === 'playing') set({ phase: 'paused' });
    else if (current === 'paused') set({ phase: 'playing' });
  },

  restart: () => {
    set({ phase: 'title' });
  },

  triggerRestart: () => {
    set((state) => ({ phase: 'playing', restartToken: state.restartToken + 1 }));
  },
}));
