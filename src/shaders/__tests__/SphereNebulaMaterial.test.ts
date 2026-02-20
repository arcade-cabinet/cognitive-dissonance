/**
 * Tests for SphereNebulaMaterial — Cognitive Dissonance v3.0
 *
 * Verifies dual-material setup (glass outer + nebula inner sphere),
 * shader uniform updates, breathing pulse via shader, and disposal.
 */

const mockGlassMaterialDispose = jest.fn();
const mockNebulaMaterialDispose = jest.fn();
const mockNebulaMaterialSetFloat = jest.fn();
const mockNebulaMaterialSetColor3 = jest.fn();

const mockGlassMaterial = {
  metallic: 0,
  roughness: 0,
  alpha: 0,
  emissiveColor: null as any,
  emissiveIntensity: 0,
  subSurface: {
    isRefractionEnabled: false,
    refractionIntensity: 0,
    indexOfRefraction: 0,
  },
  dispose: mockGlassMaterialDispose,
};

const mockNebulaMaterial = {
  setFloat: mockNebulaMaterialSetFloat,
  setColor3: mockNebulaMaterialSetColor3,
  dispose: mockNebulaMaterialDispose,
};

jest.mock('@babylonjs/core/Materials/PBR/pbrMaterial', () => ({
  PBRMaterial: jest.fn(() => mockGlassMaterial),
}));

jest.mock('@babylonjs/core/Materials/shaderMaterial', () => ({
  ShaderMaterial: jest.fn(() => mockNebulaMaterial),
}));

const mockLerp = jest.fn(
  (start: { r: number; g: number; b: number }, end: { r: number; g: number; b: number }, t: number) => ({
    r: start.r + (end.r - start.r) * t,
    g: start.g + (end.g - start.g) * t,
    b: start.b + (end.b - start.b) * t,
  }),
);

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: Object.assign(
    jest.fn((r: number, g: number, b: number) => ({
      r,
      g,
      b,
      clone: () => ({ r, g, b }),
    })),
    { Lerp: mockLerp },
  ),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: Object.assign(
    jest.fn((x: number, y: number, z: number) => ({ x, y, z })),
    { One: jest.fn(() => ({ x: 1, y: 1, z: 1 })) },
  ),
}));

const mockInnerSphereDispose = jest.fn();
jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateSphere: jest.fn(() => ({
      parent: null,
      material: null,
      dispose: mockInnerSphereDispose,
    })),
  },
}));

jest.mock('@babylonjs/core/Meshes/mesh', () => ({}));
jest.mock('@babylonjs/core/scene', () => ({}));

import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { SphereNebulaMaterial } from '../SphereNebulaMaterial';

describe('SphereNebulaMaterial', () => {
  let material: SphereNebulaMaterial;
  let registeredCallback: (() => void) | null = null;
  const mockUnregisterBeforeRender = jest.fn();

  const mockScene = {
    metadata: null as any,
    registerBeforeRender: jest.fn((cb: () => void) => {
      registeredCallback = cb;
    }),
    unregisterBeforeRender: mockUnregisterBeforeRender,
  } as any;

  const mockSphereMesh = {
    material: null as unknown,
    scaling: null as unknown,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    registeredCallback = null;

    // Reset mock material state
    mockGlassMaterial.metallic = 0;
    mockGlassMaterial.roughness = 0;
    mockGlassMaterial.alpha = 0;
    mockGlassMaterial.emissiveColor = null;
    mockGlassMaterial.emissiveIntensity = 0;
    mockGlassMaterial.subSurface.isRefractionEnabled = false;
    mockGlassMaterial.subSurface.refractionIntensity = 0;
    mockGlassMaterial.subSurface.indexOfRefraction = 0;

    mockSphereMesh.material = null;
    mockSphereMesh.scaling = null;
    mockScene.metadata = null;

    // Mock performance.now
    jest.spyOn(performance, 'now').mockReturnValue(0);

    material = new SphereNebulaMaterial('testNebula', mockScene, mockSphereMesh);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor — glass material', () => {
    it('creates a PBR glass material', () => {
      expect(PBRMaterial).toHaveBeenCalledWith('testNebula_glass', mockScene);
    });

    it('sets metallic to 0.0 (glass)', () => {
      expect(mockGlassMaterial.metallic).toBe(0.0);
    });

    it('sets roughness to 0.05 (near-zero)', () => {
      expect(mockGlassMaterial.roughness).toBe(0.05);
    });

    it('sets alpha to 0.92', () => {
      expect(mockGlassMaterial.alpha).toBe(0.92);
    });

    it('enables sub-surface refraction', () => {
      expect(mockGlassMaterial.subSurface.isRefractionEnabled).toBe(true);
    });

    it('sets refraction intensity to 0.95', () => {
      expect(mockGlassMaterial.subSurface.refractionIntensity).toBe(0.95);
    });

    it('sets index of refraction to 1.5 (glass IOR)', () => {
      expect(mockGlassMaterial.subSurface.indexOfRefraction).toBe(1.5);
    });

    it('sets initial emissive color to calm blue', () => {
      expect(mockGlassMaterial.emissiveColor).toBeDefined();
    });

    it('sets initial emissive intensity to 0.8', () => {
      expect(mockGlassMaterial.emissiveIntensity).toBe(0.8);
    });

    it('assigns glass PBR material to outer sphere mesh', () => {
      expect(mockSphereMesh.material).toBe(mockGlassMaterial);
    });
  });

  describe('constructor — inner nebula sphere', () => {
    it('creates an inner sphere with MeshBuilder.CreateSphere', () => {
      expect(MeshBuilder.CreateSphere).toHaveBeenCalledWith(
        'testNebula_innerNebula',
        { diameter: 0.48, segments: 32 },
        mockScene,
      );
    });

    it('inner sphere diameter (0.48) is smaller than outer sphere', () => {
      const createCall = (MeshBuilder.CreateSphere as jest.Mock).mock.calls[0];
      expect(createCall[1].diameter).toBe(0.48);
    });

    it('parents inner sphere to the outer sphere mesh', () => {
      const innerMesh = (material as any).innerSphereMesh;
      expect(innerMesh.parent).toBe(mockSphereMesh);
    });

    it('applies nebula ShaderMaterial to inner sphere', () => {
      const innerMesh = (material as any).innerSphereMesh;
      expect(innerMesh.material).toBe(mockNebulaMaterial);
    });
  });

  describe('constructor — nebula ShaderMaterial', () => {
    it('creates a ShaderMaterial referencing nebulaCorruption shader', () => {
      expect(ShaderMaterial).toHaveBeenCalledWith(
        'testNebula_nebula',
        mockScene,
        { vertex: 'nebulaCorruption', fragment: 'nebulaCorruption' },
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
            'cameraPosition',
            'calmColor',
            'warmColor',
            'violentColor',
          ]),
          needAlphaBlending: true,
        }),
      );
    });

    it('sets initial tension uniform to 0.0', () => {
      expect(mockNebulaMaterialSetFloat).toHaveBeenCalledWith('tension', 0.0);
    });

    it('sets initial time uniform to 0.0', () => {
      expect(mockNebulaMaterialSetFloat).toHaveBeenCalledWith('time', 0.0);
    });

    it('sets initial baseColor uniform', () => {
      expect(mockNebulaMaterialSetColor3).toHaveBeenCalledWith(
        'baseColor',
        expect.objectContaining({ r: 0.1, g: 0.6, b: 1.0 }),
      );
    });

    it('sets initial calmColor uniform', () => {
      expect(mockNebulaMaterialSetColor3).toHaveBeenCalledWith(
        'calmColor',
        expect.objectContaining({ r: 0.1, g: 0.6, b: 1.0 }),
      );
    });

    it('sets initial warmColor uniform', () => {
      expect(mockNebulaMaterialSetColor3).toHaveBeenCalledWith(
        'warmColor',
        expect.objectContaining({ r: 0.6, g: 0.85, b: 0.15 }),
      );
    });

    it('sets initial violentColor uniform', () => {
      expect(mockNebulaMaterialSetColor3).toHaveBeenCalledWith(
        'violentColor',
        expect.objectContaining({ r: 1.0, g: 0.3, b: 0.1 }),
      );
    });

    it('registers a before-render callback', () => {
      expect(mockScene.registerBeforeRender).toHaveBeenCalled();
      expect(registeredCallback).not.toBeNull();
    });
  });

  describe('update loop — glass material', () => {
    it('updates glass material emissive color via Color3.Lerp', () => {
      mockLerp.mockClear();
      registeredCallback!();
      expect(mockLerp).toHaveBeenCalled();
      expect(mockGlassMaterial.emissiveColor).toBeDefined();
    });

    it('updates emissive intensity based on tension', () => {
      material.setTension(0.5);
      registeredCallback!();
      // 0.3 + 0.5 * 0.7 = 0.65
      expect(mockGlassMaterial.emissiveIntensity).toBeCloseTo(0.65, 5);
    });

    it('emissive intensity is 0.3 at zero tension', () => {
      material.setTension(0.0);
      registeredCallback!();
      expect(mockGlassMaterial.emissiveIntensity).toBeCloseTo(0.3, 5);
    });

    it('emissive intensity is ~1.0 at max tension', () => {
      material.setTension(0.999);
      registeredCallback!();
      expect(mockGlassMaterial.emissiveIntensity).toBeCloseTo(0.9993, 3);
    });
  });

  describe('update loop — nebula shader uniforms', () => {
    it('updates tension uniform per frame', () => {
      material.setTension(0.6);
      mockNebulaMaterialSetFloat.mockClear();
      registeredCallback!();
      expect(mockNebulaMaterialSetFloat).toHaveBeenCalledWith('tension', 0.6);
    });

    it('updates time uniform per frame', () => {
      (performance.now as jest.Mock).mockReturnValue(2000);
      mockNebulaMaterialSetFloat.mockClear();
      registeredCallback!();
      // elapsedSeconds = (2000 - 0) / 1000 = 2.0
      expect(mockNebulaMaterialSetFloat).toHaveBeenCalledWith('time', 2.0);
    });

    it('updates corruptionLevel as tension * 0.5', () => {
      material.setTension(0.8);
      mockNebulaMaterialSetFloat.mockClear();
      registeredCallback!();
      expect(mockNebulaMaterialSetFloat).toHaveBeenCalledWith('corruptionLevel', 0.4);
    });

    it('updates color uniforms per frame', () => {
      mockNebulaMaterialSetColor3.mockClear();
      registeredCallback!();
      expect(mockNebulaMaterialSetColor3).toHaveBeenCalledWith(
        'calmColor',
        expect.objectContaining({ r: 0.1, g: 0.6, b: 1.0 }),
      );
      expect(mockNebulaMaterialSetColor3).toHaveBeenCalledWith(
        'warmColor',
        expect.objectContaining({ r: 0.6, g: 0.85, b: 0.15 }),
      );
      expect(mockNebulaMaterialSetColor3).toHaveBeenCalledWith(
        'violentColor',
        expect.objectContaining({ r: 1.0, g: 0.3, b: 0.1 }),
      );
    });
  });

  describe('breathing pulse — handled by vertex shader', () => {
    it('breathing is driven by vertex shader via corruptionLevel uniform', () => {
      // The nebulaCorruption vertex shader applies: sin(time * 1.8) * corruptionLevel * 0.03
      // JS side only needs to set corruptionLevel correctly
      material.setTension(0.8);
      mockNebulaMaterialSetFloat.mockClear();
      registeredCallback!();
      expect(mockNebulaMaterialSetFloat).toHaveBeenCalledWith('corruptionLevel', 0.4);
    });

    it('does NOT modify sphereMesh.scaling (pulse is shader-driven)', () => {
      material.setTension(0.5);
      (performance.now as jest.Mock).mockReturnValue(500);
      mockSphereMesh.scaling = null;
      registeredCallback!();
      // scaling should NOT be set by update (it was removed from JS side)
      expect(mockSphereMesh.scaling).toBeNull();
    });

    it('updates baseColor uniform per frame', () => {
      material.setTension(0.2);
      mockNebulaMaterialSetColor3.mockClear();
      registeredCallback!();
      expect(mockNebulaMaterialSetColor3).toHaveBeenCalledWith(
        'baseColor',
        expect.anything(),
      );
    });
  });

  describe('setTension', () => {
    it('clamps tension at 0.0 minimum', () => {
      material.setTension(-1.0);
      expect((material as any).currentTension).toBe(0.0);
    });

    it('clamps tension at 0.999 maximum', () => {
      material.setTension(5.0);
      expect((material as any).currentTension).toBe(0.999);
    });

    it('stores the tension value', () => {
      material.setTension(0.5);
      expect((material as any).currentTension).toBe(0.5);
    });
  });

  describe('color interpolation (3-stop ramp)', () => {
    it('interpolates calm to warm for tension < 0.45', () => {
      material.setTension(0.2);
      mockLerp.mockClear();
      registeredCallback!();
      expect(mockLerp).toHaveBeenCalledWith(
        expect.objectContaining({ r: 0.1, g: 0.6, b: 1.0 }),
        expect.objectContaining({ r: 0.6, g: 0.85, b: 0.15 }),
        expect.closeTo(0.2 / 0.45, 5),
      );
    });

    it('interpolates warm to violent for tension >= 0.45', () => {
      material.setTension(0.7);
      mockLerp.mockClear();
      registeredCallback!();
      expect(mockLerp).toHaveBeenCalledWith(
        expect.objectContaining({ r: 0.6, g: 0.85, b: 0.15 }),
        expect.objectContaining({ r: 1.0, g: 0.3, b: 0.1 }),
        expect.closeTo((0.7 - 0.45) / 0.55, 5),
      );
    });
  });

  describe('setBreathingPulseEnabled', () => {
    it('disables breathing pulse', () => {
      material.setBreathingPulseEnabled(false);
      expect((material as any).breathingPulseEnabled).toBe(false);
    });

    it('re-enables breathing pulse', () => {
      material.setBreathingPulseEnabled(false);
      material.setBreathingPulseEnabled(true);
      expect((material as any).breathingPulseEnabled).toBe(true);
    });
  });

  describe('dispose', () => {
    it('unregisters the before-render callback', () => {
      material.dispose();
      expect(mockUnregisterBeforeRender).toHaveBeenCalled();
    });

    it('disposes the glass material', () => {
      material.dispose();
      expect(mockGlassMaterialDispose).toHaveBeenCalled();
    });

    it('disposes the nebula material', () => {
      material.dispose();
      expect(mockNebulaMaterialDispose).toHaveBeenCalled();
    });

    it('disposes the inner sphere mesh', () => {
      material.dispose();
      expect(mockInnerSphereDispose).toHaveBeenCalled();
    });

    it('sets innerSphereMesh to null after dispose', () => {
      material.dispose();
      expect((material as any).innerSphereMesh).toBeNull();
    });
  });
});
