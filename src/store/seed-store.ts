import seedrandom from 'seedrandom';
import { create } from 'zustand';

interface SeedState {
  seedString: string;
  rng: () => number;
  lastSeedUsed: string;

  generateNewSeed: () => void;
  replayLastSeed: () => void;
}

export const useSeedStore = create<SeedState>((set, get) => ({
  seedString: '',
  rng: () => Math.random(),
  lastSeedUsed: '',

  generateNewSeed: () => {
    const rawSeed = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const rng = seedrandom(rawSeed);
    set({
      seedString: rawSeed,
      rng,
      lastSeedUsed: rawSeed,
    });
  },

  replayLastSeed: () => {
    const { lastSeedUsed } = get();
    if (!lastSeedUsed) {
      get().generateNewSeed();
      return;
    }
    const rng = seedrandom(lastSeedUsed);
    set({ rng, seedString: lastSeedUsed });
  },
}));
