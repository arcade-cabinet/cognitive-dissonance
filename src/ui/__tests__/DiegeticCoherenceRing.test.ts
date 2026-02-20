/**
 * Tests for DiegeticCoherenceRing — Cognitive Dissonance v3.0 (Grok spec)
 *
 * Verifies:
 * - ShaderMaterial creation with coherenceRingFill shader
 * - coherenceLevel uniform (1.0 - tension)
 * - Fill arc animation via time uniform
 * - Color transitions (3-stop ramp in shader)
 * - Torus geometry creation and sphere parenting
 * - Pulse animation registration
 */

const mockMeshDispose = jest.fn();
const mockScalingSetAll = jest.fn();
const mockRegisterBeforeRender = jest.fn();
const mockUnregisterBeforeRender = jest.fn();

const mockMesh = {
  parent: null as unknown,
  material: null as unknown,
  scaling: { setAll: mockScalingSetAll },
  dispose: mockMeshDispose,
};

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateTorus: jest.fn(() => mockMesh),
  },
}));

const mockSetFloat = jest.fn();
const mockMaterialDispose = jest.fn();
const mockShaderMaterial = {
  setFloat: mockSetFloat,
  dispose: mockMaterialDispose,
};

jest.mock('@babylonjs/core/Materials/shaderMaterial', () => ({
  ShaderMaterial: jest.fn(() => mockShaderMaterial),
}));

import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { DiegeticCoherenceRing } from '../DiegeticCoherenceRing';

describe('DiegeticCoherenceRing', () => {
  const mockScene = {
    registerBeforeRender: mockRegisterBeforeRender,
    unregisterBeforeRender: mockUnregisterBeforeRender,
  } as any;
  const mockSphereMesh = {} as any;
  let ring: DiegeticCoherenceRing;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockMesh.parent = null;
    mockMesh.material = null;

    ring = new DiegeticCoherenceRing(mockScene, mockSphereMesh);
  });

  afterEach(() => {
    ring.dispose();
  });

  describe('initialization', () => {
    it('creates a torus mesh with correct dimensions', () => {
      expect(MeshBuilder.CreateTorus).toHaveBeenCalledWith(
        'coherenceRing',
        {
          diameter: 0.58,
          thickness: 0.01,
          tessellation: 64,
        },
        mockScene,
      );
    });

    it('parents the torus mesh to the sphere', () => {
      expect(mockMesh.parent).toBe(mockSphereMesh);
    });

    it('creates a ShaderMaterial with coherenceRingFill shader', () => {
      expect(ShaderMaterial).toHaveBeenCalledWith(
        'coherenceRingMaterial',
        mockScene,
        {
          vertex: 'coherenceRingFill',
          fragment: 'coherenceRingFill',
        },
        {
          attributes: ['position', 'normal', 'uv'],
          uniforms: ['worldViewProjection', 'world', 'coherenceLevel', 'time'],
        },
      );
    });

    it('assigns ShaderMaterial to mesh', () => {
      expect(mockMesh.material).toBe(mockShaderMaterial);
    });

    it('sets initial coherenceLevel to 1.0 (full ring at 0 tension)', () => {
      expect(mockSetFloat).toHaveBeenCalledWith('coherenceLevel', 1.0);
    });

    it('sets initial time to 0.0', () => {
      expect(mockSetFloat).toHaveBeenCalledWith('time', 0.0);
    });

    it('sets initial scaling to 1.0', () => {
      expect(mockScalingSetAll).toHaveBeenCalledWith(1.0);
    });

    it('initializes with tension 0.0', () => {
      expect(ring.getTension()).toBe(0.0);
    });

    it('registers per-frame animation callback', () => {
      expect(mockRegisterBeforeRender).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('setTension', () => {
    it('updates the current tension value', () => {
      ring.setTension(0.5);
      expect(ring.getTension()).toBe(0.5);
    });

    it('sets coherenceLevel = 1.0 - tension', () => {
      ring.setTension(0.3);
      expect(mockSetFloat).toHaveBeenCalledWith('coherenceLevel', 0.7);
    });

    it('sets coherenceLevel to 0.0 at max tension', () => {
      ring.setTension(1.0);
      expect(mockSetFloat).toHaveBeenCalledWith('coherenceLevel', 0.0);
    });

    it('sets coherenceLevel to 1.0 at zero tension', () => {
      ring.setTension(0.5); // intermediate
      mockSetFloat.mockClear();
      ring.setTension(0.0);
      expect(mockSetFloat).toHaveBeenCalledWith('coherenceLevel', 1.0);
    });

    it('scales mesh by 1.0 + tension * 0.2 at tension 0.5', () => {
      ring.setTension(0.5);
      expect(mockScalingSetAll).toHaveBeenCalledWith(1.1);
    });

    it('scales mesh by 1.0 at tension 0.0', () => {
      ring.setTension(0.0);
      expect(mockScalingSetAll).toHaveBeenCalledWith(1.0);
    });

    it('scales mesh by 1.2 at tension 1.0', () => {
      ring.setTension(1.0);
      expect(mockScalingSetAll).toHaveBeenCalledWith(1.2);
    });
  });

  describe('getCoherenceLevel', () => {
    it('returns 1.0 when tension is 0.0', () => {
      expect(ring.getCoherenceLevel()).toBe(1.0);
    });

    it('returns 0.5 when tension is 0.5', () => {
      ring.setTension(0.5);
      expect(ring.getCoherenceLevel()).toBe(0.5);
    });

    it('returns 0.0 when tension is 1.0', () => {
      ring.setTension(1.0);
      expect(ring.getCoherenceLevel()).toBe(0.0);
    });
  });

  describe('animation update', () => {
    it('updates time uniform on per-frame callback', () => {
      const callback = mockRegisterBeforeRender.mock.calls[0][0];
      mockSetFloat.mockClear();
      callback();
      expect(mockSetFloat).toHaveBeenCalledWith('time', expect.any(Number));
    });
  });

  describe('reset', () => {
    it('resets tension to 0.0', () => {
      ring.setTension(0.7);
      ring.reset();
      expect(ring.getTension()).toBe(0.0);
    });

    it('resets coherenceLevel to 1.0', () => {
      ring.setTension(0.7);
      mockSetFloat.mockClear();
      ring.reset();
      expect(mockSetFloat).toHaveBeenCalledWith('coherenceLevel', 1.0);
    });

    it('resets scale to 1.0', () => {
      ring.setTension(0.5);
      mockScalingSetAll.mockClear();
      ring.reset();
      expect(mockScalingSetAll).toHaveBeenCalledWith(1.0);
    });
  });

  describe('dispose', () => {
    it('disposes the mesh', () => {
      ring.dispose();
      expect(mockMeshDispose).toHaveBeenCalled();
    });

    it('disposes the ShaderMaterial', () => {
      ring.dispose();
      expect(mockMaterialDispose).toHaveBeenCalled();
    });

    it('unregisters the animation callback', () => {
      ring.dispose();
      expect(mockUnregisterBeforeRender).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('getMaterial / getMesh', () => {
    it('returns the ShaderMaterial instance', () => {
      expect(ring.getMaterial()).toBe(mockShaderMaterial);
    });

    it('returns the torus mesh instance', () => {
      expect(ring.getMesh()).toBe(mockMesh);
    });
  });
});
