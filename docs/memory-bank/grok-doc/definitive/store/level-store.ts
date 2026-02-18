// store/level-store.ts
import { create } from 'zustand'

interface LevelState {
  currentLevel: number
  coherence: number   // 0-100, visual on sphere
  peakCoherence: number

  advanceLevel: () => void
  addCoherence: (amount: number) => void
  reset: () => void
}

export const useLevelStore = create<LevelState>((set, get) => ({
  currentLevel: 1,
  coherence: 25,
  peakCoherence: 25,

  advanceLevel: () => {
    const newLevel = get().currentLevel + 1
    set({
      currentLevel: newLevel,
      coherence: Math.min(100, get().coherence + 8),
    })
  },

  addCoherence: (amount) => {
    const newCoherence = Math.min(100, get().coherence + amount)
    set({
      coherence: newCoherence,
      peakCoherence: Math.max(get().peakCoherence, newCoherence),
    })
  },

  reset: () => set({
    currentLevel: 1,
    coherence: 25,
    peakCoherence: 25,
  }),
}))