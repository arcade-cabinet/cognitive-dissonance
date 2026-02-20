/**
 * ARSessionManager unit tests
 */

const mockWorldWith = jest.fn().mockReturnValue([]);
const mockWorldAdd = jest.fn().mockImplementation((entity: any) => entity);
const mockWorldRemove = jest.fn();

jest.mock('@babylonjs/core/Engines/engine', () => ({}));
jest.mock('@babylonjs/core/scene', () => ({}));

jest.mock('../../ecs/World', () => ({
  world: {
    with: mockWorldWith,
    add: mockWorldAdd,
    remove: mockWorldRemove,
  },
}));

// Mock XR subsystems
const mockXRManagerInit = jest.fn();
const mockXRManagerDispose = jest.fn();
jest.mock('../XRManager', () => ({
  XRManager: {
    getInstance: jest.fn().mockReturnValue({
      init: mockXRManagerInit,
      dispose: mockXRManagerDispose,
    }),
  },
}));

const mockHandActivate = jest.fn();
const mockHandDeactivate = jest.fn();
const mockHandDispose = jest.fn();
jest.mock('../HandInteractionSystem', () => ({
  HandInteractionSystem: {
    getInstance: jest.fn().mockReturnValue({
      activate: mockHandActivate,
      deactivate: mockHandDeactivate,
      dispose: mockHandDispose,
    }),
  },
}));

const mockPhoneActivate = jest.fn();
const mockPhoneDeactivate = jest.fn();
const mockPhoneDispose = jest.fn();
jest.mock('../PhoneProjectionTouchSystem', () => ({
  PhoneProjectionTouchSystem: {
    getInstance: jest.fn().mockReturnValue({
      activate: mockPhoneActivate,
      deactivate: mockPhoneDeactivate,
      dispose: mockPhoneDispose,
    }),
  },
}));

const mockWebXRInit = jest.fn().mockResolvedValue(true);
const mockWebXREnterXR = jest.fn().mockResolvedValue(true);
const mockWebXRExitXR = jest.fn().mockResolvedValue(undefined);
const mockWebXRDispose = jest.fn();
const mockWebXRIsHandTracking = jest.fn().mockReturnValue(false);
const mockWebXRGetExperience = jest.fn().mockReturnValue(null);

jest.mock('../WebXRIntegration', () => ({
  WebXRIntegration: jest.fn().mockImplementation(() => ({
    initialize: mockWebXRInit,
    enterXR: mockWebXREnterXR,
    exitXR: mockWebXRExitXR,
    dispose: mockWebXRDispose,
    isHandTrackingAvailable: mockWebXRIsHandTracking,
    getXRExperience: mockWebXRGetExperience,
  })),
}));

jest.mock('../../native/ARKitIntegration', () => ({
  ARKitIntegration: jest.fn().mockImplementation(() => ({
    startARSession: jest.fn().mockResolvedValue(false), // stub returns false
    stopARSession: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../native/ARCoreIntegration', () => ({
  ARCoreIntegration: jest.fn().mockImplementation(() => ({
    startARSession: jest.fn().mockResolvedValue(false), // stub returns false
    stopARSession: jest.fn().mockResolvedValue(true),
  })),
}));

import { Platform } from 'react-native';
import { ARSessionManager } from '../ARSessionManager';

describe('ARSessionManager', () => {
  let manager: ARSessionManager;
  const mockScene = {} as any;
  const mockEngine = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to web platform
    (Platform as any).OS = 'web';
    // Mock navigator for detectDeviceType
    (global as any).navigator = { userAgent: 'Mozilla/5.0' };
    manager = new ARSessionManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('initialize()', () => {
    it('stores scene and engine', async () => {
      await manager.initialize(mockScene, mockEngine);
      expect((manager as any).scene).toBe(mockScene);
      expect((manager as any).engine).toBe(mockEngine);
    });

    it('detects phone mode on web without XR glasses user agent', async () => {
      await manager.initialize(mockScene, mockEngine);
      expect(manager.getCurrentMode()).toBe('phone');
    });

    it('detects glasses mode when user agent includes "quest"', async () => {
      (global as any).navigator = { userAgent: 'Mozilla/5.0 Quest 3' };
      await manager.initialize(mockScene, mockEngine);
      expect(manager.getCurrentMode()).toBe('glasses');
    });

    it('detects glasses mode when user agent includes "oculus"', async () => {
      (global as any).navigator = { userAgent: 'Mozilla/5.0 Oculus Browser' };
      await manager.initialize(mockScene, mockEngine);
      expect(manager.getCurrentMode()).toBe('glasses');
    });

    it('detects glasses mode when user agent includes "hololens"', async () => {
      (global as any).navigator = { userAgent: 'Mozilla/5.0 HoloLens 2' };
      await manager.initialize(mockScene, mockEngine);
      expect(manager.getCurrentMode()).toBe('glasses');
    });

    it('initializes WebXR on web platform', async () => {
      await manager.initialize(mockScene, mockEngine);
      expect(mockWebXRInit).toHaveBeenCalledWith(mockScene);
    });

    it('handles WebXR initialization failure gracefully', async () => {
      mockWebXRInit.mockResolvedValueOnce(false);
      await manager.initialize(mockScene, mockEngine);
      expect((manager as any).webXR).toBeNull();
    });

    it('initializes XRManager, HandInteraction, and PhoneProjection systems', async () => {
      await manager.initialize(mockScene, mockEngine);
      expect((manager as any).xrManager).toBeDefined();
      expect((manager as any).handInteractionSystem).toBeDefined();
      expect((manager as any).phoneProjectionTouchSystem).toBeDefined();
    });

    it('detects phone mode on iOS platform', async () => {
      (Platform as any).OS = 'ios';
      await manager.initialize(mockScene, mockEngine);
      expect(manager.getCurrentMode()).toBe('phone');
    });

    it('detects phone mode on Android platform', async () => {
      (Platform as any).OS = 'android';
      await manager.initialize(mockScene, mockEngine);
      expect(manager.getCurrentMode()).toBe('phone');
    });
  });

  describe('enterXR()', () => {
    it('returns false when WebXR not initialized', async () => {
      const result = await manager.enterXR();
      expect(result).toBe(false);
    });

    it('calls webXR.enterXR and sets isInXR flag', async () => {
      await manager.initialize(mockScene, mockEngine);
      const result = await manager.enterXR();
      expect(result).toBe(true);
      expect(manager.getIsInXR()).toBe(true);
    });

    it('returns false when enterXR fails', async () => {
      mockWebXREnterXR.mockResolvedValueOnce(false);
      await manager.initialize(mockScene, mockEngine);
      const result = await manager.enterXR();
      expect(result).toBe(false);
      expect(manager.getIsInXR()).toBe(false);
    });
  });

  describe('exitXR()', () => {
    it('does nothing when WebXR not initialized', async () => {
      await manager.exitXR();
      expect(mockWebXRExitXR).not.toHaveBeenCalled();
    });

    it('calls webXR.exitXR and clears isInXR flag', async () => {
      await manager.initialize(mockScene, mockEngine);
      await manager.enterXR();
      await manager.exitXR();
      expect(mockWebXRExitXR).toHaveBeenCalled();
      expect(manager.getIsInXR()).toBe(false);
    });
  });

  describe('switchMode()', () => {
    it('does nothing when switching to same mode', async () => {
      await manager.initialize(mockScene, mockEngine);
      const currentMode = manager.getCurrentMode();
      manager.switchMode(currentMode as 'glasses' | 'phone');
      // No state change
      expect(manager.getCurrentMode()).toBe(currentMode);
    });

    it('switches from phone to glasses mode', async () => {
      await manager.initialize(mockScene, mockEngine);
      expect(manager.getCurrentMode()).toBe('phone');
      manager.switchMode('glasses');
      expect(manager.getCurrentMode()).toBe('glasses');
    });

    it('deactivates input systems on mode switch', async () => {
      await manager.initialize(mockScene, mockEngine);
      manager.switchMode('glasses');
      expect(mockHandDeactivate).toHaveBeenCalled();
      expect(mockPhoneDeactivate).toHaveBeenCalled();
    });
  });

  describe('getCurrentMode()', () => {
    it('returns null before initialization', () => {
      expect(new ARSessionManager().getCurrentMode()).toBeNull();
    });
  });

  describe('getIsInXR()', () => {
    it('returns false initially', () => {
      expect(manager.getIsInXR()).toBe(false);
    });
  });

  describe('isHandTrackingAvailable()', () => {
    it('returns false initially', () => {
      expect(manager.isHandTrackingAvailable()).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('disposes all subsystems', async () => {
      await manager.initialize(mockScene, mockEngine);
      manager.dispose();
      expect(mockWebXRDispose).toHaveBeenCalled();
      expect(mockXRManagerDispose).toHaveBeenCalled();
      expect(mockHandDispose).toHaveBeenCalled();
      expect(mockPhoneDispose).toHaveBeenCalled();
    });

    it('resets all state to null', async () => {
      await manager.initialize(mockScene, mockEngine);
      manager.dispose();
      expect((manager as any).scene).toBeNull();
      expect((manager as any).engine).toBeNull();
      expect((manager as any).currentMode).toBeNull();
      expect((manager as any).isInXR).toBe(false);
      expect((manager as any).handTrackingAvailable).toBe(false);
    });

    it('can be called safely without initialization', () => {
      expect(() => manager.dispose()).not.toThrow();
    });

    it('cleans up AR entities from world', async () => {
      const mockEntities = [{ id: 1 }, { id: 2 }];
      mockWorldWith.mockReturnValue(mockEntities);
      await manager.initialize(mockScene, mockEngine);
      manager.dispose();
      expect(mockWorldRemove).toHaveBeenCalledTimes(mockEntities.length);
    });
  });
});
