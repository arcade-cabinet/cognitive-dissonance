import * as fc from 'fast-check';
import type { TensionCurveConfig } from '../../types';
import { EchoSystem } from '../EchoSystem';
import { TensionSystem } from '../TensionSystem';

// Provide window.setTimeout and window.clearTimeout in Node.js environment
if (typeof window === 'undefined') {
  (global as any).window = {
    setTimeout: global.setTimeout.bind(global),
    clearTimeout: global.clearTimeout.bind(global),
  };
}

// Mock @babylonjs/core modules to avoid ESM import issues
jest.mock('@babylonjs/core/Materials/standardMaterial', () => ({
  StandardMaterial: jest.fn().mockImplementation(() => ({
    diffuseColor: null,
    emissiveColor: null,
    alpha: 1.0,
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((_r: number, _g: number, _b: number) => ({ r: _r, g: _g, b: _b })),
}));

jest.mock('@babylonjs/core/Meshes/mesh', () => ({
  Mesh: {
    CreateBox: jest.fn((_name: string, _size: number, _scene: any) => ({
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      scaling: { x: 1, y: 1, z: 1, set: jest.fn() },
      material: null,
      dispose: jest.fn(),
    })),
  },
}));

// Mock window.setTimeout and window.clearTimeout
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;

// Helper to create fresh singleton instances bypassing private constructors
function createTensionSystem(): TensionSystem {
  (TensionSystem as any).instance = null;
  return TensionSystem.getInstance();
}

function createEchoSystem(): EchoSystem {
  (EchoSystem as any).instance = null;
  return EchoSystem.getInstance();
}

describe('EchoSystem', () => {
  let system: EchoSystem;
  let tensionSystem: TensionSystem;
  const mockScene = {} as any;
  const mockTensionCurve: TensionCurveConfig = {
    increaseRate: 1.0,
    decreaseRate: 1.0,
    overStabilizationThreshold: 0.05,
    reboundProbability: 0.02,
    reboundAmount: 0.12,
  };

  beforeEach(() => {
    tensionSystem = createTensionSystem();
    tensionSystem.init(mockTensionCurve);
    system = createEchoSystem();
    // Source initialize takes (scene, tensionSystem)
    system.initialize(mockScene, tensionSystem);
  });

  afterEach(() => {
    system.dispose();
    tensionSystem.dispose();
  });

  describe('Unit Tests', () => {
    it('spawns echo and increases tension', () => {
      const initialTension = tensionSystem.currentTension;
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      // Tension should increase by 0.035
      expect(tensionSystem.currentTension).toBeGreaterThan(initialTension);
      expect(tensionSystem.currentTension).toBeCloseTo(initialTension + 0.035, 5);
    });

    it('prevents duplicate echoes for the same key', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      const tensionAfterFirst = tensionSystem.currentTension;

      // Try to spawn another echo for the same key
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      // Tension should not increase again
      expect(tensionSystem.currentTension).toBe(tensionAfterFirst);
    });

    it('allows echoes for different keys', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      const tensionAfterFirst = tensionSystem.currentTension;

      system.spawnEcho('W', { x: 0, y: 0, z: 0 });

      // Tension should increase again
      expect(tensionSystem.currentTension).toBeGreaterThan(tensionAfterFirst);
    });

    it('hasActiveEcho returns true for spawned echo', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      // Echo should exist immediately
      expect(system.hasActiveEcho('Q')).toBe(true);
    });

    it('disposeEcho removes the echo', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      expect(system.hasActiveEcho('Q')).toBe(true);

      system.disposeEcho('Q');
      expect(system.hasActiveEcho('Q')).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    // P6: Echo Uniqueness
    it('at most one active echo per key at any time', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'), { minLength: 1, maxLength: 10 }),
          (keys) => {
            const testSystem = createEchoSystem();
            testSystem.initialize(mockScene, tensionSystem);

            // Spawn echoes for all keys (including duplicates)
            for (const key of keys) {
              testSystem.spawnEcho(key, { x: 0, y: 0, z: 0 });
            }

            // Count unique keys
            const uniqueKeys = new Set(keys);

            // Active echo count should equal unique key count
            let activeCount = 0;
            for (const key of uniqueKeys) {
              if (testSystem.hasActiveEcho(key)) {
                activeCount++;
              }
            }

            expect(activeCount).toBe(uniqueKeys.size);

            testSystem.dispose();
          },
        ),
      );
    });

    it('spawning echo for same key multiple times is a no-op', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'),
          fc.integer({ min: 2, max: 10 }),
          (key, spawnCount) => {
            const testTensionSystem = createTensionSystem();
            testTensionSystem.init(mockTensionCurve);
            const testSystem = createEchoSystem();
            testSystem.initialize(mockScene, testTensionSystem);

            testTensionSystem.setTension(0.0);

            // Spawn echo multiple times for the same key
            for (let i = 0; i < spawnCount; i++) {
              testSystem.spawnEcho(key, { x: 0, y: 0, z: 0 });
            }

            // Tension should only increase once (0.035)
            expect(testTensionSystem.currentTension).toBeCloseTo(0.035, 5);

            testSystem.dispose();
            testTensionSystem.dispose();
          },
        ),
      );
    });
  });
});
