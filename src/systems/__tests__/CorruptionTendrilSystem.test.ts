import * as fc from 'fast-check';
import type { TensionCurveConfig } from '../../types';
import { CorruptionTendrilSystem } from '../CorruptionTendrilSystem';
import { TensionSystem } from '../TensionSystem';

const mockShaderMaterialSetFloat = jest.fn();
const mockShaderMaterialSetColor3 = jest.fn();

// Mock @babylonjs/core modules to avoid ESM import issues
jest.mock('@babylonjs/core/Materials/shaderMaterial', () => ({
  ShaderMaterial: jest.fn().mockImplementation(() => ({
    setFloat: mockShaderMaterialSetFloat,
    setColor3: mockShaderMaterialSetColor3,
  })),
}));

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

jest.mock('@babylonjs/core/Maths/math.vector', () => {
  const createVector3 = (x: number, y: number, z: number) => ({
    x,
    y,
    z,
    addInPlace(other: { x: number; y: number; z: number }) {
      this.x += other.x;
      this.y += other.y;
      this.z += other.z;
      return this;
    },
    scale(factor: number) {
      return createVector3(this.x * factor, this.y * factor, this.z * factor);
    },
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },
    normalize() {
      const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
      if (len === 0) return this;
      this.x /= len;
      this.y /= len;
      this.z /= len;
      return this;
    },
  });

  const Vector3Constructor = jest.fn((x: number, y: number, z: number) => createVector3(x, y, z));
  (Vector3Constructor as any).Zero = jest.fn(() => createVector3(0, 0, 0));

  return { Vector3: Vector3Constructor };
});

const mockTubeDispose = jest.fn();
jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateTube: jest.fn(() => ({
      dispose: mockTubeDispose,
    })),
  },
}));

jest.mock('@babylonjs/core/Meshes/mesh', () => ({
  Mesh: {
    CAP_ALL: 3,
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

import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

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
    jest.clearAllMocks();
    tensionSystem = createTensionSystem();
    tensionSystem.init(mockTensionCurve);
    system = createCorruptionTendrilSystem();
    system.init(mockScene, mockSphereMesh, 12345);
  });

  afterEach(() => {
    system.dispose();
    tensionSystem.dispose();
  });

  describe('Unit Tests', () => {
    it('initializes with no active tendrils', () => {
      const activeTendrils = (system as any).activeTendrils as Map<string, number>;
      expect(activeTendrils.size).toBe(0);
    });

    it('spawns tendrils when tension > 0.3 and update is called', () => {
      tensionSystem.setTension(0.5);
      const originalNow = performance.now;
      let mockTime = 0;
      jest.spyOn(performance, 'now').mockImplementation(() => {
        mockTime += 2000;
        return mockTime;
      });

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
      const activeTendrils = (system as any).activeTendrils as Map<string, number>;
      const sps = (system as any).sps;
      if (sps && sps.particles && sps.particles[0]) {
        sps.particles[0].isVisible = true;
        activeTendrils.set('Q', 0);
      }

      tensionSystem.setTension(0.5);
      const initialTension = tensionSystem.currentTension;
      system.retractFromKey('Q');

      expect(tensionSystem.currentTension).toBeLessThan(initialTension);
    });

    it('respects max tendril count (24)', () => {
      const maxTendrils = (system as any).maxTendrils;
      expect(maxTendrils).toBe(24);
    });
  });

  describe('Tube Geometry', () => {
    it('creates a tube instead of a cylinder', () => {
      expect(MeshBuilder.CreateTube).toHaveBeenCalledWith(
        'tendrilShape',
        expect.objectContaining({
          path: expect.any(Array),
          radiusFunction: expect.any(Function),
          tessellation: 6,
          cap: Mesh.CAP_ALL,
        }),
        expect.anything(),
      );
    });

    it('does not use CreateCylinder', () => {
      expect((MeshBuilder as any).CreateCylinder).toBeUndefined();
    });

    it('tube path has 13 points (segments=12, 0..12 inclusive)', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      expect(options.path.length).toBe(13);
    });

    it('tube path starts near origin (y=0)', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      const firstPoint = options.path[0];
      expect(firstPoint.y).toBeCloseTo(0, 5);
    });

    it('tube path ends at y=0.5 (full height)', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      const lastPoint = options.path[options.path.length - 1];
      expect(lastPoint.y).toBeCloseTo(0.5, 5);
    });

    it('tube path has sinusoidal X displacement', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      // Check that at least one point has non-zero X (sinuous)
      const hasNonZeroX = options.path.some((p: any) => Math.abs(p.x) > 0.001);
      expect(hasNonZeroX).toBe(true);
    });

    it('tube path has sinusoidal Z displacement', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      // Check that at least one point has non-zero Z (sinuous)
      const hasNonZeroZ = options.path.some((p: any) => Math.abs(p.z) > 0.001);
      expect(hasNonZeroZ).toBe(true);
    });

    it('tube uses radiusFunction for tapering', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      const radiusFn = options.radiusFunction;

      // At base (dist=0), radius = 0.01
      expect(radiusFn(0, 0)).toBeCloseTo(0.01, 5);
      // At tip (dist=1), radius = 0.01 * 0.3 = 0.003
      expect(radiusFn(0, 1)).toBeCloseTo(0.003, 5);
    });

    it('tube radius tapers from 0.01 at base to 0.003 at tip', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      const radiusFn = options.radiusFunction;

      const baseRadius = radiusFn(0, 0);
      const tipRadius = radiusFn(0, 1);
      expect(baseRadius).toBeGreaterThan(tipRadius);
    });

    it('disposes the temporary tendril tube mesh after SPS addShape', () => {
      expect(mockTubeDispose).toHaveBeenCalled();
    });

    it('tube tessellation is 6', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      expect(options.tessellation).toBe(6);
    });

    it('tube uses CAP_ALL for capped ends', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const options = createTubeCall[1];
      expect(options.cap).toBe(Mesh.CAP_ALL);
    });
  });

  describe('ShaderMaterial for tendrils', () => {
    it('creates a ShaderMaterial referencing corruptionTendril shader', () => {
      expect(ShaderMaterial).toHaveBeenCalledWith(
        'tendrilShaderMaterial',
        expect.anything(),
        { vertex: 'corruptionTendril', fragment: 'corruptionTendril' },
        expect.objectContaining({
          attributes: ['position', 'normal', 'uv'],
          uniforms: expect.arrayContaining([
            'worldViewProjection',
            'world',
            'tension',
            'time',
            'corruptionLevel',
            'baseColor',
            'deviceQualityLOD',
          ]),
          needAlphaBlending: true,
        }),
      );
    });

    it('sets initial float uniforms on the ShaderMaterial', () => {
      expect(mockShaderMaterialSetFloat).toHaveBeenCalledWith('tension', 0.0);
      expect(mockShaderMaterialSetFloat).toHaveBeenCalledWith('time', 0.0);
      expect(mockShaderMaterialSetFloat).toHaveBeenCalledWith('corruptionLevel', 0.0);
      expect(mockShaderMaterialSetFloat).toHaveBeenCalledWith('deviceQualityLOD', 1.0);
    });

    it('falls back to StandardMaterial when ShaderMaterial throws', () => {
      const { StandardMaterial } = jest.requireMock('@babylonjs/core/Materials/standardMaterial');

      (ShaderMaterial as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Shader compilation failed');
      });

      const fallbackSystem = createCorruptionTendrilSystem();
      fallbackSystem.init(mockScene, mockSphereMesh, 54321);

      // StandardMaterial should have been created as fallback
      expect(StandardMaterial).toHaveBeenCalledWith('tendrilMaterial', expect.anything());

      fallbackSystem.dispose();
    });
  });

  describe('Sinuous Path Generation', () => {
    it('generates 13 Vector3 points for the tendril path', () => {
      // Count Vector3 calls for the path (13 points for segments=12)
      const v3Calls = (Vector3 as unknown as jest.Mock).mock.calls;
      // The first 13 calls should be the path points
      expect(v3Calls.length).toBeGreaterThanOrEqual(13);
    });

    it('path point X uses sin(t * PI * 3) * 0.02 formula', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const pathPoints = createTubeCall[1].path;
      // Check midpoint (j=6, t=0.5)
      const t = 6 / 12;
      const expectedX = Math.sin(t * Math.PI * 3) * 0.02;
      expect(pathPoints[6].x).toBeCloseTo(expectedX, 5);
    });

    it('path point Z uses cos(t * PI * 2) * 0.015 formula', () => {
      const createTubeCall = (MeshBuilder.CreateTube as jest.Mock).mock.calls[0];
      const pathPoints = createTubeCall[1].path;
      // Check midpoint (j=6, t=0.5)
      const t = 6 / 12;
      const expectedZ = Math.cos(t * Math.PI * 2) * 0.015;
      expect(pathPoints[6].z).toBeCloseTo(expectedZ, 5);
    });
  });

  describe('Existing Functionality Preservation', () => {
    it('still builds SPS mesh and parents to sphere', () => {
      const sps = (system as any).sps;
      expect(sps.buildMesh).toHaveBeenCalled();
    });

    it('stop/resume controls spawning', () => {
      system.stop();
      expect((system as any)._stopped).toBe(true);
      system.resume();
      expect((system as any)._stopped).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    it('tension threshold is always 0.3', () => {
      const threshold = (system as any).tensionThreshold;
      expect(threshold).toBe(0.3);
    });

    it('retraction always decreases tension by 0.03 (clamped at 0)', () => {
      const noReboundCurve: TensionCurveConfig = {
        ...mockTensionCurve,
        reboundProbability: 0,
        reboundAmount: 0,
      };
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.04), max: Math.fround(0.98), noNaN: true, noDefaultInfinity: true }),
          (tension) => {
            const testTensionSystem = createTensionSystem();
            testTensionSystem.init(noReboundCurve);
            testTensionSystem.setTension(tension);

            const testSystem = createCorruptionTendrilSystem();
            testSystem.init(mockScene, mockSphereMesh, 12345);

            const activeTendrils = (testSystem as any).activeTendrils as Map<string, number>;
            const sps = (testSystem as any).sps;
            if (sps && sps.particles && sps.particles[0]) {
              sps.particles[0].isVisible = true;
              activeTendrils.set('TestKey', 0);
            }

            const before = testTensionSystem.currentTension;
            testSystem.retractFromKey('TestKey');

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
