/**
 * WebXRIntegration unit tests
 */

const mockEnterXRAsync = jest.fn().mockResolvedValue(undefined);
const mockExitXRAsync = jest.fn().mockResolvedValue(undefined);
const mockDispose = jest.fn();
const mockOnStateChangedAdd = jest.fn();
const mockGetEnabledFeature = jest.fn().mockReturnValue(null);

jest.mock('@babylonjs/core/scene', () => ({}));
jest.mock('@babylonjs/core/XR/webXRCamera', () => ({}));
jest.mock('@babylonjs/core/XR/webXRDefaultExperience', () => ({}));
jest.mock('@babylonjs/core/XR/webXRSessionManager', () => ({}));

import { WebXRIntegration } from '../WebXRIntegration';

function createMockScene(xrResult: any = null) {
  return {
    createDefaultXRExperienceAsync: jest.fn().mockResolvedValue(xrResult),
  } as any;
}

function createMockXRExperience() {
  return {
    baseExperience: {
      camera: { name: 'xrCamera' },
      sessionManager: { session: {} },
      onStateChangedObservable: { add: mockOnStateChangedAdd },
      enterXRAsync: mockEnterXRAsync,
      exitXRAsync: mockExitXRAsync,
      dispose: mockDispose,
      featuresManager: {
        getEnabledFeature: mockGetEnabledFeature,
      },
    },
  };
}

describe('WebXRIntegration', () => {
  let integration: WebXRIntegration;

  beforeEach(() => {
    jest.clearAllMocks();
    integration = new WebXRIntegration();
  });

  afterEach(() => {
    integration.dispose();
  });

  describe('initialize()', () => {
    it('creates WebXR experience with immersive-ar mode', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      const result = await integration.initialize(mockScene);
      expect(result).toBe(true);
      expect(mockScene.createDefaultXRExperienceAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          uiOptions: { sessionMode: 'immersive-ar' },
          optionalFeatures: ['hit-test', 'hand-tracking', 'depth-sensing'],
        }),
      );
    });

    it('returns false when WebXR experience creation fails (returns null)', async () => {
      const mockScene = createMockScene(null);
      const result = await integration.initialize(mockScene);
      expect(result).toBe(false);
    });

    it('returns false when createDefaultXRExperienceAsync throws', async () => {
      const mockScene = {
        createDefaultXRExperienceAsync: jest.fn().mockRejectedValue(new Error('XR not supported')),
      } as any;
      const result = await integration.initialize(mockScene);
      expect(result).toBe(false);
    });

    it('stores XR camera after successful init', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      expect(integration.getXRCamera()).toEqual({ name: 'xrCamera' });
    });

    it('stores session manager after successful init', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      expect(integration.getSessionManager()).toBeDefined();
    });

    it('registers state change observable', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      expect(mockOnStateChangedAdd).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('enterXR()', () => {
    it('returns false when not initialized', async () => {
      const result = await integration.enterXR();
      expect(result).toBe(false);
    });

    it('calls enterXRAsync with immersive-ar and local-floor', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      const result = await integration.enterXR();
      expect(result).toBe(true);
      expect(mockEnterXRAsync).toHaveBeenCalledWith('immersive-ar', 'local-floor');
    });

    it('returns false when enterXRAsync throws', async () => {
      const mockXR = createMockXRExperience();
      mockXR.baseExperience.enterXRAsync = jest.fn().mockRejectedValue(new Error('Failed'));
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      const result = await integration.enterXR();
      expect(result).toBe(false);
    });
  });

  describe('exitXR()', () => {
    it('does nothing when not initialized', async () => {
      await integration.exitXR();
      expect(mockExitXRAsync).not.toHaveBeenCalled();
    });

    it('calls exitXRAsync when initialized', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      await integration.exitXR();
      expect(mockExitXRAsync).toHaveBeenCalled();
    });

    it('does not throw when exitXRAsync fails', async () => {
      const mockXR = createMockXRExperience();
      mockXR.baseExperience.exitXRAsync = jest.fn().mockRejectedValue(new Error('exit fail'));
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      await expect(integration.exitXR()).resolves.not.toThrow();
    });
  });

  describe('getIsInXR()', () => {
    it('returns false initially', () => {
      expect(integration.getIsInXR()).toBe(false);
    });
  });

  describe('getXRExperience()', () => {
    it('returns null before initialization', () => {
      expect(integration.getXRExperience()).toBeNull();
    });

    it('returns the XR experience after initialization', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      expect(integration.getXRExperience()).toBe(mockXR);
    });
  });

  describe('isHandTrackingAvailable()', () => {
    it('returns false when not initialized', () => {
      expect(integration.isHandTrackingAvailable()).toBe(false);
    });

    it('returns false when hand tracking feature is not enabled', async () => {
      mockGetEnabledFeature.mockReturnValue(null);
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      expect(integration.isHandTrackingAvailable()).toBe(false);
    });

    it('returns true when hand tracking feature is enabled', async () => {
      mockGetEnabledFeature.mockReturnValue({ enabled: true });
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      expect(integration.isHandTrackingAvailable()).toBe(true);
    });
  });

  describe('isDepthSensingAvailable()', () => {
    it('returns false when not initialized', () => {
      expect(integration.isDepthSensingAvailable()).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('disposes the base experience', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      integration.dispose();
      expect(mockDispose).toHaveBeenCalled();
    });

    it('resets all state', async () => {
      const mockXR = createMockXRExperience();
      const mockScene = createMockScene(mockXR);
      await integration.initialize(mockScene);
      integration.dispose();
      expect(integration.getXRCamera()).toBeNull();
      expect(integration.getSessionManager()).toBeNull();
      expect(integration.getIsInXR()).toBe(false);
      expect(integration.getXRExperience()).toBeNull();
    });

    it('can be called safely when not initialized', () => {
      expect(() => integration.dispose()).not.toThrow();
    });
  });
});
