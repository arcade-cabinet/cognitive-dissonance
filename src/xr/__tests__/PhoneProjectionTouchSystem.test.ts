/**
 * PhoneProjectionTouchSystem unit tests
 */

jest.mock('@babylonjs/core/Events/pointerEvents', () => ({
  PointerEventTypes: {
    POINTERDOWN: 1,
    POINTERMOVE: 4,
    POINTERUP: 2,
  },
}));

jest.mock('@babylonjs/core/scene', () => ({}));
jest.mock('@babylonjs/core/XR/webXRDefaultExperience', () => ({}));

import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { PhoneProjectionTouchSystem } from '../PhoneProjectionTouchSystem';

function createPhoneProjectionTouchSystem(): PhoneProjectionTouchSystem {
  (PhoneProjectionTouchSystem as any).instance = null;
  return PhoneProjectionTouchSystem.getInstance();
}

describe('PhoneProjectionTouchSystem', () => {
  let system: PhoneProjectionTouchSystem;
  let mockOnPointerObservable: { add: jest.Mock; removeCallback: jest.Mock };
  let mockScene: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnPointerObservable = {
      add: jest.fn(),
      removeCallback: jest.fn(),
    };
    mockScene = {
      onPointerObservable: mockOnPointerObservable,
    };
    system = createPhoneProjectionTouchSystem();
  });

  afterEach(() => {
    system.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = PhoneProjectionTouchSystem.getInstance();
      const b = PhoneProjectionTouchSystem.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = PhoneProjectionTouchSystem.getInstance();
      (PhoneProjectionTouchSystem as any).instance = null;
      const b = PhoneProjectionTouchSystem.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('activate()', () => {
    it('registers pointer observer on the scene', () => {
      system.activate(mockScene);
      expect(mockOnPointerObservable.add).toHaveBeenCalledWith(expect.any(Function));
    });

    it('marks system as active', () => {
      system.activate(mockScene);
      expect((system as any).isActive).toBe(true);
    });

    it('stores scene reference', () => {
      system.activate(mockScene);
      expect((system as any).scene).toBe(mockScene);
    });

    it('stores xr experience if provided', () => {
      const mockXR = {} as any;
      system.activate(mockScene, mockXR);
      expect((system as any).xr).toBe(mockXR);
    });

    it('does not register twice if already active', () => {
      system.activate(mockScene);
      system.activate(mockScene);
      expect(mockOnPointerObservable.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('deactivate()', () => {
    it('removes pointer observer callback', () => {
      system.activate(mockScene);
      system.deactivate();
      expect(mockOnPointerObservable.removeCallback).toHaveBeenCalledWith(expect.any(Function));
    });

    it('clears scene and xr references', () => {
      system.activate(mockScene);
      system.deactivate();
      expect((system as any).scene).toBeNull();
      expect((system as any).xr).toBeNull();
      expect((system as any).isActive).toBe(false);
    });

    it('does nothing when not active', () => {
      system.deactivate();
      expect(mockOnPointerObservable.removeCallback).not.toHaveBeenCalled();
    });
  });

  describe('Callback registration', () => {
    it('setKeycapTouchCallback stores callback', () => {
      const cb = jest.fn();
      system.setKeycapTouchCallback(cb);
      expect((system as any).onKeycapTouch).toBe(cb);
    });

    it('setLeverTouchCallback stores callback', () => {
      const cb = jest.fn();
      system.setLeverTouchCallback(cb);
      expect((system as any).onLeverTouch).toBe(cb);
    });

    it('setRimTouchCallback stores callback', () => {
      const cb = jest.fn();
      system.setRimTouchCallback(cb);
      expect((system as any).onRimTouch).toBe(cb);
    });
  });

  describe('handlePointerEvent', () => {
    function getHandler(): (pointerInfo: any) => void {
      system.activate(mockScene);
      return mockOnPointerObservable.add.mock.calls[0][0];
    }

    it('routes keycap touch to callback', () => {
      const keycapCb = jest.fn();
      system.setKeycapTouchCallback(keycapCb);
      const handler = getHandler();

      handler({
        type: PointerEventTypes.POINTERDOWN,
        pickInfo: {
          hit: true,
          pickedMesh: { name: 'keycap-A' },
          pickedPoint: { x: 0, y: 0, z: 0 },
          distance: 1.0,
        },
      });

      expect(keycapCb).toHaveBeenCalledWith('A');
    });

    it('routes lever touch to callback', () => {
      const leverCb = jest.fn();
      system.setLeverTouchCallback(leverCb);
      const handler = getHandler();

      handler({
        type: PointerEventTypes.POINTERDOWN,
        pickInfo: {
          hit: true,
          pickedMesh: { name: 'lever-main' },
          pickedPoint: { x: 1, y: 2, z: 3 },
          distance: 2.5,
        },
      });

      expect(leverCb).toHaveBeenCalledWith(2.5);
    });

    it('routes rim touch to callback', () => {
      const rimCb = jest.fn();
      system.setRimTouchCallback(rimCb);
      const handler = getHandler();

      handler({
        type: PointerEventTypes.POINTERDOWN,
        pickInfo: {
          hit: true,
          pickedMesh: { name: 'platter-rim' },
          pickedPoint: { x: 3.14, y: 0, z: 0 },
        },
      });

      expect(rimCb).toHaveBeenCalledWith(3.14);
    });

    it('routes platter touch to rim callback', () => {
      const rimCb = jest.fn();
      system.setRimTouchCallback(rimCb);
      const handler = getHandler();

      handler({
        type: PointerEventTypes.POINTERDOWN,
        pickInfo: {
          hit: true,
          pickedMesh: { name: 'platter-body' },
          pickedPoint: { x: 1.0, y: 0, z: 0 },
        },
      });

      expect(rimCb).toHaveBeenCalledWith(1.0);
    });

    it('handles POINTERMOVE events', () => {
      const keycapCb = jest.fn();
      system.setKeycapTouchCallback(keycapCb);
      const handler = getHandler();

      handler({
        type: PointerEventTypes.POINTERMOVE,
        pickInfo: {
          hit: true,
          pickedMesh: { name: 'keycap-B' },
          pickedPoint: { x: 0, y: 0, z: 0 },
        },
      });

      expect(keycapCb).toHaveBeenCalledWith('B');
    });

    it('ignores POINTERUP events', () => {
      const keycapCb = jest.fn();
      system.setKeycapTouchCallback(keycapCb);
      const handler = getHandler();

      handler({
        type: PointerEventTypes.POINTERUP,
        pickInfo: {
          hit: true,
          pickedMesh: { name: 'keycap-A' },
        },
      });

      expect(keycapCb).not.toHaveBeenCalled();
    });

    it('ignores events with no pickInfo', () => {
      const keycapCb = jest.fn();
      system.setKeycapTouchCallback(keycapCb);
      const handler = getHandler();

      handler({ type: PointerEventTypes.POINTERDOWN, pickInfo: null });
      expect(keycapCb).not.toHaveBeenCalled();
    });

    it('ignores events with no hit', () => {
      const keycapCb = jest.fn();
      system.setKeycapTouchCallback(keycapCb);
      const handler = getHandler();

      handler({
        type: PointerEventTypes.POINTERDOWN,
        pickInfo: { hit: false, pickedMesh: null },
      });

      expect(keycapCb).not.toHaveBeenCalled();
    });

    it('does not call callback if callback is not set', () => {
      const handler = getHandler();
      // No callbacks set
      expect(() => {
        handler({
          type: PointerEventTypes.POINTERDOWN,
          pickInfo: {
            hit: true,
            pickedMesh: { name: 'keycap-A' },
            pickedPoint: { x: 0, y: 0, z: 0 },
          },
        });
      }).not.toThrow();
    });

    it('extracts uppercase letter from keycap name', () => {
      const keycapCb = jest.fn();
      system.setKeycapTouchCallback(keycapCb);
      const handler = getHandler();

      handler({
        type: PointerEventTypes.POINTERDOWN,
        pickInfo: {
          hit: true,
          pickedMesh: { name: 'keycap-q' },
          pickedPoint: { x: 0, y: 0, z: 0 },
        },
      });

      expect(keycapCb).toHaveBeenCalledWith('Q');
    });
  });

  describe('reset()', () => {
    it('does not throw', () => {
      expect(() => system.reset()).not.toThrow();
    });
  });

  describe('dispose()', () => {
    it('deactivates the system', () => {
      system.activate(mockScene);
      system.dispose();
      expect((system as any).isActive).toBe(false);
    });

    it('clears all callbacks', () => {
      system.setKeycapTouchCallback(jest.fn());
      system.setLeverTouchCallback(jest.fn());
      system.setRimTouchCallback(jest.fn());
      system.dispose();
      expect((system as any).onKeycapTouch).toBeNull();
      expect((system as any).onLeverTouch).toBeNull();
      expect((system as any).onRimTouch).toBeNull();
    });

    it('can be called safely when not initialized', () => {
      expect(() => system.dispose()).not.toThrow();
    });
  });
});
