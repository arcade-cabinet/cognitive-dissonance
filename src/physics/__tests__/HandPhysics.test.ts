/**
 * HandPhysics unit tests
 */

const mockApplyForce = jest.fn();
const mockApplyTorque = jest.fn();

jest.mock('@babylonjs/core/Maths/math.vector', () => {
  function createV3(x: number, y: number, z: number) {
    return {
      x, y, z,
      subtract: jest.fn().mockReturnValue({
        normalize: jest.fn().mockReturnValue({
          scale: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
        }),
      }),
    };
  }
  const actualVector3 = jest.fn().mockImplementation(createV3);
  (actualVector3 as any).Distance = jest.fn().mockReturnValue(0.03); // default: within proximity
  return { Vector3: actualVector3 };
});

jest.mock('../KeycapPhysics', () => ({
  KeycapPhysics: {
    getInstance: jest.fn().mockReturnValue({
      getKeycapAggregate: jest.fn().mockReturnValue({
        body: { applyForce: mockApplyForce },
      }),
    }),
  },
}));

jest.mock('../PlatterPhysics', () => ({
  PlatterPhysics: {
    getInstance: jest.fn().mockReturnValue({
      getLeverAggregate: jest.fn().mockReturnValue({
        body: { applyTorque: mockApplyTorque },
      }),
    }),
  },
}));

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HandPhysics } from '../HandPhysics';

function createHandPhysics(): HandPhysics {
  (HandPhysics as any).instance = null;
  return HandPhysics.getInstance();
}

describe('HandPhysics', () => {
  let handPhysics: HandPhysics;
  const mockScene = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    handPhysics = createHandPhysics();
  });

  afterEach(() => {
    handPhysics.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = HandPhysics.getInstance();
      const b = HandPhysics.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = HandPhysics.getInstance();
      (HandPhysics as any).instance = null;
      const b = HandPhysics.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('initialize()', () => {
    it('stores the scene reference', () => {
      handPhysics.initialize(mockScene);
      expect((handPhysics as any).scene).toBe(mockScene);
    });

    it('does not throw', () => {
      expect(() => handPhysics.initialize(mockScene)).not.toThrow();
    });
  });

  describe('applyKeycapHoldForce()', () => {
    const mockKeycapMesh = {
      name: 'keycap-A',
      getAbsolutePosition: jest.fn().mockReturnValue({ x: 0, y: 1, z: 0 }),
    } as any;

    it('applies upward force when joint is within proximity threshold', () => {
      (Vector3 as any).Distance.mockReturnValue(0.03); // < 0.05 threshold
      const jointPos = new Vector3(0, 1, 0);
      handPhysics.applyKeycapHoldForce(mockKeycapMesh, jointPos, 0.8);
      expect(mockApplyForce).toHaveBeenCalled();
    });

    it('does not apply force when joint is beyond threshold', () => {
      (Vector3 as any).Distance.mockReturnValue(0.1); // > 0.05 threshold
      const jointPos = new Vector3(0, 2, 0);
      handPhysics.applyKeycapHoldForce(mockKeycapMesh, jointPos, 0.8);
      expect(mockApplyForce).not.toHaveBeenCalled();
    });

    it('scales force by gripStrength with base force 15', () => {
      (Vector3 as any).Distance.mockReturnValue(0.02);
      const jointPos = new Vector3(0, 1, 0);
      handPhysics.applyKeycapHoldForce(mockKeycapMesh, jointPos, 0.5);
      // Vector3(0, 0.5 * 15, 0) = Vector3(0, 7.5, 0)
      expect(Vector3).toHaveBeenCalledWith(0, 7.5, 0);
    });

    it('accepts custom proximity threshold', () => {
      (Vector3 as any).Distance.mockReturnValue(0.07);
      const jointPos = new Vector3(0, 1, 0);
      handPhysics.applyKeycapHoldForce(mockKeycapMesh, jointPos, 0.5, 0.1);
      expect(mockApplyForce).toHaveBeenCalled();
    });
  });

  describe('applyLeverGripForce()', () => {
    const mockLeverMesh = {
      name: 'lever',
      getAbsolutePosition: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
    } as any;

    it('applies torque when palm is within proximity', () => {
      (Vector3 as any).Distance.mockReturnValue(0.05); // < 0.08 threshold
      const palmPos = new Vector3(0, 0, 0);
      handPhysics.applyLeverGripForce(mockLeverMesh, palmPos, 0.7);
      expect(mockApplyTorque).toHaveBeenCalled();
    });

    it('does not apply torque when palm is beyond threshold', () => {
      (Vector3 as any).Distance.mockReturnValue(0.15); // > 0.08 threshold
      const palmPos = new Vector3(1, 1, 1);
      handPhysics.applyLeverGripForce(mockLeverMesh, palmPos, 0.7);
      expect(mockApplyTorque).not.toHaveBeenCalled();
    });

    it('scales torque by gripStrength with base 5', () => {
      (Vector3 as any).Distance.mockReturnValue(0.03);
      const palmPos = new Vector3(0, 0, 0);
      handPhysics.applyLeverGripForce(mockLeverMesh, palmPos, 0.6);
      // Vector3(0.6 * 5, 0, 0) = Vector3(3, 0, 0)
      expect(Vector3).toHaveBeenCalledWith(expect.closeTo(3, 5), 0, 0);
    });
  });

  describe('applySphereGripConstraint()', () => {
    const mockSphereMesh = {
      name: 'sphere',
      getAbsolutePosition: jest.fn().mockReturnValue({
        x: 0, y: 0, z: 0,
        subtract: jest.fn().mockReturnValue({
          normalize: jest.fn().mockReturnValue({
            scale: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
          }),
        }),
      }),
    } as any;

    it('returns 0.0 when no joints are near sphere', () => {
      (Vector3 as any).Distance.mockReturnValue(0.5); // > 0.15 threshold
      const joints = [new Vector3(1, 1, 1)];
      const result = handPhysics.applySphereGripConstraint(mockSphereMesh, joints);
      expect(result).toBe(0.0);
    });

    it('returns positive proximity factor when joints are near sphere', () => {
      (Vector3 as any).Distance.mockReturnValue(0.05); // < 0.15 threshold
      const joints = [new Vector3(0, 0, 0), new Vector3(0, 0, 0)];
      const result = handPhysics.applySphereGripConstraint(mockSphereMesh, joints);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1.0);
    });

    it('calculates proximity factor as 1 - distance/threshold', () => {
      (Vector3 as any).Distance.mockReturnValue(0.075); // half of 0.15
      const joints = [new Vector3(0, 0, 0)];
      const result = handPhysics.applySphereGripConstraint(mockSphereMesh, joints);
      expect(result).toBeCloseTo(0.5, 1);
    });

    it('accepts custom proximity threshold', () => {
      (Vector3 as any).Distance.mockReturnValue(0.2); // > 0.15 but < 0.3
      const joints = [new Vector3(0, 0, 0)];
      const result = handPhysics.applySphereGripConstraint(mockSphereMesh, joints, 0.3);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('dispose()', () => {
    it('clears scene reference', () => {
      handPhysics.initialize(mockScene);
      handPhysics.dispose();
      expect((handPhysics as any).scene).toBeNull();
    });

    it('does not throw when called without initialization', () => {
      expect(() => handPhysics.dispose()).not.toThrow();
    });
  });
});
