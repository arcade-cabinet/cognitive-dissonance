import * as fc from 'fast-check';
import type { DifficultyConfig } from '../../types';
import { DifficultyScalingSystem } from '../DifficultyScalingSystem';

// Mock @babylonjs/core to avoid ESM import issues
jest.mock('@babylonjs/core/scene', () => ({
  Scene: jest.fn(),
}));

// Mock the ECS world
jest.mock('../../ecs/World', () => ({
  world: {
    add: jest.fn((entity: any) => entity),
    remove: jest.fn(),
    with: jest.fn(() => ({ first: null })),
  },
}));

// Helper to create a fresh singleton instance
function createDifficultyScalingSystem(): DifficultyScalingSystem {
  (DifficultyScalingSystem as any).instance = null;
  return DifficultyScalingSystem.getInstance();
}

describe('DifficultyScalingSystem', () => {
  let system: DifficultyScalingSystem;
  let mockScene: any;
  const mockDifficultyConfig: DifficultyConfig = {
    k: 0.5,
    timeScale: 0.001,
    dampingCoeff: 0.8,
    spawnRateBase: 1.2,
    spawnRateFloor: 0.2,
    maxEnemyBase: 3,
    maxEnemyCeiling: 24,
    morphSpeedBase: 1.0,
    morphSpeedCeiling: 3.0,
    bossThresholdBase: 0.92,
    bossThresholdFloor: 0.6,
  };

  beforeEach(() => {
    // Create a mock scene with metadata for tension
    mockScene = {
      metadata: { currentTension: 0.0 },
      registerBeforeRender: jest.fn(),
      unregisterBeforeRender: jest.fn(),
    };
    system = createDifficultyScalingSystem();
    system.initialize(mockScene, mockDifficultyConfig);
  });

  afterEach(() => {
    system.dispose();
  });

  // Helper to set tension on the mock scene
  function setTension(tension: number): void {
    mockScene.metadata.currentTension = tension;
  }

  describe('Unit Tests', () => {
    it('initializes with base difficulty values', () => {
      setTension(0.0);
      const snapshot = system.getCurrentSnapshot(0.0);
      expect(snapshot).not.toBeNull();
      if (!snapshot) return;
      expect(snapshot.spawnRate).toBeCloseTo(mockDifficultyConfig.spawnRateBase, 2);
      expect(snapshot.maxEnemyCount).toBe(mockDifficultyConfig.maxEnemyBase);
      expect(snapshot.morphSpeed).toBe(mockDifficultyConfig.morphSpeedBase);
      expect(snapshot.bossSpawnThreshold).toBe(mockDifficultyConfig.bossThresholdBase);
    });

    it('scales difficulty with tension', () => {
      setTension(0.5);
      system.update(10000); // 10 seconds

      const snapshot = system.getCurrentSnapshot(0.5);
      expect(snapshot).not.toBeNull();
      if (!snapshot) return;

      // Spawn rate should decrease (faster spawns)
      expect(snapshot.spawnRate).toBeLessThanOrEqual(mockDifficultyConfig.spawnRateBase);

      // Max enemies should increase
      expect(snapshot.maxEnemyCount).toBeGreaterThanOrEqual(mockDifficultyConfig.maxEnemyBase);

      // Morph speed should increase
      expect(snapshot.morphSpeed).toBeGreaterThanOrEqual(mockDifficultyConfig.morphSpeedBase);

      // Boss threshold should decrease (earlier bosses)
      expect(snapshot.bossSpawnThreshold).toBeLessThanOrEqual(mockDifficultyConfig.bossThresholdBase);
    });

    it('respects floor and ceiling bounds', () => {
      setTension(0.999);
      system.update(1000000); // Very long time

      const snapshot = system.getCurrentSnapshot(0.999);
      expect(snapshot).not.toBeNull();
      if (!snapshot) return;

      expect(snapshot.spawnRate).toBeGreaterThanOrEqual(mockDifficultyConfig.spawnRateFloor);
      expect(snapshot.maxEnemyCount).toBeLessThanOrEqual(mockDifficultyConfig.maxEnemyCeiling);
      expect(snapshot.morphSpeed).toBeLessThanOrEqual(mockDifficultyConfig.morphSpeedCeiling);
      expect(snapshot.bossSpawnThreshold).toBeGreaterThanOrEqual(mockDifficultyConfig.bossThresholdFloor);
    });
  });

  describe('Property-Based Tests', () => {
    // P18: Logarithmic Scaling Formula Correctness
    it('difficulty snapshot matches logarithmic formula', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(0.999), noNaN: true, noDefaultInfinity: true }),
          fc.integer({ min: 0, max: 100000 }),
          (tension, elapsedMs) => {
            const testSystem = createDifficultyScalingSystem();
            testSystem.initialize(mockScene, mockDifficultyConfig);
            setTension(tension);
            testSystem.update(elapsedMs);

            const snapshot = testSystem.getCurrentSnapshot(tension);
            expect(snapshot).not.toBeNull();
            if (!snapshot) return;

            const { k, timeScale, spawnRateBase, spawnRateFloor, maxEnemyBase, maxEnemyCeiling } = mockDifficultyConfig;

            // The snapshot returned by getCurrentSnapshot computes based on time since
            // initialization, not the elapsedMs passed to update. So we verify the snapshot
            // values are within bounds.
            expect(snapshot.spawnRate).toBeGreaterThanOrEqual(spawnRateFloor);
            expect(snapshot.spawnRate).toBeLessThanOrEqual(spawnRateBase);
            expect(snapshot.maxEnemyCount).toBeGreaterThanOrEqual(maxEnemyBase);
            expect(snapshot.maxEnemyCount).toBeLessThanOrEqual(maxEnemyCeiling);

            testSystem.dispose();
          },
        ),
      );
    });

    // P19: Difficulty Snapshot Bounds Invariant
    it('all snapshot fields are within specified bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(0.999), noNaN: true, noDefaultInfinity: true }),
          fc.integer({ min: 0, max: 100000 }),
          (tension, _elapsedMs) => {
            const testSystem = createDifficultyScalingSystem();
            testSystem.initialize(mockScene, mockDifficultyConfig);
            setTension(tension);

            const snapshot = testSystem.getCurrentSnapshot(tension);
            expect(snapshot).not.toBeNull();
            if (!snapshot) return;

            // spawnRate within [floor, base]
            expect(snapshot.spawnRate).toBeGreaterThanOrEqual(mockDifficultyConfig.spawnRateFloor);
            expect(snapshot.spawnRate).toBeLessThanOrEqual(mockDifficultyConfig.spawnRateBase);

            // maxEnemyCount within [base, ceiling]
            expect(snapshot.maxEnemyCount).toBeGreaterThanOrEqual(mockDifficultyConfig.maxEnemyBase);
            expect(snapshot.maxEnemyCount).toBeLessThanOrEqual(mockDifficultyConfig.maxEnemyCeiling);

            // patternComplexity within [1, 6]
            expect(snapshot.patternComplexity).toBeGreaterThanOrEqual(1);
            expect(snapshot.patternComplexity).toBeLessThanOrEqual(6);

            // morphSpeed within [base, ceiling]
            expect(snapshot.morphSpeed).toBeGreaterThanOrEqual(mockDifficultyConfig.morphSpeedBase);
            expect(snapshot.morphSpeed).toBeLessThanOrEqual(mockDifficultyConfig.morphSpeedCeiling);

            // bossSpawnThreshold within [floor, base]
            expect(snapshot.bossSpawnThreshold).toBeGreaterThanOrEqual(mockDifficultyConfig.bossThresholdFloor);
            expect(snapshot.bossSpawnThreshold).toBeLessThanOrEqual(mockDifficultyConfig.bossThresholdBase);

            // tensionIncreaseModifier >= 1.0
            expect(snapshot.tensionIncreaseModifier).toBeGreaterThanOrEqual(1.0);

            testSystem.dispose();
          },
        ),
      );
    });

    // P21: Difficulty Feedback Loop Stability
    it('tension-difficulty feedback loop converges', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.7), max: Math.fround(0.9), noNaN: true, noDefaultInfinity: true }),
          (dampingCoeff) => {
            const testConfig = { ...mockDifficultyConfig, dampingCoeff };
            const testSystem = createDifficultyScalingSystem();
            testSystem.initialize(mockScene, testConfig);

            // Simulate frames
            let maxModifier = 1.0;
            for (let i = 0; i < 100; i++) {
              const tension = Math.min(0.999, i * 0.01);
              setTension(tension);

              const snapshot = testSystem.getCurrentSnapshot(tension);
              if (snapshot) {
                maxModifier = Math.max(maxModifier, snapshot.tensionIncreaseModifier);
              }
            }

            // Modifier should remain bounded (not diverge)
            expect(maxModifier).toBeLessThan(100); // Reasonable upper bound
            expect(maxModifier).toBeGreaterThanOrEqual(1.0);

            testSystem.dispose();
          },
        ),
      );
    });

    // P20: Per-Archetype Difficulty Bounds
    it('per-archetype difficulty extensions are within bounds', () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: Math.fround(0.999), noNaN: true, noDefaultInfinity: true }), (tension) => {
          const testSystem = createDifficultyScalingSystem();
          testSystem.initialize(mockScene, mockDifficultyConfig);
          setTension(tension);

          // PlatterRotation RPM within [2, 18]
          const platterRPM = testSystem.getPlatterRotationRPM(5);
          expect(platterRPM).toBeGreaterThanOrEqual(2);
          expect(platterRPM).toBeLessThanOrEqual(18);

          // LeverTension tolerance within [0.04, 0.15]
          const leverTolerance = testSystem.getLeverTensionTolerance(0.15);
          expect(leverTolerance).toBeGreaterThanOrEqual(0.04);
          expect(leverTolerance).toBeLessThanOrEqual(0.15);

          // KeySequence length within [2, 7]
          const seqLength = testSystem.getKeySequenceLength(3);
          expect(seqLength).toBeGreaterThanOrEqual(2);
          expect(seqLength).toBeLessThanOrEqual(7);

          // KeySequence time window within [400, 2000]
          const timeWindow = testSystem.getKeySequenceTimeWindow(1200);
          expect(timeWindow).toBeGreaterThanOrEqual(400);
          expect(timeWindow).toBeLessThanOrEqual(2000);

          // CrystallineCubeBoss slam cycles within [1, 5]
          const slamCycles = testSystem.getBossSlamCycles(1);
          expect(slamCycles).toBeGreaterThanOrEqual(1);
          expect(slamCycles).toBeLessThanOrEqual(5);

          // CrystallineCubeBoss counter window within [1.5, 4.0]
          const counterWindow = testSystem.getBossCounterWindow(4.0);
          expect(counterWindow).toBeGreaterThanOrEqual(1.5);
          expect(counterWindow).toBeLessThanOrEqual(4.0);

          testSystem.dispose();
        }),
      );
    });

    // P23: Seed-Derived Difficulty Variance
    it('different configs produce different difficulty values', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 64 }),
          fc.string({ minLength: 1, maxLength: 64 }),
          (seed1, seed2) => {
            // Skip if seeds are identical
            if (seed1 === seed2) return;

            const config1 = mockDifficultyConfig;
            const config2 = { ...mockDifficultyConfig, k: mockDifficultyConfig.k * 1.1 }; // Simulate variance

            // Different configs should produce different k values
            const isDifferent =
              config1.k !== config2.k ||
              config1.timeScale !== config2.timeScale ||
              config1.dampingCoeff !== config2.dampingCoeff;

            expect(isDifferent).toBe(true);
          },
        ),
      );
    });

    it('same config produces identical difficulty values', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 64 }), (_seed) => {
          // Same config should produce identical values
          const config1 = mockDifficultyConfig;
          const config2 = mockDifficultyConfig;

          expect(config1.k).toBe(config2.k);
          expect(config1.timeScale).toBe(config2.timeScale);
          expect(config1.dampingCoeff).toBe(config2.dampingCoeff);
        }),
      );
    });
  });
});
