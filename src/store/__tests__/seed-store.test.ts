import { beforeEach, describe, expect, it } from 'vitest';
import { useSeedStore } from '../seed-store';

describe('seed-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useSeedStore.setState({
      seedString: '',
      rng: () => Math.random(),
      lastSeedUsed: '',
    });
  });

  it('has empty seedString initially', () => {
    expect(useSeedStore.getState().seedString).toBe('');
  });

  it('rng returns a number', () => {
    const val = useSeedStore.getState().rng();
    expect(typeof val).toBe('number');
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it('generateNewSeed sets seedString', () => {
    useSeedStore.getState().generateNewSeed();
    expect(useSeedStore.getState().seedString).not.toBe('');
  });

  it('generateNewSeed creates a working deterministic rng', () => {
    useSeedStore.getState().generateNewSeed();
    const seed = useSeedStore.getState().seedString;
    expect(seed.length).toBeGreaterThan(0);

    const val = useSeedStore.getState().rng();
    expect(typeof val).toBe('number');
  });

  it('replayLastSeed replays the same seed', () => {
    useSeedStore.getState().generateNewSeed();
    const original = useSeedStore.getState().seedString;

    // Generate values from the original rng
    const firstRun = [useSeedStore.getState().rng(), useSeedStore.getState().rng(), useSeedStore.getState().rng()];

    // Replay the last seed
    useSeedStore.getState().replayLastSeed();
    expect(useSeedStore.getState().seedString).toBe(original);

    // Should produce the same sequence
    const secondRun = [useSeedStore.getState().rng(), useSeedStore.getState().rng(), useSeedStore.getState().rng()];

    expect(secondRun).toEqual(firstRun);
  });

  it('replayLastSeed with no prior seed generates new one', () => {
    useSeedStore.getState().replayLastSeed();
    expect(useSeedStore.getState().seedString).not.toBe('');
  });

  it('two calls to generateNewSeed produce different seeds', () => {
    useSeedStore.getState().generateNewSeed();
    const first = useSeedStore.getState().seedString;

    useSeedStore.getState().generateNewSeed();
    const second = useSeedStore.getState().seedString;

    expect(first).not.toBe(second);
  });
});
