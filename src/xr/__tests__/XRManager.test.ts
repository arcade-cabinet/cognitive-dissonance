/**
 * XRManager unit tests
 */

const mockRegisterBeforeRender = jest.fn();
const mockWorldAdd = jest.fn().mockImplementation((entity: any) => entity);
const mockWorldRemove = jest.fn();

jest.mock('@babylonjs/core/scene', () => ({}));
jest.mock('@babylonjs/core/XR/features/WebXRHandTracking', () => ({}));
jest.mock('@babylonjs/core/XR/webXRDefaultExperience', () => ({}));
jest.mock('@babylonjs/core/XR/webXRFeaturesManager', () => ({
  WebXRFeatureName: {
    HAND_TRACKING: 'xr-hand-tracking',
  },
}));

jest.mock('../../ecs/World', () => ({
  world: {
    add: mockWorldAdd,
    remove: mockWorldRemove,
    with: jest.fn().mockReturnValue({ entities: [] }),
  },
  LeftHand: { entities: [] },
  RightHand: { entities: [] },
}));

import { XRManager } from '../XRManager';

function createXRManager(): XRManager {
  (XRManager as any).instance = null;
  return XRManager.getInstance();
}

function createMockHandMesh() {
  return {
    scaling: { length: jest.fn().mockReturnValue(1.0) },
    getChildren: jest.fn().mockReturnValue([
      { name: 'joint-0' },
      { name: 'joint-1' },
    ]),
    getChildMeshes: jest.fn().mockReturnValue([
      { name: 'thumb-tip', position: { subtract: jest.fn().mockReturnValue({ length: jest.fn().mockReturnValue(0.05) }) } },
      { name: 'index-finger-tip', position: { subtract: jest.fn().mockReturnValue({ length: jest.fn().mockReturnValue(0.05) }) } },
    ]),
  };
}

function createMockXRExperience(handTrackingEnabled = true) {
  const mockLeftHandMesh = createMockHandMesh();
  const mockRightHandMesh = createMockHandMesh();

  const mockHandTracking = handTrackingEnabled ? {
    getHandByHandedness: jest.fn().mockImplementation((hand: string) => {
      if (hand === 'left') return { handMesh: mockLeftHandMesh };
      if (hand === 'right') return { handMesh: mockRightHandMesh };
      return null;
    }),
  } : null;

  return {
    baseExperience: {
      featuresManager: {
        getEnabledFeature: jest.fn().mockReturnValue(mockHandTracking),
      },
    },
  };
}

describe('XRManager', () => {
  let manager: XRManager;
  const mockScene = {
    registerBeforeRender: mockRegisterBeforeRender,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = createXRManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = XRManager.getInstance();
      const b = XRManager.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = XRManager.getInstance();
      (XRManager as any).instance = null;
      const b = XRManager.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('init()', () => {
    it('stores scene reference', async () => {
      const xr = createMockXRExperience();
      await manager.init(mockScene, xr as any);
      expect((manager as any).scene).toBe(mockScene);
    });

    it('gets hand tracking feature from XR experience', async () => {
      const xr = createMockXRExperience();
      await manager.init(mockScene, xr as any);
      expect(xr.baseExperience.featuresManager.getEnabledFeature).toHaveBeenCalledWith('xr-hand-tracking');
    });

    it('creates hand entities via world.add when hand tracking is available', async () => {
      const xr = createMockXRExperience(true);
      await manager.init(mockScene, xr as any);
      // Should be called twice: left hand + right hand
      expect(mockWorldAdd).toHaveBeenCalledTimes(2);
    });

    it('creates left hand entity with correct shape', async () => {
      const xr = createMockXRExperience(true);
      await manager.init(mockScene, xr as any);
      expect(mockWorldAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          xrHand: true,
          left: true,
          gripStrength: 0.0,
          pinchStrength: 0.0,
          contactPoints: [],
        }),
      );
    });

    it('creates right hand entity with correct shape', async () => {
      const xr = createMockXRExperience(true);
      await manager.init(mockScene, xr as any);
      expect(mockWorldAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          xrHand: true,
          right: true,
          gripStrength: 0.0,
          pinchStrength: 0.0,
          contactPoints: [],
        }),
      );
    });

    it('registers a before-render update loop', async () => {
      const xr = createMockXRExperience(true);
      await manager.init(mockScene, xr as any);
      expect(mockRegisterBeforeRender).toHaveBeenCalledWith(expect.any(Function));
    });

    it('handles missing hand tracking gracefully', async () => {
      const xr = createMockXRExperience(false);
      await manager.init(mockScene, xr as any);
      expect(mockWorldAdd).not.toHaveBeenCalled();
    });
  });

  describe('getLeftHand() / getRightHand()', () => {
    it('returns null before initialization', () => {
      expect(manager.getLeftHand()).toBeNull();
      expect(manager.getRightHand()).toBeNull();
    });

    it('returns entities after initialization', async () => {
      const xr = createMockXRExperience(true);
      await manager.init(mockScene, xr as any);
      expect(manager.getLeftHand()).not.toBeNull();
      expect(manager.getRightHand()).not.toBeNull();
    });
  });

  describe('dispose()', () => {
    it('removes hand entities from world', async () => {
      const xr = createMockXRExperience(true);
      await manager.init(mockScene, xr as any);
      manager.dispose();
      expect(mockWorldRemove).toHaveBeenCalledTimes(2);
    });

    it('resets all state', async () => {
      const xr = createMockXRExperience(true);
      await manager.init(mockScene, xr as any);
      manager.dispose();
      expect(manager.getLeftHand()).toBeNull();
      expect(manager.getRightHand()).toBeNull();
      expect((manager as any).scene).toBeNull();
      expect((manager as any).handTracking).toBeNull();
      expect((manager as any).updateLoopRegistered).toBe(false);
    });

    it('can be called safely when not initialized', () => {
      expect(() => manager.dispose()).not.toThrow();
    });
  });
});
