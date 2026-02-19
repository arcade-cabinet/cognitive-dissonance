import * as fc from 'fast-check';
import { TensionSystem } from '../../systems/TensionSystem';
import type { TensionCurveConfig } from '../../types';
import { CrystallineCubeBossSystem } from '../CrystallineCubeBossSystem';

// Mock @babylonjs/core modules to avoid ESM import issues
jest.mock('@babylonjs/core/Materials/PBR/pbrMaterial', () => ({
  PBRMaterial: jest.fn().mockImplementation(() => ({
    metallic: 0,
    roughness: 0,
    albedoColor: null,
    emissiveColor: null,
    alpha: 1.0,
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((_r: number, _g: number, _b: number) => ({ r: _r, g: _g, b: _b })),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: Object.assign(
    jest.fn((_x: number, _y: number, _z: number) => ({
      x: _x,
      y: _y,
      z: _z,
      clone: jest.fn(() => ({ x: _x, y: _y, z: _z, add: jest.fn(() => ({ x: _x, y: _y, z: _z })) })),
    })),
    { Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })) },
  ),
}));

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateBox: jest.fn(() => ({
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      scaling: { x: 1, y: 1, z: 1, set: jest.fn() },
      material: null,
      dispose: jest.fn(),
      parent: null,
    })),
  },
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: jest.fn(() => ({
      fromTo: jest.fn().mockReturnThis(),
      to: jest.fn().mockReturnThis(),
      kill: jest.fn(),
    })),
    to: jest.fn(),
  },
}));

// Mock the ECS world
jest.mock('../../ecs/World', () => ({
  world: {
    add: jest.fn((entity: any) => entity),
    remove: jest.fn(),
    with: jest.fn(() => ({ first: null })),
  },
}));

// Helper to create fresh singleton instances bypassing private constructors
function createTensionSystem(): TensionSystem {
  (TensionSystem as any).instance = null;
  return TensionSystem.getInstance();
}

function createBossSystem(): CrystallineCubeBossSystem {
  (CrystallineCubeBossSystem as any).instance = null;
  return CrystallineCubeBossSystem.getInstance();
}

describe('CrystallineCubeBossSystem', () => {
  let system: CrystallineCubeBossSystem;
  let tensionSystem: TensionSystem;
  const mockScene = {
    registerBeforeRender: jest.fn(),
    unregisterBeforeRender: jest.fn(),
  } as any;
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
    system = createBossSystem();
    // Do not call initialize (it requires too many dependencies)
    // Instead, test the public API methods directly by accessing internal state
  });

  afterEach(() => {
    system.dispose();
    tensionSystem.dispose();
  });

  describe('Unit Tests', () => {
    it('tracks consecutive missed patterns', () => {
      system.onPatternMissed();
      expect((system as any).consecutiveMissedPatterns).toBe(1);
    });

    it('resets consecutive misses on pattern stabilization', () => {
      system.onPatternMissed();
      system.onPatternMissed();
      system.onPatternStabilized();
      expect((system as any).consecutiveMissedPatterns).toBe(0);
    });

    it('sets boss spawn threshold', () => {
      system.setBossSpawnThreshold(0.85);
      expect((system as any).bossSpawnThreshold).toBe(0.85);
    });

    it('does not spawn boss with only 2 consecutive misses when scene is not initialized', () => {
      system.onPatternMissed();
      system.onPatternMissed();
      // Boss should not be active with only 2 misses
      expect((system as any).bossActive).toBe(false);
    });

    it('triggers boss spawn after 3 consecutive missed patterns when scene is initialized', () => {
      // Initialize with all required dependencies to allow spawn
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.onPatternMissed();
      system.onPatternMissed();
      system.onPatternMissed();

      // Boss should have been spawned
      expect((system as any).bossActive).toBe(true);
    });

    it('triggers boss spawn when tension >= threshold via setTension', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setBossSpawnThreshold(0.92);
      system.setTension(0.93);

      expect((system as any).bossActive).toBe(true);
    });

    it('does not trigger boss spawn when tension < threshold', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setBossSpawnThreshold(0.92);
      system.setTension(0.9);

      expect((system as any).bossActive).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    // P8: Boss Spawn Conditions via setTension
    it('boss spawns if tension >= threshold', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.6), max: Math.fround(0.92) }),
          fc.float({ min: Math.fround(0.6), max: Math.fround(0.999) }),
          (threshold, tension) => {
            const testSystem = createBossSystem();
            const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
            const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
            const mockMorph = { createMorphedEnemy: jest.fn() } as any;
            testSystem.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

            testSystem.setBossSpawnThreshold(threshold);
            testSystem.setTension(tension);

            const bossActive = (testSystem as any).bossActive as boolean;

            if (tension >= threshold) {
              expect(bossActive).toBe(true);
            } else {
              expect(bossActive).toBe(false);
            }

            testSystem.dispose();
          },
        ),
      );
    });

    // P8: Boss Spawn via consecutive misses
    it('boss spawns after 3 consecutive misses', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 5 }), (missCount) => {
          const testSystem = createBossSystem();
          const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
          const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
          const mockMorph = { createMorphedEnemy: jest.fn() } as any;
          testSystem.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

          for (let i = 0; i < missCount; i++) {
            testSystem.onPatternMissed();
          }

          const bossActive = (testSystem as any).bossActive as boolean;

          if (missCount >= 3) {
            expect(bossActive).toBe(true);
          } else {
            expect(bossActive).toBe(false);
          }

          testSystem.dispose();
        }),
      );
    });
  });
});
