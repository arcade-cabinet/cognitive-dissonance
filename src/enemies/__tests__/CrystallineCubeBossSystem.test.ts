import * as fc from 'fast-check';
import { TensionSystem } from '../../systems/TensionSystem';
import type { TensionCurveConfig } from '../../types';
import { CrystallineCubeBossSystem } from '../CrystallineCubeBossSystem';

// Track vertex data operations — vertices with non-zero x AND z for displacement
const mockVerticesData = new Float32Array([
  0.2, 0.1, 0.15,
  -0.15, 0.2, 0.1,
  0.1, -0.2, 0.25,
  -0.1, 0.15, -0.2,
  0.25, -0.1, 0.1,
  -0.2, -0.15, -0.15,
]);

const mockSetVerticesData = jest.fn();
const mockGetVerticesData = jest.fn(() => Array.from(mockVerticesData));

const mockShaderMaterialSetColor3 = jest.fn();
const mockShaderMaterialSetFloat = jest.fn();

// Mock @babylonjs/core modules
jest.mock('@babylonjs/core/Buffers/buffer', () => ({
  VertexBuffer: {
    PositionKind: 'position',
  },
}));

jest.mock('@babylonjs/core/Materials/PBR/pbrMaterial', () => ({
  PBRMaterial: jest.fn().mockImplementation(() => ({
    metallic: 0,
    roughness: 0,
    albedoColor: null,
    emissiveColor: null,
    alpha: 1.0,
    subSurface: {
      isRefractionEnabled: false,
      refractionIntensity: 0,
      indexOfRefraction: 0,
    },
  })),
}));

jest.mock('@babylonjs/core/Materials/shaderMaterial', () => ({
  ShaderMaterial: jest.fn().mockImplementation(() => ({
    setColor3: mockShaderMaterialSetColor3,
    setFloat: mockShaderMaterialSetFloat,
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
    CreatePolyhedron: jest.fn(() => ({
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      scaling: { x: 1, y: 1, z: 1, set: jest.fn() },
      material: null,
      dispose: jest.fn(),
      parent: null,
      getVerticesData: mockGetVerticesData,
      setVerticesData: mockSetVerticesData,
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

import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';

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
    jest.clearAllMocks();
    tensionSystem = createTensionSystem();
    tensionSystem.init(mockTensionCurve);
    system = createBossSystem();
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
      expect((system as any).bossActive).toBe(false);
    });

    it('triggers boss spawn after 3 consecutive missed patterns when scene is initialized', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.onPatternMissed();
      system.onPatternMissed();
      system.onPatternMissed();

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

  describe('Polyhedron Geometry', () => {
    it('creates a dodecahedron (type 1) polyhedron instead of a box', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(MeshBuilder.CreatePolyhedron).toHaveBeenCalledWith(
        'crystallineCubeBoss',
        { type: 1, size: 0.3 },
        expect.anything(),
      );
    });

    it('reads vertex position data from the polyhedron mesh', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(mockGetVerticesData).toHaveBeenCalledWith(VertexBuffer.PositionKind);
    });

    it('applies sine vertex displacement to polyhedron vertices', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(mockSetVerticesData).toHaveBeenCalledWith(
        VertexBuffer.PositionKind,
        expect.any(Array),
      );
    });

    it('displaces vertices using sine displacement formula', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      const setCall = mockSetVerticesData.mock.calls[0];
      const displacedPositions = setCall[1] as number[];

      // Vertices should be displaced (not identical to original)
      const originalPositions = Array.from(mockVerticesData);
      let anyDifferent = false;
      for (let i = 0; i < displacedPositions.length; i++) {
        if (Math.abs(displacedPositions[i] - originalPositions[i]) > 1e-10) {
          anyDifferent = true;
          break;
        }
      }
      expect(anyDifferent).toBe(true);
    });

    it('vertex displacement uses sin(x*8) * sin(z*8) * 0.05 formula', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      const setCall = mockSetVerticesData.mock.calls[0];
      const displacedPositions = setCall[1] as number[];

      // Verify first vertex displacement manually (0.2, 0.1, 0.15)
      const x = 0.2, y = 0.1, z = 0.15;
      const mag = Math.sqrt(x * x + y * y + z * z + 0.001);
      const disp = Math.sin(x * 8.0) * Math.sin(z * 8.0) * 0.05;
      const expectedX = x + (disp * x) / mag;
      expect(displacedPositions[0]).toBeCloseTo(expectedX, 6);
    });

    it('does not use CreateBox for boss mesh', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect((MeshBuilder as any).CreateBox).toBeUndefined();
    });
  });

  describe('ShaderMaterial', () => {
    it('creates a ShaderMaterial referencing crystallineBoss shader', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(ShaderMaterial).toHaveBeenCalledWith(
        'crystallineBossShader',
        expect.anything(),
        { vertex: 'crystallineBoss', fragment: 'crystallineBoss' },
        expect.objectContaining({
          attributes: ['position', 'normal', 'uv'],
          uniforms: expect.arrayContaining([
            'worldViewProjection',
            'world',
            'tension',
            'time',
            'baseColor',
          ]),
          needAlphaBlending: true,
        }),
      );
    });

    it('sets initial baseColor uniform on the ShaderMaterial', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(mockShaderMaterialSetColor3).toHaveBeenCalledWith(
        'baseColor',
        expect.objectContaining({ r: 0.7, g: 0.9, b: 1.0 }),
      );
    });

    it('sets initial tension uniform to 0.0', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(mockShaderMaterialSetFloat).toHaveBeenCalledWith('tension', 0.0);
    });

    it('sets initial time uniform to 0.0', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(mockShaderMaterialSetFloat).toHaveBeenCalledWith('time', 0.0);
    });

    it('sets initial deviceQualityLOD uniform to 1.0', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(mockShaderMaterialSetFloat).toHaveBeenCalledWith('deviceQualityLOD', 1.0);
    });

    it('falls back to PBRMaterial when ShaderMaterial throws', () => {
      const { PBRMaterial } = jest.requireMock('@babylonjs/core/Materials/PBR/pbrMaterial');

      // Make ShaderMaterial throw
      (ShaderMaterial as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Shader compilation failed');
      });

      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      // PBRMaterial should have been created as fallback
      expect(PBRMaterial).toHaveBeenCalledWith('crystallineBossMaterial', expect.anything());
    });
  });

  describe('Existing Functionality Preservation', () => {
    it('still creates ECS entity on boss spawn', () => {
      const { world } = jest.requireMock('../../ecs/World');
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(world.add).toHaveBeenCalledWith(
        expect.objectContaining({
          boss: true,
          cubeCrystalline: true,
          crushPhase: 0,
          health: 1.0,
        }),
      );
    });

    it('still builds GSAP timeline on boss spawn', () => {
      const gsap = jest.requireMock('gsap').default;
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);

      expect(gsap.timeline).toHaveBeenCalled();
    });

    it('counterBoss reduces health during phase 4', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);
      (system as any).currentPhase = 4;

      system.counterBoss(0.5);
      expect((system as any).bossHealth).toBeCloseTo(1.0 - 0.5 * 0.012, 10);
    });

    it('counterBoss does nothing outside phase 4', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);
      (system as any).currentPhase = 2;

      system.counterBoss(0.5);
      expect((system as any).bossHealth).toBe(1.0);
    });

    it('reset disposes boss and resets state', () => {
      const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
      const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
      const mockMorph = { createMorphedEnemy: jest.fn() } as any;
      system.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

      system.setTension(0.93);
      system.reset();

      expect((system as any).bossActive).toBe(false);
      expect((system as any).bossMesh).toBeNull();
      expect((system as any).consecutiveMissedPatterns).toBe(0);
    });
  });

  describe('Property-Based Tests', () => {
    it('boss spawns if tension >= threshold', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.6), max: Math.fround(0.92), noNaN: true, noDefaultInfinity: true }),
          fc.float({ min: Math.fround(0.6), max: Math.fround(0.999), noNaN: true, noDefaultInfinity: true }),
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

    it('polyhedron is always created with type 1 and size 0.3', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.93), max: Math.fround(0.999), noNaN: true, noDefaultInfinity: true }),
          (tension) => {
            jest.clearAllMocks();
            const testSystem = createBossSystem();
            const mockPlatterMesh = { position: { x: 0, y: 0, z: 0 } } as any;
            const mockDegradation = { triggerWorldImpact: jest.fn() } as any;
            const mockMorph = { createMorphedEnemy: jest.fn() } as any;
            testSystem.initialize(mockScene, tensionSystem, mockDegradation, mockMorph, mockPlatterMesh);

            testSystem.setTension(tension);

            expect(MeshBuilder.CreatePolyhedron).toHaveBeenCalledWith(
              'crystallineCubeBoss',
              { type: 1, size: 0.3 },
              expect.anything(),
            );

            testSystem.dispose();
          },
        ),
      );
    });
  });
});
