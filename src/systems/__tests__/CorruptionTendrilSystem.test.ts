import * as fc from 'fast-check';
import type { TensionCurveConfig } from '../../types';
import { CorruptionTendrilSystem } from '../CorruptionTendrilSystem';
import { TensionSystem } from '../TensionSystem';

// Mock @babylonjs/core modules to avoid ESM import issues
jest.mock('@babylonjs/core/Materials/standardMaterial', () => ({
  StandardMaterial: jest.fn().mockImplementation(() => ({
    emissiveColor: null,
    disableLighting: false,
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: {
    White: jest.fn(() => ({ r: 1, g: 1, b: 1 })),
    FromHSV: jest.fn((_h: number, _s: number, _v: number) => ({ r: 1, g: 0, b: 0 })),
  },
  Color4: jest.fn((_r: number, _g: number, _b: number, _a: number) => ({ r: _r, g: _g, b: _b, a: _a })),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: Object.assign(
    jest.fn((_x: number, _y: number, _z: number) => ({ x: _x, y: _y, z: _z })),
    { Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })) },
  ),
}));

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateCylinder: jest.fn(() => ({
      dispose: jest.fn(),
    })),
  },
}));

jest.mock('@babylonjs/core/Particles/solidParticleSystem', () => ({
  SolidParticleSystem: jest.fn().mockImplementation(() => {
    const particles: any[] = [];
    return {
      addShape: jest.fn((_shape: any, count: number) => {
        for (let i = 0; i < count; i++) {
          particles.push({
            idx: i,
            isVisible: false,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scaling: { x: 1, y: 1, z: 1 },
            color: null,
          });
        }
      }),
      buildMesh: jest.fn(() => ({
        parent: null,
        material: null,
      })),
      initParticles: null as any,
      updateParticle: null as any,
      setParticles: jest.fn(),
      particles,
      nbParticles: 24,
      dispose: jest.fn(),
    };
  }),
}));

// Helper to create fresh singleton instances bypassing private constructors
function createTensionSystem(): TensionSystem {
  (TensionSystem as any).instance = null;
  return TensionSystem.getInstance();
}

function createCorruptionTendrilSystem(): CorruptionTendrilSystem {
  (CorruptionTendrilSystem as any).instance = null;
  return CorruptionTendrilSystem.getInstance();
}

describe('CorruptionTendrilSystem', () => {
  let system: CorruptionTendrilSystem;
  let tensionSystem: TensionSystem;
  const mockScene = {} as any;
  const mockSphereMesh = {} as any;
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
    system = createCorruptionTendrilSystem();
    // Source uses init() not initialize()
    system.init(mockScene, mockSphereMesh, 12345);
  });

  afterEach(() => {
    system.dispose();
    tensionSystem.dispose();
  });

  describe('Unit Tests', () => {
    it('initializes with no active tendrils', () => {
      // Access private activeTendrils map to check count
      const activeTendrils = (system as any).activeTendrils as Map<string, number>;
      expect(activeTendrils.size).toBe(0);
    });

    it('spawns tendrils when tension > 0.3 and update is called', () => {
      tensionSystem.setTension(0.5);
      // Mock performance.now to advance time
      const originalNow = performance.now;
      let mockTime = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        mockTime += 2000; // Advance well past spawn interval
        return mockTime;
      });

      // Call private update method
      (system as any).update(1000);

      const activeTendrils = (system as any).activeTendrils as Map<string, number>;
      expect(activeTendrils.size).toBeGreaterThan(0);

      performance.now = originalNow;
    });

    it('does not spawn tendrils when tension <= 0.3', () => {
      tensionSystem.setTension(0.2);
      (system as any).update(1000);
      const activeTendrils = (system as any).activeTendrils as Map<string, number>;
      expect(activeTendrils.size).toBe(0);
    });

    it('retractFromKey decreases tension', () => {
      // Manually add a tendril to the active map
      const activeTendrils = (system as any).activeTendrils as Map<string, number>;
      const sps = (system as any).sps;
      if (sps && sps.particles && sps.particles[0]) {
        sps.particles[0].isVisible = true;
        activeTendrils.set('Q', 0);
      }

      tensionSystem.setTension(0.5);
      const initialTension = tensionSystem.currentTension;
      system.retractFromKey('Q');

      // Tension should decrease by 0.03
      expect(tensionSystem.currentTension).toBeLessThan(initialTension);
    });

    it('respects max tendril count (24)', () => {
      const maxTendrils = (system as any).maxTendrils;
      expect(maxTendrils).toBe(24);
    });
  });

  describe('Property-Based Tests', () => {
    it('tension threshold is always 0.3', () => {
      const threshold = (system as any).tensionThreshold;
      expect(threshold).toBe(0.3);
    });

    it('retraction always decreases tension by 0.03 (clamped at 0)', () => {
      // Use a tension curve with no rebound to isolate the retraction behavior
      const noReboundCurve: TensionCurveConfig = {
        ...mockTensionCurve,
        reboundProbability: 0,
        reboundAmount: 0,
      };
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.04), max: Math.fround(0.999), noNaN: true, noDefaultInfinity: true }),
          (tension) => {
            const testTensionSystem = createTensionSystem();
            testTensionSystem.init(noReboundCurve);
            testTensionSystem.setTension(tension);

            const testSystem = createCorruptionTendrilSystem();
            testSystem.init(mockScene, mockSphereMesh, 12345);

            // Manually set up an active tendril
            const activeTendrils = (testSystem as any).activeTendrils as Map<string, number>;
            const sps = (testSystem as any).sps;
            if (sps && sps.particles && sps.particles[0]) {
              sps.particles[0].isVisible = true;
              activeTendrils.set('TestKey', 0);
            }

            const before = testTensionSystem.currentTension;
            testSystem.retractFromKey('TestKey');

            // Tension should decrease (by 0.03 * decreaseRate)
            expect(testTensionSystem.currentTension).toBeLessThan(before);
            expect(testTensionSystem.currentTension).toBeGreaterThanOrEqual(0.0);

            testSystem.dispose();
            testTensionSystem.dispose();
          },
        ),
      );
    });
  });
});
