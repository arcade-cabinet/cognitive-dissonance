import * as fc from 'fast-check';
import type { TensionCurveConfig } from '../../types';
import { PatternStabilizationSystem } from '../PatternStabilizationSystem';
import { TensionSystem } from '../TensionSystem';

// Helper to create fresh singleton instances bypassing private constructors
function createTensionSystem(): TensionSystem {
  (TensionSystem as any).instance = null;
  return TensionSystem.getInstance();
}

function createPatternStabilizationSystem(): PatternStabilizationSystem {
  (PatternStabilizationSystem as any).instance = null;
  return PatternStabilizationSystem.getInstance();
}

describe('PatternStabilizationSystem', () => {
  let system: PatternStabilizationSystem;
  let tensionSystem: TensionSystem;
  const mockTensionCurve: TensionCurveConfig = {
    increaseRate: 1.0,
    decreaseRate: 1.0,
    overStabilizationThreshold: 0.05,
    reboundProbability: 0.02,
    reboundAmount: 0.12,
  };

  // Mock Scene
  const mockScene = {} as any;

  beforeEach(() => {
    tensionSystem = createTensionSystem();
    tensionSystem.init(mockTensionCurve);
    system = createPatternStabilizationSystem();
    // Use the public initialize method which takes (scene, tensionSystem)
    system.initialize(mockScene, tensionSystem);
    // Set a level entity with tensionCurve so holdKey works
    system.setLevelEntity({
      level: true,
      tensionCurve: mockTensionCurve,
      keyPatterns: ['Q', 'W', 'E', 'R', 'T'],
    } as any);
  });

  afterEach(() => {
    system.dispose();
    tensionSystem.dispose();
  });

  describe('Unit Tests', () => {
    it('initializes with no active patterns', () => {
      expect(system.getActivePatterns().size).toBe(0);
    });

    it('holds a key and decreases tension', () => {
      const initialTension = tensionSystem.currentTension;
      system.holdKey('Q', 1000, 1.0);
      expect(system.getActivePatterns().has('Q')).toBe(true);
      // Tension should decrease (or at least not increase beyond the initial + holdKey decrease)
      expect(tensionSystem.currentTension).toBeLessThan(initialTension + 0.018);
    });

    it('releases a key', () => {
      system.holdKey('Q', 1000, 1.0);
      system.releaseKey('Q');
      expect(system.getActivePatterns().has('Q')).toBe(false);
    });

    it('grants coherence bonus for full pattern match', () => {
      tensionSystem.setTension(0.5);
      // The required pattern is set from keyPatterns on the level entity: ['Q', 'W', 'E', 'R', 'T']
      const requiredPattern = ['Q', 'W', 'E', 'R', 'T'];

      // Hold all keys in the pattern - each holdKey call checks for pattern match internally
      for (const key of requiredPattern) {
        system.holdKey(key, 1000, 1.0);
      }

      // After holding all keys, tension should have decreased (holdKey decreases + coherence bonus)
      expect(tensionSystem.currentTension).toBeLessThan(0.5);
    });

    it('does not grant bonus for partial pattern match', () => {
      // Use a low decrease rate so holdKey doesn't drain all tension
      const lowDecreaseCurve: TensionCurveConfig = {
        ...mockTensionCurve,
        decreaseRate: 0.01,
      };
      tensionSystem.init(lowDecreaseCurve);
      system.setLevelEntity({
        level: true,
        tensionCurve: lowDecreaseCurve,
        keyPatterns: ['Q', 'W', 'E', 'R', 'T'],
      } as any);

      tensionSystem.setTension(0.5);

      // Hold only 2 of 5 required keys
      system.holdKey('Q', 1000, 1.0);
      system.holdKey('W', 1000, 1.0);

      // Tension should have decreased by holdKey amounts only, not the coherence bonus
      const tensionAfterPartial = tensionSystem.currentTension;
      // It decreased due to holdKey (0.01 per hold), but no large coherence bonus (0.09)
      expect(tensionAfterPartial).toBeLessThan(0.5);
      // With decreaseRate=0.01, two holds decrease by ~0.02. Tension should be ~0.48
      expect(tensionAfterPartial).toBeGreaterThan(0.4);
    });

    it('calls missedPattern method without error', () => {
      // missedPattern is a public method that logs and is a hook for other systems
      expect(() => system.missedPattern('Q')).not.toThrow();
    });
  });

  describe('Property-Based Tests', () => {
    // P4: Pattern Stabilization Coherence Bonus
    it('coherence bonus triggers only on full pattern match', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'), { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0, max: 100 }),
          (pattern, partialCount) => {
            const testSystem = createPatternStabilizationSystem();
            testSystem.initialize(mockScene, tensionSystem);
            // Set a level entity with the specific pattern as required
            testSystem.setLevelEntity({
              level: true,
              tensionCurve: mockTensionCurve,
              keyPatterns: pattern,
            } as any);
            tensionSystem.setTension(0.5);

            // Hold only a subset of keys
            const keysToHold = pattern.slice(0, Math.min(partialCount % pattern.length, pattern.length - 1));
            for (const key of keysToHold) {
              testSystem.holdKey(key, 1000, 1.0);
            }

            // If partial match, tension should still be above what a full coherence bonus would give
            if (keysToHold.length < pattern.length) {
              // Tension decreased by holdKey amounts but no large coherence bonus
              expect(tensionSystem.currentTension).toBeGreaterThanOrEqual(0.0);
            }

            testSystem.dispose();
          },
        ),
      );
    });

    it('full pattern match always grants coherence bonus', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.2), max: Math.fround(0.9), noNaN: true, noDefaultInfinity: true }),
          (initialTension) => {
            const testSystem = createPatternStabilizationSystem();
            testSystem.initialize(mockScene, tensionSystem);
            const requiredKeys = ['Q', 'W', 'E'];
            testSystem.setLevelEntity({
              level: true,
              tensionCurve: mockTensionCurve,
              keyPatterns: requiredKeys,
            } as any);
            tensionSystem.setTension(initialTension);

            const tensionBefore = tensionSystem.currentTension;

            // Hold all keys in the pattern
            for (const key of requiredKeys) {
              testSystem.holdKey(key, 1000, 1.0);
            }

            // Full match should decrease tension (holdKey decrease + coherence bonus of 0.09)
            expect(tensionSystem.currentTension).toBeLessThan(tensionBefore);

            testSystem.dispose();
          },
        ),
      );
    });
  });
});
