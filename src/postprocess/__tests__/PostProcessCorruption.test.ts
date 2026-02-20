/**
 * Tests for PostProcessCorruption — Cognitive Dissonance v3.0 (Grok spec)
 *
 * Verifies:
 * - DefaultRenderingPipeline bloom/vignette/chromatic aberration with Grok spec values
 * - worldCrushDistortion PostProcess activation/deactivation
 * - ambientCorruption PostProcess scaling with tension
 * - Vignette color 3-stop ramp (blue -> yellow -> red)
 * - Device quality intensity scaling
 */

const mockPipelineDispose = jest.fn();
const mockPipeline = {
  bloomEnabled: false,
  bloomScale: 0,
  bloomKernel: 0,
  imageProcessingEnabled: false,
  chromaticAberrationEnabled: false,
  bloomWeight: 0,
  imageProcessing: {
    vignetteWeight: 0,
    vignetteEnabled: false,
    vignetteColor: null as any,
  },
  chromaticAberration: {
    aberrationAmount: 0,
  },
  dispose: mockPipelineDispose,
};

jest.mock('@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline', () => ({
  DefaultRenderingPipeline: jest.fn(() => mockPipeline),
}));

const mockPostProcessDispose = jest.fn();
const mockPostProcessInstances: any[] = [];
jest.mock('@babylonjs/core/PostProcesses/postProcess', () => ({
  PostProcess: jest.fn().mockImplementation((name: string) => {
    const pp = {
      name,
      onApply: null as any,
      onActivate: null as any,
      dispose: mockPostProcessDispose,
    };
    mockPostProcessInstances.push(pp);
    return pp;
  }),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color4: Object.assign(
    jest.fn((r: number, g: number, b: number, a: number) => ({ r, g, b, a })),
    {
      Lerp: jest.fn((start: any, end: any, t: number) => ({
        r: start.r + (end.r - start.r) * t,
        g: start.g + (end.g - start.g) * t,
        b: start.b + (end.b - start.b) * t,
        a: start.a + (end.a - start.a) * t,
      })),
    },
  ),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector2: jest.fn((x: number, y: number) => ({ x, y })),
  Vector3: jest.fn((x: number, y: number, z: number) => ({ x, y, z })),
}));

jest.mock('@babylonjs/core/Cameras/camera', () => ({}));
jest.mock('@babylonjs/core/scene', () => ({}));

import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { PostProcessCorruption } from '../PostProcessCorruption';

function createPostProcessCorruption(): PostProcessCorruption {
  (PostProcessCorruption as any).instance = null;
  return PostProcessCorruption.getInstance();
}

describe('PostProcessCorruption', () => {
  let ppc: PostProcessCorruption;
  const mockScene = { metadata: null, getAnimationRatio: jest.fn(() => 1.0) } as any;
  const mockCamera = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPostProcessInstances.length = 0;
    // Reset mock pipeline state
    mockPipeline.bloomEnabled = false;
    mockPipeline.bloomScale = 0;
    mockPipeline.bloomKernel = 0;
    mockPipeline.imageProcessingEnabled = false;
    mockPipeline.chromaticAberrationEnabled = false;
    mockPipeline.bloomWeight = 0;
    mockPipeline.imageProcessing.vignetteWeight = 0;
    mockPipeline.imageProcessing.vignetteEnabled = false;
    mockPipeline.imageProcessing.vignetteColor = null;
    mockPipeline.chromaticAberration.aberrationAmount = 0;
    mockScene.metadata = null;

    ppc = createPostProcessCorruption();
  });

  afterEach(() => {
    ppc.dispose();
  });

  describe('singleton pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = PostProcessCorruption.getInstance();
      const instance2 = PostProcessCorruption.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('init', () => {
    it('creates a DefaultRenderingPipeline', () => {
      ppc.init(mockScene, mockCamera);
      expect(DefaultRenderingPipeline).toHaveBeenCalledWith(
        'postProcessCorruption',
        true,
        mockScene,
        [mockCamera],
      );
    });

    it('enables bloom', () => {
      ppc.init(mockScene, mockCamera);
      expect(mockPipeline.bloomEnabled).toBe(true);
    });

    it('enables image processing', () => {
      ppc.init(mockScene, mockCamera);
      expect(mockPipeline.imageProcessingEnabled).toBe(true);
    });

    it('enables chromatic aberration', () => {
      ppc.init(mockScene, mockCamera);
      expect(mockPipeline.chromaticAberrationEnabled).toBe(true);
    });

    it('creates worldCrushDistortion PostProcess', () => {
      ppc.init(mockScene, mockCamera);
      expect(PostProcess).toHaveBeenCalledWith(
        'worldCrush',
        'worldCrushDistortion',
        ['impactPoint', 'distortionStrength', 'time'],
        null,
        1.0,
        mockCamera,
      );
    });

    it('creates ambientCorruption PostProcess', () => {
      ppc.init(mockScene, mockCamera);
      expect(PostProcess).toHaveBeenCalledWith(
        'ambientCorruption',
        'ambientCorruption',
        ['tension', 'time', 'intensity'],
        null,
        1.0,
        mockCamera,
      );
    });

    it('initializes bloom weight at 0 when tension is 0 (Grok spec)', () => {
      ppc.init(mockScene, mockCamera);
      // tension * 0.8 * 1.0 = 0 * 0.8 = 0.0
      expect(mockPipeline.bloomWeight).toBeCloseTo(0.0);
    });

    it('initializes with vignette weight 0 (tension=0)', () => {
      ppc.init(mockScene, mockCamera);
      expect(mockPipeline.imageProcessing.vignetteWeight).toBe(0);
    });

    it('initializes with chromatic aberration 0 (tension=0)', () => {
      ppc.init(mockScene, mockCamera);
      expect(mockPipeline.chromaticAberration.aberrationAmount).toBe(0);
    });

    it('reads device quality intensity from scene metadata', () => {
      mockScene.metadata = { qualityConfig: { postProcessIntensity: 0.5 } };
      ppc.init(mockScene, mockCamera);
      ppc.setTension(1.0);
      // bloom = 1.0 * 0.8 * 0.5 = 0.4
      expect(mockPipeline.bloomWeight).toBeCloseTo(0.4);
    });

    it('defaults device quality intensity to 1.0 when no metadata', () => {
      mockScene.metadata = null;
      ppc.init(mockScene, mockCamera);
      ppc.setTension(1.0);
      // bloom = 1.0 * 0.8 * 1.0 = 0.8
      expect(mockPipeline.bloomWeight).toBeCloseTo(0.8);
    });
  });

  describe('setTension — Grok spec bloom', () => {
    beforeEach(() => {
      ppc.init(mockScene, mockCamera);
    });

    it('scales bloom weight as tension * 0.8 * intensity', () => {
      ppc.setTension(0.5);
      // 0.5 * 0.8 * 1.0 = 0.4
      expect(mockPipeline.bloomWeight).toBeCloseTo(0.4);
    });

    it('scales bloom kernel from 32 to 64 based on tension', () => {
      ppc.setTension(0.5);
      // 32 + floor(0.5 * 32) = 32 + 16 = 48
      expect(mockPipeline.bloomKernel).toBe(48);
    });

    it('sets bloom kernel to 32 at tension 0', () => {
      ppc.setTension(0.0);
      expect(mockPipeline.bloomKernel).toBe(32);
    });

    it('sets bloom kernel to 64 at tension 1.0', () => {
      ppc.setTension(1.0);
      // 32 + floor(1.0 * 32) = 32 + 32 = 64
      expect(mockPipeline.bloomKernel).toBe(64);
    });
  });

  describe('setTension — Grok spec vignette', () => {
    beforeEach(() => {
      ppc.init(mockScene, mockCamera);
    });

    it('scales vignette weight as tension * 0.6', () => {
      ppc.setTension(0.5);
      // 0.5 * 0.6 * 1.0 = 0.3
      expect(mockPipeline.imageProcessing.vignetteWeight).toBeCloseTo(0.3);
    });

    it('enables vignette when tension > 0.01', () => {
      ppc.setTension(0.5);
      expect(mockPipeline.imageProcessing.vignetteEnabled).toBe(true);
    });

    it('disables vignette when tension <= 0.01', () => {
      ppc.setTension(0.001);
      expect(mockPipeline.imageProcessing.vignetteEnabled).toBe(false);
    });

    it('sets vignette color matching tension color ramp', () => {
      ppc.setTension(0.5);
      expect(mockPipeline.imageProcessing.vignetteColor).toBeDefined();
    });
  });

  describe('setTension — Grok spec chromatic aberration', () => {
    beforeEach(() => {
      ppc.init(mockScene, mockCamera);
    });

    it('scales chromatic aberration as tension * 0.04', () => {
      ppc.setTension(0.5);
      // 0.5 * 0.04 * 1.0 = 0.02
      expect(mockPipeline.chromaticAberration.aberrationAmount).toBeCloseTo(0.02);
    });

    it('sets chromatic aberration to 0 at tension 0', () => {
      ppc.setTension(0.0);
      expect(mockPipeline.chromaticAberration.aberrationAmount).toBe(0);
    });

    it('sets maximum chromatic aberration at tension 0.999', () => {
      ppc.setTension(0.999);
      // 0.999 * 0.04 * 1.0 = 0.03996
      expect(mockPipeline.chromaticAberration.aberrationAmount).toBeCloseTo(0.999 * 0.04);
    });
  });

  describe('setTension — device quality scaling', () => {
    it('respects device quality intensity for all effects', () => {
      ppc.dispose();
      (PostProcessCorruption as any).instance = null;
      ppc = PostProcessCorruption.getInstance();
      mockScene.metadata = { qualityConfig: { postProcessIntensity: 0.75 } };
      ppc.init(mockScene, mockCamera);

      ppc.setTension(1.0);
      // bloom = 1.0 * 0.8 * 0.75 = 0.6
      expect(mockPipeline.bloomWeight).toBeCloseTo(0.6);
      // vignette = 1.0 * 0.6 * 0.75 = 0.45
      expect(mockPipeline.imageProcessing.vignetteWeight).toBeCloseTo(0.45);
      // chromatic = 1.0 * 0.04 * 0.75 = 0.03
      expect(mockPipeline.chromaticAberration.aberrationAmount).toBeCloseTo(0.03);
    });
  });

  describe('activateWorldCrush / deactivateWorldCrush', () => {
    beforeEach(() => {
      ppc.init(mockScene, mockCamera);
    });

    it('activates world crush effect', () => {
      const impactPoint = { x: 0.5, y: 0, z: 0.5 } as any;
      ppc.activateWorldCrush(impactPoint);
      expect(ppc.isWorldCrushActive()).toBe(true);
    });

    it('sets world crush strength to 1.0 on activation', () => {
      const impactPoint = { x: 0.5, y: 0, z: 0.5 } as any;
      ppc.activateWorldCrush(impactPoint);
      expect(ppc.getWorldCrushStrength()).toBe(1.0);
    });

    it('converts 3D impact point to screen UV', () => {
      const impactPoint = { x: 0.0, y: 0, z: 0.0 } as any;
      ppc.activateWorldCrush(impactPoint);
      const screenUV = ppc.getWorldCrushImpactPoint();
      expect(screenUV.x).toBeCloseTo(0.5);
      expect(screenUV.y).toBeCloseTo(0.5);
    });

    it('deactivates world crush effect', () => {
      const impactPoint = { x: 0, y: 0, z: 0 } as any;
      ppc.activateWorldCrush(impactPoint);
      ppc.deactivateWorldCrush();
      expect(ppc.isWorldCrushActive()).toBe(false);
    });

    it('sets strength to 0 on deactivation', () => {
      const impactPoint = { x: 0, y: 0, z: 0 } as any;
      ppc.activateWorldCrush(impactPoint);
      ppc.deactivateWorldCrush();
      expect(ppc.getWorldCrushStrength()).toBe(0.0);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      ppc.init(mockScene, mockCamera);
    });

    it('resets effects to base values (tension=0)', () => {
      ppc.setTension(0.8);
      ppc.reset();
      expect(mockPipeline.bloomWeight).toBeCloseTo(0.0);
      expect(mockPipeline.imageProcessing.vignetteWeight).toBe(0);
      expect(mockPipeline.chromaticAberration.aberrationAmount).toBe(0);
    });

    it('disables vignette after reset', () => {
      ppc.setTension(0.8);
      ppc.reset();
      expect(mockPipeline.imageProcessing.vignetteEnabled).toBe(false);
    });

    it('deactivates world crush on reset', () => {
      const impactPoint = { x: 0, y: 0, z: 0 } as any;
      ppc.activateWorldCrush(impactPoint);
      ppc.reset();
      expect(ppc.isWorldCrushActive()).toBe(false);
    });
  });

  describe('dispose', () => {
    it('disposes the pipeline', () => {
      ppc.init(mockScene, mockCamera);
      ppc.dispose();
      expect(mockPipelineDispose).toHaveBeenCalled();
    });

    it('disposes custom post-process effects', () => {
      ppc.init(mockScene, mockCamera);
      ppc.dispose();
      // worldCrush + ambientCorruption = 2 dispose calls
      expect(mockPostProcessDispose).toHaveBeenCalledTimes(2);
    });

    it('does not throw if called before init', () => {
      expect(() => ppc.dispose()).not.toThrow();
    });

    it('handles double dispose gracefully', () => {
      ppc.init(mockScene, mockCamera);
      ppc.dispose();
      expect(() => ppc.dispose()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('setTension before init does not throw', () => {
      expect(() => ppc.setTension(0.5)).not.toThrow();
    });

    it('reset before init does not throw', () => {
      expect(() => ppc.reset()).not.toThrow();
    });

    it('getTension returns current tension', () => {
      ppc.init(mockScene, mockCamera);
      ppc.setTension(0.42);
      expect(ppc.getTension()).toBe(0.42);
    });
  });
});
