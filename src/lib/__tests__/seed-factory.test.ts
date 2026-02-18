import seedrandom from 'seedrandom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSeedStore } from '@/store/seed-store';
import { generateFromSeed } from '../seed-factory';

describe('seed-factory', () => {
  beforeEach(() => {
    // Set a known seed for deterministic testing
    const rng = seedrandom('test-seed-42');
    useSeedStore.setState({ seedString: 'test-seed-42', rng, lastSeedUsed: 'test-seed-42' });
  });

  it('returns valid enemyConfig with required fields', () => {
    const { enemyConfig } = generateFromSeed();
    expect(enemyConfig).toHaveProperty('amount');
    expect(enemyConfig).toHaveProperty('speed');
    expect(enemyConfig).toHaveProperty('colorTint');
    expect(enemyConfig).toHaveProperty('splitChance');
    expect(enemyConfig).toHaveProperty('aggression');
    expect(enemyConfig).toHaveProperty('behavior');
  });

  it('same seed produces same enemyConfig', () => {
    const first = generateFromSeed();

    // Reset rng to same seed
    useSeedStore.setState({ rng: seedrandom('test-seed-42') });
    const second = generateFromSeed();

    expect(first.enemyConfig.amount).toBe(second.enemyConfig.amount);
    expect(first.enemyConfig.speed).toBe(second.enemyConfig.speed);
    expect(first.enemyConfig.behavior).toBe(second.enemyConfig.behavior);
  });

  it('amount is in range 3-12', () => {
    for (let i = 0; i < 20; i++) {
      const { enemyConfig } = generateFromSeed();
      expect(enemyConfig.amount).toBeGreaterThanOrEqual(3);
      expect(enemyConfig.amount).toBeLessThanOrEqual(12);
    }
  });

  it('speed is in range 0.8-3.0', () => {
    for (let i = 0; i < 20; i++) {
      const { enemyConfig } = generateFromSeed();
      expect(enemyConfig.speed).toBeGreaterThanOrEqual(0.8);
      expect(enemyConfig.speed).toBeLessThanOrEqual(3.0);
    }
  });

  it('behavior is one of the 4 types', () => {
    const validBehaviors = ['zigzag', 'split', 'seek', 'wander'];
    for (let i = 0; i < 30; i++) {
      const { enemyConfig } = generateFromSeed();
      expect(validBehaviors).toContain(enemyConfig.behavior);
    }
  });

  it('keycapPortrait has valid fields', () => {
    const { keycapPortrait } = generateFromSeed();
    expect(keycapPortrait).toHaveProperty('color');
    expect(keycapPortrait).toHaveProperty('intensity');
    expect(keycapPortrait).toHaveProperty('shape');
    expect(keycapPortrait.intensity).toBeGreaterThanOrEqual(0.6);
    expect(keycapPortrait.intensity).toBeLessThanOrEqual(1.0);
    expect(['cube', 'sphere', 'torus', 'fragment']).toContain(keycapPortrait.shape);
  });

  it('colorTint is a valid HSL string', () => {
    const { enemyConfig } = generateFromSeed();
    expect(enemyConfig.colorTint).toMatch(/^hsl\(\d+(\.\d+)?, 85%, 65%\)$/);
  });
});
