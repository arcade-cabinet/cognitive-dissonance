import * as fc from 'fast-check';
import type { TensionCurveConfig } from '../../types';
import { TensionSystem } from '../TensionSystem';

// Helper to create a fresh TensionSystem instance bypassing private constructor
function createTensionSystem(): TensionSystem {
  // Reset the singleton so getInstance() returns a fresh instance
  (TensionSystem as any).instance = null;
  return TensionSystem.getInstance();
}

describe('TensionSystem', () => {
  let system: TensionSystem;
  const mockTensionCurve: TensionCurveConfig = {
    increaseRate: 1.0,
    decreaseRate: 1.0,
    overStabilizationThreshold: 0.05,
    reboundProbability: 0.02,
    reboundAmount: 0.12,
  };

  beforeEach(() => {
    system = createTensionSystem();
    system.init(mockTensionCurve);
  });

  afterEach(() => {
    system.dispose();
  });

  describe('Unit Tests', () => {
    it('initializes with tension 0.0', () => {
      expect(system.currentTension).toBe(0.0);
    });

    it('increases tension within bounds', () => {
      system.increase(0.5);
      expect(system.currentTension).toBe(0.5);
    });

    it('decreases tension within bounds', () => {
      system.setTension(0.5);
      system.decrease(0.2);
      expect(system.currentTension).toBe(0.3);
    });

    it('clamps tension at upper bound 0.999', () => {
      system.increase(2.0);
      expect(system.currentTension).toBe(0.999);
    });

    it('clamps tension at lower bound 0.0', () => {
      system.setTension(0.3);
      system.decrease(0.5);
      expect(system.currentTension).toBe(0.0);
    });

    it('triggers listeners on tension change', () => {
      const listener = jest.fn();
      system.addListener(listener);
      system.increase(0.1);
      expect(listener).toHaveBeenCalledWith(0.1);
    });

    it('removes listeners correctly', () => {
      const listener = jest.fn();
      system.addListener(listener);
      system.removeListener(listener);
      system.increase(0.1);
      expect(listener).not.toHaveBeenCalled();
    });

    it('freezes tension updates when frozen', () => {
      system.setTension(0.5);
      system.freeze();
      system.increase(0.2);
      expect(system.currentTension).toBe(0.5);
    });

    it('unfreezes tension updates', () => {
      system.freeze();
      system.unfreeze();
      system.increase(0.2);
      expect(system.currentTension).toBe(0.2);
    });

    it('resets to initial state', () => {
      system.setTension(0.8);
      system.reset();
      expect(system.currentTension).toBe(0.0);
    });
  });

  describe('Property-Based Tests', () => {
    // P1: Tension Clamping Invariant
    it('tension is always clamped between 0.0 and 0.999', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(0.999), noNaN: true }),
          fc.float({ min: 0, max: Math.fround(10), noNaN: true }),
          fc.float({ min: 0, max: Math.fround(10), noNaN: true }),
          (initial, increaseAmount, decreaseAmount) => {
            const testSystem = createTensionSystem();
            testSystem.init(mockTensionCurve);
            testSystem.setTension(initial);
            testSystem.increase(increaseAmount);
            expect(testSystem.currentTension).toBeGreaterThanOrEqual(0.0);
            expect(testSystem.currentTension).toBeLessThanOrEqual(0.999);
            testSystem.decrease(decreaseAmount);
            expect(testSystem.currentTension).toBeGreaterThanOrEqual(0.0);
            expect(testSystem.currentTension).toBeLessThanOrEqual(0.999);
            testSystem.dispose();
          },
        ),
      );
    });

    // P2: Over-Stabilization Threshold
    it('over-stabilization rebound only triggers below 0.05 tension', () => {
      fc.assert(
        // Use a higher min to ensure tension stays above 0.05 even after the decrease
        // decrease(0.001) with decreaseRate=1.0 subtracts 0.001, so min must be > 0.051
        fc.property(fc.float({ min: Math.fround(0.06), max: Math.fround(0.999), noNaN: true }), (tension) => {
          const testSystem = createTensionSystem();
          testSystem.init(mockTensionCurve);
          testSystem.setTension(tension);
          const before = testSystem.currentTension;
          // Decrease by a small amount to trigger the check
          testSystem.decrease(0.001);
          // Tension after decrease is still >= 0.05, so no rebound should occur
          expect(testSystem.currentTension).toBeLessThanOrEqual(before);
          testSystem.dispose();
        }),
      );
    });

    it('tension changes propagate to all listeners', () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: Math.fround(0.999), noNaN: true }), (delta) => {
          const testSystem = createTensionSystem();
          testSystem.init(mockTensionCurve);
          const listener1 = jest.fn();
          const listener2 = jest.fn();
          testSystem.addListener(listener1);
          testSystem.addListener(listener2);
          testSystem.increase(delta);
          const expected = Math.min(0.999, delta);
          expect(listener1).toHaveBeenCalledWith(expected);
          expect(listener2).toHaveBeenCalledWith(expected);
          testSystem.dispose();
        }),
      );
    });
  });

  describe('Over-Stabilization Rebound', () => {
    it('has a chance to trigger rebound below threshold', () => {
      // Run multiple times to test probabilistic behavior
      let reboundOccurred = false;
      for (let i = 0; i < 1000; i++) {
        const testSystem = createTensionSystem();
        testSystem.init(mockTensionCurve);
        testSystem.setTension(0.03); // Below 0.05 threshold
        const before = testSystem.currentTension;
        // Trigger the check by calling decrease (which calls _checkOverStabilization internally)
        testSystem.decrease(0.001);
        if (testSystem.currentTension > before) {
          reboundOccurred = true;
          // Rebound should increase tension (not just decrease it)
          expect(testSystem.currentTension).toBeGreaterThan(before);
          testSystem.dispose();
          break;
        }
        testSystem.dispose();
      }
      // With 2% probability and 1000 trials, rebound should occur at least once
      expect(reboundOccurred).toBe(true);
    });
  });
});
