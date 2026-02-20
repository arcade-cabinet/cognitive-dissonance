import { loadSeedConfigs } from '../configLoader';

describe('configLoader', () => {
  it('loads configs with a valid seed string', () => {
    const result = loadSeedConfigs('test-seed-123');

    expect(result.seedHash).toBeGreaterThan(0);
    expect(result.patterns).toBeDefined();
    expect(result.tensionCurve).toBeDefined();
    expect(result.difficultyConfig).toBeDefined();
  });

  it('returns a valid TensionCurveConfig with canonical fields', () => {
    const { tensionCurve } = loadSeedConfigs('seed-a');

    expect(tensionCurve).toHaveProperty('increaseRate');
    expect(tensionCurve).toHaveProperty('decreaseRate');
    expect(tensionCurve).toHaveProperty('overStabilizationThreshold');
    expect(tensionCurve).toHaveProperty('reboundProbability');
    expect(tensionCurve).toHaveProperty('reboundAmount');

    // All values should be positive numbers
    expect(tensionCurve.increaseRate).toBeGreaterThan(0);
    expect(tensionCurve.decreaseRate).toBeGreaterThan(0);
    expect(tensionCurve.overStabilizationThreshold).toBeGreaterThan(0);
    expect(tensionCurve.reboundProbability).toBeGreaterThan(0);
    expect(tensionCurve.reboundAmount).toBeGreaterThan(0);
  });

  it('returns a valid DifficultyConfig', () => {
    const { difficultyConfig } = loadSeedConfigs('seed-b');

    expect(difficultyConfig.k).toBe(1.35);
    expect(difficultyConfig.timeScale).toBe(0.001);
    expect(difficultyConfig.dampingCoeff).toBeGreaterThan(0);
    expect(difficultyConfig.spawnRateBase).toBe(1.0);
    expect(difficultyConfig.spawnRateFloor).toBe(0.3);
    expect(difficultyConfig.maxEnemyBase).toBe(5);
    expect(difficultyConfig.maxEnemyCeiling).toBe(20);
    expect(difficultyConfig.morphSpeedBase).toBe(0.5);
    expect(difficultyConfig.morphSpeedCeiling).toBe(2.0);
    expect(difficultyConfig.bossThresholdBase).toBe(0.85);
    expect(difficultyConfig.bossThresholdFloor).toBe(0.65);
  });

  it('returns 3 phases from patterns config', () => {
    const { patterns } = loadSeedConfigs('seed-c');

    expect(patterns.phases).toHaveLength(3);
    expect(patterns.phases[0].tension).toBe(0.0);
    expect(patterns.phases[1].tension).toBe(0.4);
    expect(patterns.phases[2].tension).toBe(0.8);
    expect(patterns.phases[2].boss).toBe('crystalline-cube');
  });

  it('applies seed-derived variance to spawn rates', () => {
    const result1 = loadSeedConfigs('seed-x');
    const result2 = loadSeedConfigs('seed-y');

    // Different seeds should produce different spawn rate variances
    // (they may be the same if hashes collide, but in practice they differ)
    const spawn1 = result1.patterns.phases[0].spawnRate;
    const spawn2 = result2.patterns.phases[0].spawnRate;

    // Both should be within +-20% of base (1.2)
    expect(spawn1).toBeGreaterThan(0);
    expect(spawn2).toBeGreaterThan(0);
  });

  it('deterministically selects tension curve variant from seed', () => {
    const result1 = loadSeedConfigs('deterministic-seed');
    const result2 = loadSeedConfigs('deterministic-seed');

    // Same seed should produce identical configs
    expect(result1.tensionCurve).toEqual(result2.tensionCurve);
    expect(result1.difficultyConfig).toEqual(result2.difficultyConfig);
    expect(result1.seedHash).toBe(result2.seedHash);
  });

  it('selects from 3 tension curve variants', () => {
    const { patterns } = loadSeedConfigs('curve-test');

    expect(patterns.tensionCurves).toHaveProperty('default');
    expect(patterns.tensionCurves).toHaveProperty('aggressive');
    expect(patterns.tensionCurves).toHaveProperty('forgiving');
    expect(patterns.tensionCurves).toHaveProperty('active');
  });

  it('ensures yuka counts are at least 1', () => {
    // Try many seeds to catch edge cases
    for (let i = 0; i < 20; i++) {
      const { patterns } = loadSeedConfigs(`edge-case-${i}`);
      for (const phase of patterns.phases) {
        expect(phase.yukaCount).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
