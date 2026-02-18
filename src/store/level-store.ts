import { create } from 'zustand';

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

export const useLevelStore = create<LevelState>((set, get) => ({
  currentLevel: 1,
  coherence: 25,
  peakCoherence: 25,
  tension: 0.12,

  advanceLevel: () => {
    const newLevel = get().currentLevel + 1;
    set({
      currentLevel: newLevel,
      coherence: Math.min(100, get().coherence + 8),
    });
  },

  addCoherence: (amount: number) => {
    const newCoherence = Math.min(100, get().coherence + amount);
    set({
      coherence: newCoherence,
      peakCoherence: Math.max(get().peakCoherence, newCoherence),
    });
  },

  setTension: (value: number) => {
    set({ tension: Math.max(0, Math.min(1, value)) });
  },

  reset: () =>
    set({
      currentLevel: 1,
      coherence: 25,
      peakCoherence: 25,
      tension: 0.12,
    }),
}));
