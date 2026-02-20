/**
 * Tests for ProceduralMorphSystem — Cognitive Dissonance v3.0 (Grok spec)
 *
 * Verifies:
 * - ShaderMaterial usage with morphTransition vertex + neonRaymarcher fragment shaders
 * - morphProgress uniform on ShaderMaterial for smooth GPU transitions
 * - Trait-specific vertex displacement targets
 * - MorphTargetManager integration
 * - Per-frame ShaderMaterial uniform updates
 * - Counter mechanic and entity disposal
 */

import type { YukaTrait } from '../../types';
import { ProceduralMorphSystem } from '../ProceduralMorphSystem';

// Mock Babylon.js modules
const mockShaderSetFloat = jest.fn();
const mockShaderSetColor3 = jest.fn();
const mockShaderMaterialDispose = jest.fn();

jest.mock('@babylonjs/core/Materials/shaderMaterial', () => ({
  ShaderMaterial: jest.fn().mockImplementation((_name: string) => ({
    setFloat: mockShaderSetFloat,
    setColor3: mockShaderSetColor3,
    dispose: mockShaderMaterialDispose,
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: Object.assign(
    jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
    { Black: jest.fn(() => ({ r: 0, g: 0, b: 0 })) },
  ),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: jest.fn((x: number, y: number, z: number) => ({ x, y, z })),
}));

const mockPositions = new Float32Array([
  0.1, 0.2, 0.3,
  -0.1, 0.4, 0.0,
  0.0, -0.3, 0.2,
]);

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateIcoSphere: jest.fn((_name: string, _options: any, _scene: any) => ({
      position: { x: 0, y: 0, z: 0 },
      material: null,
      morphTargetManager: null,
      getVerticesData: jest.fn(() => mockPositions),
      dispose: jest.fn(),
      isDisposed: jest.fn(() => false),
    })),
  },
}));

const mockSetPositions = jest.fn();
jest.mock('@babylonjs/core/Morph/morphTarget', () => ({
  MorphTarget: {
    FromMesh: jest.fn((_baseMesh: any, _name: string, _influence: number) => ({
      setPositions: mockSetPositions,
      influence: 0,
    })),
  },
}));

const mockAddTarget = jest.fn();
jest.mock('@babylonjs/core/Morph/morphTargetManager', () => ({
  MorphTargetManager: jest.fn().mockImplementation(() => ({
    addTarget: mockAddTarget,
    numTargets: 1,
    getTarget: jest.fn(() => ({ influence: 0 })),
    dispose: jest.fn(),
  })),
}));

// Mock world
const mockEntities: any[] = [];
const mockWorld = {
  add: jest.fn((entity: any) => {
    mockEntities.push(entity);
    return entity;
  }),
  remove: jest.fn((entity: any) => {
    const idx = mockEntities.indexOf(entity);
    if (idx >= 0) mockEntities.splice(idx, 1);
  }),
  with: jest.fn(() => mockEntities),
};

const ALL_TRAITS: YukaTrait[] = [
  'NeonRaymarcher',
  'TendrilBinder',
  'PlatterCrusher',
  'GlassShatterer',
  'EchoRepeater',
  'LeverSnatcher',
  'SphereCorruptor',
];

describe('ProceduralMorphSystem', () => {
  let system: ProceduralMorphSystem;
  const mockScene = {} as any;

  beforeEach(() => {
    (ProceduralMorphSystem as any).instance = null;
    mockEntities.length = 0;
    mockSetPositions.mockClear();
    mockAddTarget.mockClear();
    mockShaderSetFloat.mockClear();
    mockShaderSetColor3.mockClear();
    mockShaderMaterialDispose.mockClear();
    jest.clearAllMocks();
    system = ProceduralMorphSystem.getInstance(mockScene, mockWorld as any);
  });

  afterEach(() => {
    system.dispose();
  });

  describe('singleton', () => {
    it('returns same instance on subsequent calls', () => {
      const instance2 = ProceduralMorphSystem.getInstance();
      expect(instance2).toBe(system);
    });

    it('throws when first call lacks scene and world', () => {
      system.dispose();
      (ProceduralMorphSystem as any).instance = null;
      expect(() => ProceduralMorphSystem.getInstance()).toThrow(
        'ProceduralMorphSystem: scene and world required for first initialization',
      );
    });
  });

  describe('init', () => {
    it('sets device tier', () => {
      system.init('low');
      expect((system as any).deviceTier).toBe('low');
    });

    it('sets device tier to mid', () => {
      system.init('mid');
      expect((system as any).deviceTier).toBe('mid');
    });

    it('defaults to high tier', () => {
      expect((system as any).deviceTier).toBe('high');
    });
  });

  describe('createMorphedEnemy — ShaderMaterial', () => {
    it('creates a ShaderMaterial with morphTransition vertex shader', () => {
      const { ShaderMaterial } = require('@babylonjs/core/Materials/shaderMaterial');
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);

      expect(ShaderMaterial).toHaveBeenCalledWith(
        expect.stringContaining('mat_NeonRaymarcher'),
        mockScene,
        {
          vertex: 'morphTransition',
          fragment: 'neonRaymarcher',
        },
        expect.objectContaining({
          attributes: expect.arrayContaining(['position', 'normal', 'uv', 'morphPosition', 'morphNormal']),
          uniforms: expect.arrayContaining(['morphProgress', 'traitColor', 'tension', 'time']),
        }),
      );
    });

    it('sets initial morphProgress uniform to 0.0', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);
      expect(mockShaderSetFloat).toHaveBeenCalledWith('morphProgress', 0.0);
    });

    it('sets traitColor uniform on ShaderMaterial', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);
      expect(mockShaderSetColor3).toHaveBeenCalledWith(
        'traitColor',
        expect.objectContaining({ r: 0.0, g: 1.0, b: 1.0 }), // cyan for NeonRaymarcher
      );
    });

    it('sets tension uniform on ShaderMaterial', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);
      expect(mockShaderSetFloat).toHaveBeenCalledWith('tension', 0.0);
    });

    it('sets time uniform on ShaderMaterial', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);
      expect(mockShaderSetFloat).toHaveBeenCalledWith('time', 0.0);
    });

    it('returns shaderMaterial in result object', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      const result = system.createMorphedEnemy('NeonRaymarcher', position);
      expect(result.shaderMaterial).toBeDefined();
    });

    it('returns mesh, manager, and shaderMaterial', () => {
      const position = { x: 1, y: 2, z: 3 } as any;
      const result = system.createMorphedEnemy('NeonRaymarcher', position);
      expect(result.mesh).toBeDefined();
      expect(result.manager).toBeDefined();
      expect(result.shaderMaterial).toBeDefined();
    });

    it('assigns ShaderMaterial to mesh.material', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      const result = system.createMorphedEnemy('NeonRaymarcher', position);
      expect(result.mesh.material).toBeDefined();
    });
  });

  describe('createMorphedEnemy — vertex morphing', () => {
    it('adds morph target to manager', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);
      expect(mockAddTarget).toHaveBeenCalledTimes(1);
    });

    it('calls setPositions with morphed vertex data', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);
      expect(mockSetPositions).toHaveBeenCalledTimes(1);
      const morphedPositions = mockSetPositions.mock.calls[0][0];
      expect(morphedPositions).toBeInstanceOf(Float32Array);
      expect(morphedPositions.length).toBe(mockPositions.length);
    });

    it('uses low subdivisions for low device tier', () => {
      system.init('low');
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);

      const { MeshBuilder } = require('@babylonjs/core/Meshes/meshBuilder');
      expect(MeshBuilder.CreateIcoSphere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ subdivisions: 1 }),
        mockScene,
      );
    });

    it('uses mid subdivisions for mid device tier', () => {
      system.init('mid');
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('PlatterCrusher', position);

      const { MeshBuilder } = require('@babylonjs/core/Meshes/meshBuilder');
      expect(MeshBuilder.CreateIcoSphere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ subdivisions: 2 }),
        mockScene,
      );
    });

    it('uses high subdivisions for high device tier', () => {
      system.init('high');
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('EchoRepeater', position);

      const { MeshBuilder } = require('@babylonjs/core/Meshes/meshBuilder');
      expect(MeshBuilder.CreateIcoSphere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ subdivisions: 3 }),
        mockScene,
      );
    });

    it('increments mesh ID counter for unique names', () => {
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);
      system.createMorphedEnemy('NeonRaymarcher', position);

      const { MeshBuilder } = require('@babylonjs/core/Meshes/meshBuilder');
      const calls = MeshBuilder.CreateIcoSphere.mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });
  });

  describe('morph target generation for all 7 traits', () => {
    for (const trait of ALL_TRAITS) {
      it(`generates morph targets for ${trait}`, () => {
        mockSetPositions.mockClear();
        const position = { x: 0, y: 0, z: 0 } as any;
        system.createMorphedEnemy(trait, position);

        expect(mockSetPositions).toHaveBeenCalledTimes(1);
        const morphed = mockSetPositions.mock.calls[0][0] as Float32Array;
        expect(morphed.length).toBe(mockPositions.length);
      });
    }

    it('NeonRaymarcher stretches x and compresses z', () => {
      mockSetPositions.mockClear();
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);

      const morphed = mockSetPositions.mock.calls[0][0] as Float32Array;
      expect(morphed[0]).toBeCloseTo(0.1 * 1.4, 5);
      expect(morphed[1]).toBeCloseTo(0.2, 5);
      expect(morphed[2]).toBeCloseTo(0.3 * 0.6, 5);
    });

    it('PlatterCrusher flattens and widens', () => {
      mockSetPositions.mockClear();
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('PlatterCrusher', position);

      const morphed = mockSetPositions.mock.calls[0][0] as Float32Array;
      expect(morphed[0]).toBeCloseTo(0.1 * 1.5, 5);
      expect(morphed[1]).toBeCloseTo(0.2 * 0.3, 5);
      expect(morphed[2]).toBeCloseTo(0.3 * 1.5, 5);
    });

    it('LeverSnatcher stretches x and compresses y', () => {
      mockSetPositions.mockClear();
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('LeverSnatcher', position);

      const morphed = mockSetPositions.mock.calls[0][0] as Float32Array;
      expect(morphed[0]).toBeCloseTo(0.1 * 1.6, 5);
      expect(morphed[1]).toBeCloseTo(0.2 * 0.5, 5);
      expect(morphed[2]).toBeCloseTo(0.3, 5);
    });
  });

  describe('setTension', () => {
    it('stores current tension', () => {
      system.setTension(0.5);
      expect((system as any).currentTension).toBe(0.5);
    });
  });

  describe('setMorphSpeed', () => {
    it('sets morph speed multiplier', () => {
      system.setMorphSpeed(2.5);
      expect((system as any).morphSpeed).toBe(2.5);
    });
  });

  describe('counterEnemy', () => {
    it('reduces morphProgress by gripStrength * 0.15', () => {
      const entity = { morphProgress: 0.8 } as any;
      system.counterEnemy(entity, 1.0);
      expect(entity.morphProgress).toBeCloseTo(0.65, 5);
    });

    it('clamps morphProgress to 0', () => {
      const entity = { morphProgress: 0.1 } as any;
      system.counterEnemy(entity, 10.0);
      expect(entity.morphProgress).toBe(0);
    });

    it('is a no-op when morphProgress is undefined', () => {
      const entity = {} as any;
      system.counterEnemy(entity, 1.0);
      expect(entity.morphProgress).toBeUndefined();
    });
  });

  describe('update — ShaderMaterial uniforms', () => {
    it('updates morphProgress on entities', () => {
      system.setTension(0.5);
      const mockMesh = {
        dispose: jest.fn(),
        morphTargetManager: { dispose: jest.fn() },
        material: {
          dispose: jest.fn(),
          setFloat: jest.fn(),
        },
      };
      const entity = {
        enemy: true,
        yuka: true,
        morphTarget: { mesh: mockMesh, manager: { numTargets: 1, getTarget: jest.fn(() => ({ influence: 0 })) } },
        currentTrait: 'NeonRaymarcher' as YukaTrait,
        morphProgress: 0.0,
      };
      mockEntities.push(entity);

      system.update(0.016);
      expect(entity.morphProgress).toBeGreaterThan(0);
    });

    it('updates ShaderMaterial morphProgress uniform per frame', () => {
      system.setTension(0.5);
      const mockSetFloatFn = jest.fn();
      const mockMesh = {
        dispose: jest.fn(),
        morphTargetManager: { dispose: jest.fn() },
        material: {
          dispose: jest.fn(),
          setFloat: mockSetFloatFn,
        },
      };
      const entity = {
        enemy: true,
        yuka: true,
        morphTarget: { mesh: mockMesh, manager: { numTargets: 1, getTarget: jest.fn(() => ({ influence: 0 })) } },
        currentTrait: 'NeonRaymarcher' as YukaTrait,
        morphProgress: 0.5,
      };
      mockEntities.push(entity);

      system.update(0.016);

      expect(mockSetFloatFn).toHaveBeenCalledWith('morphProgress', expect.any(Number));
      expect(mockSetFloatFn).toHaveBeenCalledWith('tension', expect.any(Number));
      expect(mockSetFloatFn).toHaveBeenCalledWith('time', expect.any(Number));
    });

    it('clamps morphProgress to [0, 1]', () => {
      system.setTension(1.0);
      const mockMesh = {
        dispose: jest.fn(),
        morphTargetManager: { dispose: jest.fn() },
        material: {
          dispose: jest.fn(),
          setFloat: jest.fn(),
        },
      };
      const entity = {
        enemy: true,
        yuka: true,
        morphTarget: { mesh: mockMesh, manager: { numTargets: 1, getTarget: jest.fn(() => ({ influence: 0 })) } },
        currentTrait: 'NeonRaymarcher' as YukaTrait,
        morphProgress: 0.99,
      };
      mockEntities.push(entity);

      system.update(100);

      expect(entity.morphProgress).toBeLessThanOrEqual(1.0);
      expect(entity.morphProgress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('trait colors', () => {
    it('sets cyan for NeonRaymarcher', () => {
      mockShaderSetColor3.mockClear();
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('NeonRaymarcher', position);
      expect(mockShaderSetColor3).toHaveBeenCalledWith(
        'traitColor',
        expect.objectContaining({ r: 0.0, g: 1.0, b: 1.0 }),
      );
    });

    it('sets magenta for TendrilBinder', () => {
      mockShaderSetColor3.mockClear();
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('TendrilBinder', position);
      expect(mockShaderSetColor3).toHaveBeenCalledWith(
        'traitColor',
        expect.objectContaining({ r: 1.0, g: 0.0, b: 1.0 }),
      );
    });

    it('sets red for SphereCorruptor', () => {
      mockShaderSetColor3.mockClear();
      const position = { x: 0, y: 0, z: 0 } as any;
      system.createMorphedEnemy('SphereCorruptor', position);
      expect(mockShaderSetColor3).toHaveBeenCalledWith(
        'traitColor',
        expect.objectContaining({ r: 1.0, g: 0.0, b: 0.0 }),
      );
    });
  });

  describe('reset', () => {
    it('resets tension to 0', () => {
      system.setTension(0.8);
      system.reset();
      expect((system as any).currentTension).toBe(0.0);
    });

    it('resets morphSpeed to 1.0', () => {
      system.setMorphSpeed(3.0);
      system.reset();
      expect((system as any).morphSpeed).toBe(1.0);
    });
  });

  describe('dispose', () => {
    it('sets singleton instance to null', () => {
      system.dispose();
      expect((ProceduralMorphSystem as any).instance).toBeNull();
    });

    it('resets state on dispose', () => {
      system.setTension(0.8);
      system.setMorphSpeed(2.0);
      system.dispose();
      (ProceduralMorphSystem as any).instance = null;
      const fresh = ProceduralMorphSystem.getInstance(mockScene, mockWorld as any);
      expect((fresh as any).currentTension).toBe(0.0);
      expect((fresh as any).morphSpeed).toBe(1.0);
      fresh.dispose();
    });
  });
});
