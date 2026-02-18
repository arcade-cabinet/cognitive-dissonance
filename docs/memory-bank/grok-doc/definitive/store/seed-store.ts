// store/seed-store.ts
import { create } from 'zustand'
import seedrandom from 'seedrandom'

interface SeedState {
  seedString: string      // completely hidden
  rng: () => number
  lastSeedUsed: string    // for Continue

  generateNewSeed: () => void
  useLastSeed: () => void
}

export const useSeedStore = create<SeedState>((set, get) => ({
  seedString: '',
  rng: () => Math.random(),
  lastSeedUsed: '',

  generateNewSeed: () => {
    const rawSeed = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const rng = seedrandom(rawSeed)

    set({
      seedString: rawSeed,
      rng,
      lastSeedUsed: rawSeed,
    })
  },

  useLastSeed: () => {
    const { lastSeedUsed } = get()
    if (!lastSeedUsed) {
      get().generateNewSeed()
      return
    }
    const rng = seedrandom(lastSeedUsed)
    set({ rng, seedString: lastSeedUsed })
  },
}))