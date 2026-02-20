/**
 * HandInteractionSystem unit tests
 */

const mockRegisterBeforeRender = jest.fn();
const mockHoldKey = jest.fn();
const mockPullLever = jest.fn();
const mockTensionIncrease = jest.fn();
const mockTriggerContact = jest.fn();

const mockApplyRotationDelta = jest.fn();

jest.mock('@babylonjs/core/Maths/math.vector', () => {
  const V3 = jest.fn().mockImplementation((x: number, y: number, z: number) => ({
    x, y, z,
    addInPlace(v: any) { this.x += v.x; this.y += v.y; this.z += v.z; return this; },
    scaleInPlace(s: number) { this.x *= s; this.y *= s; this.z *= s; return this; },
    subtract(other: any) { return new (V3 as any)(this.x - other.x, this.y - other.y, this.z - other.z); },
  }));
  (V3 as any).Distance = jest.fn().mockReturnValue(0.5); // default: out of range
  (V3 as any).Zero = jest.fn().mockImplementation(() => new (V3 as any)(0, 0, 0));
  return { Vector3: V3 };
});

jest.mock('../../systems/SphereTrackballSystem', () => ({
  SphereTrackballSystem: {
    getInstance: jest.fn().mockReturnValue({
      applyRotationDelta: mockApplyRotationDelta,
    }),
  },
}));

jest.mock('@babylonjs/core/Meshes/mesh', () => ({}));
jest.mock('@babylonjs/core/scene', () => ({}));

jest.mock('../../ecs/World', () => ({
  world: {
    with: jest.fn().mockReturnValue({ entities: [] }),
  },
  LeftHand: { entities: [] },
  RightHand: { entities: [] },
}));

jest.mock('../MechanicalHaptics', () => ({
  MechanicalHaptics: {
    getInstance: jest.fn().mockReturnValue({
      triggerContact: mockTriggerContact,
    }),
  },
}));

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LeftHand, RightHand } from '../../ecs/World';
import { HandInteractionSystem } from '../HandInteractionSystem';

function createHandInteractionSystem(): HandInteractionSystem {
  (HandInteractionSystem as any).instance = null;
  return HandInteractionSystem.getInstance();
}

describe('HandInteractionSystem', () => {
  let system: HandInteractionSystem;

  const mockScene = {
    registerBeforeRender: mockRegisterBeforeRender,
  } as any;

  const mockPatternSystem = { holdKey: mockHoldKey } as any;
  const mockAnimationSystem = { pullLever: mockPullLever } as any;
  const mockTensionSystem = { increase: mockTensionIncrease } as any;

  const mockKeycapMesh = {
    name: 'keycap-A',
    position: new Vector3(0, 0, 0),
  } as any;

  const mockLeverMesh = { name: 'lever', position: new Vector3(0, 0, 0) } as any;
  const mockSphereMesh = { name: 'sphere', position: new Vector3(0, 0, 0), getAbsolutePosition: () => new Vector3(0, 0, 0) } as any;

  // Create fresh keycaps map each time to avoid mutation from dispose()
  function freshKeycaps() {
    return new Map([['A', mockKeycapMesh]]);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    system = createHandInteractionSystem();
  });

  afterEach(() => {
    system.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = HandInteractionSystem.getInstance();
      const b = HandInteractionSystem.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = HandInteractionSystem.getInstance();
      (HandInteractionSystem as any).instance = null;
      const b = HandInteractionSystem.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('init()', () => {
    it('stores scene and system references', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      expect((system as any).scene).toBe(mockScene);
      expect((system as any).patternSystem).toBe(mockPatternSystem);
      expect((system as any).animationSystem).toBe(mockAnimationSystem);
      expect((system as any).tensionSystem).toBe(mockTensionSystem);
    });

    it('stores keycaps map', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      expect((system as any).keycaps.size).toBe(1);
    });

    it('stores lever and sphere meshes', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      expect((system as any).leverMesh).toBe(mockLeverMesh);
      expect((system as any).sphereMesh).toBe(mockSphereMesh);
    });

    it('initializes MechanicalHaptics', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      expect((system as any).haptics).toBeDefined();
    });
  });

  describe('activate()', () => {
    it('registers a before-render callback on the scene', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.activate();
      expect(mockRegisterBeforeRender).toHaveBeenCalledWith(expect.any(Function));
    });

    it('sets updateLoopRegistered to true', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.activate();
      expect((system as any).updateLoopRegistered).toBe(true);
    });

    it('does not register twice if already active', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.activate();
      system.activate();
      expect(mockRegisterBeforeRender).toHaveBeenCalledTimes(1);
    });

    it('does nothing without scene', () => {
      system.activate();
      expect(mockRegisterBeforeRender).not.toHaveBeenCalled();
    });
  });

  describe('deactivate()', () => {
    it('sets updateLoopRegistered to false', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.activate();
      system.deactivate();
      expect((system as any).updateLoopRegistered).toBe(false);
    });
  });

  describe('updateHandInteractions (via activate + render)', () => {
    function setupAndActivate() {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.activate();
      // Get the registered callback
      return mockRegisterBeforeRender.mock.calls[0][0];
    }

    it('calls holdKey when fingertip is near keycap', () => {
      (Vector3 as any).Distance.mockReturnValue(0.03); // < 0.05 KEYCAP_PROXIMITY
      const mockJoint = { joint: { position: new Vector3(0, 0, 0) } };
      (LeftHand as any).entities = [{ joints: [mockJoint, mockJoint, mockJoint], pinchStrength: 0.8 }];
      (RightHand as any).entities = [];

      const callback = setupAndActivate();
      callback();

      expect(mockHoldKey).toHaveBeenCalledWith('A', 100, 0.8);
    });

    it('uses default pinchStrength of 0.5 when not provided', () => {
      (Vector3 as any).Distance.mockReturnValue(0.03);
      const mockJoint = { joint: { position: new Vector3(0, 0, 0) } };
      (LeftHand as any).entities = [{ joints: [mockJoint, mockJoint, mockJoint] }]; // no pinchStrength
      (RightHand as any).entities = [];

      const callback = setupAndActivate();
      callback();

      expect(mockHoldKey).toHaveBeenCalledWith('A', 100, 0.5);
    });

    it('calls pullLever when palm joint is near lever', () => {
      (Vector3 as any).Distance
        .mockReturnValueOnce(0.5) // fingertip-keycap: too far
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.05); // palm-lever: close enough (< 0.08)

      const joints = Array.from({ length: 14 }, () => ({ joint: { position: new Vector3(0, 0, 0) } }));
      (LeftHand as any).entities = [{ joints, gripStrength: 0.9 }];
      (RightHand as any).entities = [];

      const callback = setupAndActivate();
      callback();

      expect(mockPullLever).toHaveBeenCalledWith(0.9);
    });

    it('calls tensionSystem.increase when 5+ joints near sphere', () => {
      // First 3 calls: fingertip-keycap (far)
      // Next call: palm-lever (far)
      // Then 14 calls for sphere: first 5 close, rest far
      const distanceResults = [
        0.5, 0.5, 0.5, // keycap checks
        0.5,           // lever check
        0.1, 0.1, 0.1, 0.1, 0.1, // 5 joints near sphere (< 0.15)
        0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, // rest far
      ];
      let callIdx = 0;
      (Vector3 as any).Distance.mockImplementation(() => distanceResults[callIdx++] ?? 0.5);

      const joints = Array.from({ length: 14 }, () => ({ joint: { position: new Vector3(0, 0, 0) } }));
      (LeftHand as any).entities = [{ joints }];
      (RightHand as any).entities = [];

      const callback = setupAndActivate();
      callback();

      expect(mockTensionIncrease).toHaveBeenCalledWith(0.02);
    });

    it('skips hands without joints', () => {
      (LeftHand as any).entities = [{}]; // no joints property
      (RightHand as any).entities = [];

      const callback = setupAndActivate();
      callback();

      expect(mockHoldKey).not.toHaveBeenCalled();
      expect(mockPullLever).not.toHaveBeenCalled();
      expect(mockTensionIncrease).not.toHaveBeenCalled();
    });

    it('does not update when deactivated', () => {
      (Vector3 as any).Distance.mockReturnValue(0.03);
      const mockJoint = { joint: { position: new Vector3(0, 0, 0) } };
      (LeftHand as any).entities = [{ joints: [mockJoint, mockJoint, mockJoint], pinchStrength: 0.8 }];
      (RightHand as any).entities = [];

      const callback = setupAndActivate();
      system.deactivate();
      callback();

      expect(mockHoldKey).not.toHaveBeenCalled();
    });
  });

  describe('haptic feedback', () => {
    it('triggers keycapHold haptic on keycap interaction', () => {
      (Vector3 as any).Distance.mockReturnValue(0.03);
      const mockJoint = { joint: { position: new Vector3(0, 0, 0) } };
      (LeftHand as any).entities = [{ joints: [mockJoint, mockJoint, mockJoint], pinchStrength: 0.6 }];
      (RightHand as any).entities = [];

      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.activate();
      const callback = mockRegisterBeforeRender.mock.calls[0][0];
      callback();

      expect(mockTriggerContact).toHaveBeenCalledWith(0.6, 'keycapHold');
    });
  });

  describe('dispose()', () => {
    it('deactivates the system', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.activate();
      system.dispose();
      expect((system as any).updateLoopRegistered).toBe(false);
    });

    it('clears all references', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.dispose();
      expect((system as any).scene).toBeNull();
      expect((system as any).patternSystem).toBeNull();
      expect((system as any).animationSystem).toBeNull();
      expect((system as any).tensionSystem).toBeNull();
      expect((system as any).haptics).toBeNull();
      expect((system as any).leverMesh).toBeNull();
      expect((system as any).sphereMesh).toBeNull();
    });

    it('clears keycaps map', () => {
      system.init(mockScene, mockPatternSystem, mockAnimationSystem, mockTensionSystem, freshKeycaps(), mockLeverMesh, mockSphereMesh);
      system.dispose();
      expect((system as any).keycaps.size).toBe(0);
    });
  });
});
