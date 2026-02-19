import { create } from 'zustand';
import { hashSeed, mulberry32 } from '../utils/seed-helpers';

interface SeedState {
  seedString: string;
  lastSeedString: string | null;
  rng: (() => number) | null;

  // Actions
  generateNewSeed: () => void;
  replayLastSeed: () => void;
  setSeed: (seed: string) => void;
}

export const useSeedStore = create<SeedState>((set, get) => ({
  seedString: '',
  lastSeedString: null,
  rng: null,

  generateNewSeed: () => {
    const timestamp = Date.now();
    const random = Math.random();
    const newSeed = `${timestamp}-${random.toString(36).substring(2, 9)}`;
    const { seedString: currentSeed } = get();

    set({
      seedString: newSeed,
      lastSeedString: currentSeed || null,
      rng: mulberry32(hashSeed(newSeed)),
    });
  },

  replayLastSeed: () => {
    const { lastSeedString } = get();
    if (lastSeedString) {
      set({
        seedString: lastSeedString,
        rng: mulberry32(hashSeed(lastSeedString)),
      });
    }
  },

  setSeed: (seed: string) => {
    const { seedString: currentSeed } = get();
    set({
      seedString: seed,
      lastSeedString: currentSeed || null,
      rng: mulberry32(hashSeed(seed)),
    });
  },
}));
