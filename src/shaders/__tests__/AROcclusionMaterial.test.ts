/**
 * Tests for AROcclusionMaterial — Cognitive Dissonance v3.0
 *
 * Verifies PBR base material setup, AR occlusion shader creation,
 * environment-depth handling, stencil fallback, crystalline variant, and disposal.
 */

const mockBaseMaterialDispose = jest.fn();
const mockOcclusionSetTexture = jest.fn();
const mockOcclusionSetFloat = jest.fn();
const mockOcclusionSetColor3 = jest.fn();
const mockOcclusionMaterialDispose = jest.fn();
const mockDepthRendererDispose = jest.fn();

let baseMaterialInstance: any;
let occlusionMaterialInstance: any;

jest.mock('@babylonjs/core/Materials/PBR/pbrMaterial', () => ({
  PBRMaterial: jest.fn(() => {
    baseMaterialInstance = {
      albedoColor: null,
      alpha: 1.0,
      metallic: 0,
      roughness: 0,
      needDepthPrePass: false,
      dispose: mockBaseMaterialDispose,
    };
    return baseMaterialInstance;
  }),
}));

jest.mock('@babylonjs/core/Materials/shaderMaterial', () => ({
  ShaderMaterial: jest.fn(() => {
    occlusionMaterialInstance = {
      setTexture: mockOcclusionSetTexture,
      setFloat: mockOcclusionSetFloat,
      setColor3: mockOcclusionSetColor3,
      dispose: mockOcclusionMaterialDispose,
    };
    return occlusionMaterialInstance;
  }),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
}));

jest.mock('@babylonjs/core/Materials/Textures/texture', () => ({}));
jest.mock('@babylonjs/core/Meshes/mesh', () => ({}));
jest.mock('@babylonjs/core/Rendering/depthRenderer', () => ({}));
jest.mock('@babylonjs/core/scene', () => ({}));
jest.mock('@babylonjs/core/XR/webXRCamera', () => ({}));

import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { AROcclusionMaterial } from '../AROcclusionMaterial';

describe('AROcclusionMaterial', () => {
  const mockDepthRenderer = { dispose: mockDepthRendererDispose };
  const mockScene = {
    activeCamera: {},
    enableDepthRenderer: jest.fn(() => mockDepthRenderer),
  } as any;
  const mockMesh = {
    name: 'testMesh',
    material: null as unknown,
  } as any;
  const mockDepthTexture = {} as any;
  const mockXRCamera = {} as any;

  let mat: AROcclusionMaterial;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMesh.material = null;
    baseMaterialInstance = null;
    occlusionMaterialInstance = null;
  });

  describe('constructor (default options)', () => {
    beforeEach(() => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
    });

    it('creates a PBR base material', () => {
      expect(PBRMaterial).toHaveBeenCalledWith('testAR_base', mockScene);
    });

    it('sets default base color to (0.8, 0.8, 0.8)', () => {
      expect(baseMaterialInstance.albedoColor).toEqual(
        expect.objectContaining({ r: 0.8, g: 0.8, b: 0.8 }),
      );
    });

    it('sets default alpha to 1.0', () => {
      expect(baseMaterialInstance.alpha).toBe(1.0);
    });

    it('sets metallic to 0.5 (non-crystalline)', () => {
      expect(baseMaterialInstance.metallic).toBe(0.5);
    });

    it('sets roughness to 0.4 (non-crystalline)', () => {
      expect(baseMaterialInstance.roughness).toBe(0.4);
    });

    it('assigns base material to mesh initially', () => {
      expect(mockMesh.material).toBe(baseMaterialInstance);
    });
  });

  describe('constructor (crystalline options)', () => {
    beforeEach(() => {
      mat = new AROcclusionMaterial('crystalAR', mockScene, mockMesh, {
        crystalline: true,
        baseColor: { r: 1, g: 0, b: 0 } as any,
        alpha: 0.8,
        crystallineColor: { r: 0, g: 1, b: 0 } as any,
      });
    });

    it('sets metallic to 0.8 for crystalline variant', () => {
      expect(baseMaterialInstance.metallic).toBe(0.8);
    });

    it('sets roughness to 0.1 for crystalline variant', () => {
      expect(baseMaterialInstance.roughness).toBe(0.1);
    });

    it('uses custom base color', () => {
      expect(baseMaterialInstance.albedoColor).toEqual(
        expect.objectContaining({ r: 1, g: 0, b: 0 }),
      );
    });

    it('uses custom alpha', () => {
      expect(baseMaterialInstance.alpha).toBe(0.8);
    });
  });

  describe('enableEnvironmentDepth', () => {
    beforeEach(() => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
      mat.enableEnvironmentDepth(mockDepthTexture, mockXRCamera);
    });

    it('creates a ShaderMaterial for occlusion', () => {
      expect(ShaderMaterial).toHaveBeenCalledWith(
        'testMesh_occlusion',
        mockScene,
        { vertex: 'arOcclusion', fragment: 'arOcclusion' },
        expect.objectContaining({
          attributes: ['position', 'normal', 'uv'],
          uniforms: expect.arrayContaining([
            'worldViewProjection',
            'environmentDepthTexture',
            'hasEnvironmentDepth',
            'depthThreshold',
            'baseColor',
            'alpha',
            'isCrystalline',
            'crystallineColor',
          ]),
        }),
      );
    });

    it('sets environment depth texture', () => {
      expect(mockOcclusionSetTexture).toHaveBeenCalledWith(
        'environmentDepthTexture',
        mockDepthTexture,
      );
    });

    it('sets hasEnvironmentDepth to 1.0', () => {
      expect(mockOcclusionSetFloat).toHaveBeenCalledWith('hasEnvironmentDepth', 1.0);
    });

    it('sets depthThreshold to 0.01', () => {
      expect(mockOcclusionSetFloat).toHaveBeenCalledWith('depthThreshold', 0.01);
    });

    it('sets isCrystalline to 0.0 for non-crystalline', () => {
      expect(mockOcclusionSetFloat).toHaveBeenCalledWith('isCrystalline', 0.0);
    });

    it('applies occlusion material to mesh', () => {
      expect(mockMesh.material).toBe(occlusionMaterialInstance);
    });

    it('sets isCrystalline to 1.0 for crystalline variant', () => {
      jest.clearAllMocks();
      const crystalMat = new AROcclusionMaterial('crystAR', mockScene, mockMesh, {
        crystalline: true,
      });
      crystalMat.enableEnvironmentDepth(mockDepthTexture, mockXRCamera);
      expect(mockOcclusionSetFloat).toHaveBeenCalledWith('isCrystalline', 1.0);
      crystalMat.dispose();
    });
  });

  describe('enableStencilFallback', () => {
    beforeEach(() => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
      mat.enableStencilFallback();
    });

    it('creates a depth renderer', () => {
      expect(mockScene.enableDepthRenderer).toHaveBeenCalledWith(mockScene.activeCamera);
    });

    it('enables needDepthPrePass on base material', () => {
      expect(baseMaterialInstance.needDepthPrePass).toBe(true);
    });

    it('assigns base material with stencil to mesh', () => {
      expect(mockMesh.material).toBe(baseMaterialInstance);
    });

    it('does not create multiple depth renderers on repeated calls', () => {
      mat.enableStencilFallback(); // Second call
      // enableDepthRenderer should only be called once
      expect(mockScene.enableDepthRenderer).toHaveBeenCalledTimes(1);
    });
  });

  describe('disableOcclusion', () => {
    beforeEach(() => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
    });

    it('reverts to base material', () => {
      mat.enableEnvironmentDepth(mockDepthTexture, mockXRCamera);
      mat.disableOcclusion();
      expect(mockMesh.material).toBe(baseMaterialInstance);
    });

    it('disposes occlusion material', () => {
      mat.enableEnvironmentDepth(mockDepthTexture, mockXRCamera);
      mat.disableOcclusion();
      expect(mockOcclusionMaterialDispose).toHaveBeenCalled();
    });

    it('does not throw if no occlusion material exists', () => {
      expect(() => mat.disableOcclusion()).not.toThrow();
    });
  });

  describe('updateProperties', () => {
    beforeEach(() => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
    });

    it('updates base color on base material', () => {
      const newColor = { r: 0.5, g: 0.5, b: 0.5 } as any;
      mat.updateProperties({ baseColor: newColor });
      expect(baseMaterialInstance.albedoColor).toBe(newColor);
    });

    it('updates alpha on base material', () => {
      mat.updateProperties({ alpha: 0.7 });
      expect(baseMaterialInstance.alpha).toBe(0.7);
    });

    it('updates base color on occlusion material if active', () => {
      mat.enableEnvironmentDepth(mockDepthTexture, mockXRCamera);
      jest.clearAllMocks();
      const newColor = { r: 0.2, g: 0.3, b: 0.4 } as any;
      mat.updateProperties({ baseColor: newColor });
      expect(mockOcclusionSetColor3).toHaveBeenCalledWith('baseColor', newColor);
    });

    it('updates alpha on occlusion material if active', () => {
      mat.enableEnvironmentDepth(mockDepthTexture, mockXRCamera);
      jest.clearAllMocks();
      mat.updateProperties({ alpha: 0.6 });
      expect(mockOcclusionSetFloat).toHaveBeenCalledWith('alpha', 0.6);
    });
  });

  describe('dispose', () => {
    it('disposes base material', () => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
      mat.dispose();
      expect(mockBaseMaterialDispose).toHaveBeenCalled();
    });

    it('disposes occlusion material if present', () => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
      mat.enableEnvironmentDepth(mockDepthTexture, mockXRCamera);
      mat.dispose();
      expect(mockOcclusionMaterialDispose).toHaveBeenCalled();
    });

    it('disposes depth renderer if present', () => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
      mat.enableStencilFallback();
      mat.dispose();
      expect(mockDepthRendererDispose).toHaveBeenCalled();
    });

    it('does not throw if no occlusion or depth renderer', () => {
      mat = new AROcclusionMaterial('testAR', mockScene, mockMesh);
      expect(() => mat.dispose()).not.toThrow();
    });
  });
});
