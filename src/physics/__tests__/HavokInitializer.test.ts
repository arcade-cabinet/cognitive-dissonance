/**
 * HavokInitializer unit tests
 */

// Mock @babylonjs/core subpath imports
jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: jest.fn().mockImplementation((x: number, y: number, z: number) => ({ x, y, z })),
}));

jest.mock('@babylonjs/core/Physics/v2/Plugins/havokPlugin', () => ({
  HavokPlugin: jest.fn().mockImplementation(() => ({ dispose: jest.fn() })),
}));

jest.mock('@babylonjs/havok', () => {
  return jest.fn().mockResolvedValue({ /* mock havok WASM instance */ });
});

jest.mock('../../utils/PlatformConfig', () => ({
  isWeb: true,
}));

import { HavokInitializer } from '../HavokInitializer';

function createHavokInitializer(): HavokInitializer {
  (HavokInitializer as any).instance = null;
  return HavokInitializer.getInstance();
}

describe('HavokInitializer', () => {
  let initializer: HavokInitializer;

  const mockScene = {
    enablePhysics: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    initializer = createHavokInitializer();
  });

  afterEach(() => {
    initializer.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = HavokInitializer.getInstance();
      const b = HavokInitializer.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = HavokInitializer.getInstance();
      (HavokInitializer as any).instance = null;
      const b = HavokInitializer.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('initialize()', () => {
    it('loads Havok WASM and enables physics on scene', async () => {
      await initializer.initialize(mockScene);
      expect(mockScene.enablePhysics).toHaveBeenCalledTimes(1);
      expect(initializer.isReady()).toBe(true);
    });

    it('passes locateFile option on web platform', async () => {
      const HavokPhysics = require('@babylonjs/havok');
      await initializer.initialize(mockScene);
      expect(HavokPhysics).toHaveBeenCalledWith(
        expect.objectContaining({ locateFile: expect.any(Function) }),
      );
    });

    it('creates HavokPlugin with the WASM instance', async () => {
      const { HavokPlugin } = require('@babylonjs/core/Physics/v2/Plugins/havokPlugin');
      await initializer.initialize(mockScene);
      expect(HavokPlugin).toHaveBeenCalledWith(true, expect.anything());
    });

    it('sets gravity to Vector3(0, -9.81, 0)', async () => {
      const { Vector3 } = require('@babylonjs/core/Maths/math.vector');
      await initializer.initialize(mockScene);
      expect(Vector3).toHaveBeenCalledWith(0, -9.81, 0);
    });

    it('skips initialization if already initialized', async () => {
      await initializer.initialize(mockScene);
      await initializer.initialize(mockScene);
      // enablePhysics should only be called once
      expect(mockScene.enablePhysics).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPlugin()', () => {
    it('returns null before initialization', () => {
      expect(initializer.getPlugin()).toBeNull();
    });

    it('returns the HavokPlugin after initialization', async () => {
      await initializer.initialize(mockScene);
      expect(initializer.getPlugin()).not.toBeNull();
    });
  });

  describe('isReady()', () => {
    it('returns false before initialization', () => {
      expect(initializer.isReady()).toBe(false);
    });

    it('returns true after initialization', async () => {
      await initializer.initialize(mockScene);
      expect(initializer.isReady()).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('resets the plugin to null', async () => {
      await initializer.initialize(mockScene);
      initializer.dispose();
      expect(initializer.getPlugin()).toBeNull();
    });

    it('resets isInitialized to false', async () => {
      await initializer.initialize(mockScene);
      initializer.dispose();
      expect(initializer.isReady()).toBe(false);
    });

    it('allows re-initialization after dispose', async () => {
      await initializer.initialize(mockScene);
      initializer.dispose();
      await initializer.initialize(mockScene);
      expect(initializer.isReady()).toBe(true);
      expect(mockScene.enablePhysics).toHaveBeenCalledTimes(2);
    });
  });
});
