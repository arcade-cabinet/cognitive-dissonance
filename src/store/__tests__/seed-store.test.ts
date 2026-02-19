import { useSeedStore } from '../seed-store';

describe('seed-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useSeedStore.getState().setSeed('');
  });

  it('initializes with empty seed string', () => {
    const { seedString } = useSeedStore.getState();
    expect(seedString).toBe('');
  });

  it('generates a new seed', () => {
    const { generateNewSeed } = useSeedStore.getState();
    generateNewSeed();
    const { seedString } = useSeedStore.getState();
    expect(seedString).not.toBe('');
    expect(seedString.length).toBeGreaterThan(0);
  });

  it('sets a custom seed', () => {
    const { setSeed } = useSeedStore.getState();
    setSeed('test-seed-123');
    const { seedString } = useSeedStore.getState();
    expect(seedString).toBe('test-seed-123');
  });

  it('stores last seed when generating new seed', () => {
    const { setSeed, generateNewSeed } = useSeedStore.getState();
    setSeed('first-seed');
    generateNewSeed();
    const { lastSeedString } = useSeedStore.getState();
    expect(lastSeedString).toBe('first-seed');
  });

  it('replays last seed', () => {
    const { setSeed, generateNewSeed, replayLastSeed } = useSeedStore.getState();
    setSeed('original-seed');
    generateNewSeed();
    replayLastSeed();
    const { seedString } = useSeedStore.getState();
    expect(seedString).toBe('original-seed');
  });

  it('provides deterministic RNG from seed', () => {
    const { setSeed, rng } = useSeedStore.getState();

    // Set seed and get first value
    setSeed('deterministic-test');
    const rng1 = useSeedStore.getState().rng;
    const value1 = rng1?.();

    // Reset with same seed to get a fresh RNG
    setSeed('deterministic-test');
    const rng2 = useSeedStore.getState().rng;
    const value2 = rng2?.();

    // First value from new RNG should match first value from old RNG
    expect(value1).toBe(value2);
  });

  it('generates different values for different seeds', () => {
    const { setSeed } = useSeedStore.getState();

    setSeed('seed-a');
    const rngA = useSeedStore.getState().rng;
    const valueA = rngA?.();

    setSeed('seed-b');
    const rngB = useSeedStore.getState().rng;
    const valueB = rngB?.();

    expect(valueA).not.toBe(valueB);
  });
});
