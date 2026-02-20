/**
 * PlatterPhysics unit tests
 */

const mockApplyAngularImpulse = jest.fn();
const mockAggregateDispose = jest.fn();

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: jest.fn().mockImplementation((x: number, y: number, z: number) => ({ x, y, z })),
}));

jest.mock('@babylonjs/core/Physics/v2/IPhysicsEnginePlugin', () => ({
  PhysicsShapeType: {
    BOX: 0,
    CYLINDER: 1,
  },
}));

jest.mock('@babylonjs/core/Physics/v2/physicsAggregate', () => ({
  PhysicsAggregate: jest.fn().mockImplementation(() => ({
    body: {
      applyAngularImpulse: mockApplyAngularImpulse,
    },
    dispose: mockAggregateDispose,
  })),
}));

import { PlatterPhysics } from '../PlatterPhysics';

function createPlatterPhysics(): PlatterPhysics {
  (PlatterPhysics as any).instance = null;
  return PlatterPhysics.getInstance();
}

describe('PlatterPhysics', () => {
  let physics: PlatterPhysics;

  const mockScene = {} as any;
  const mockPlatterMesh = { name: 'platter' } as any;
  const mockLeverMesh = { name: 'lever' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    physics = createPlatterPhysics();
  });

  afterEach(() => {
    physics.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = PlatterPhysics.getInstance();
      const b = PlatterPhysics.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = PlatterPhysics.getInstance();
      (PlatterPhysics as any).instance = null;
      const b = PlatterPhysics.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('applyPlatterPhysics()', () => {
    it('creates a PhysicsAggregate with mass 0 (static)', () => {
      const { PhysicsAggregate } = require('@babylonjs/core/Physics/v2/physicsAggregate');
      physics.applyPlatterPhysics(mockPlatterMesh, mockScene);
      expect(PhysicsAggregate).toHaveBeenCalledWith(
        mockPlatterMesh,
        expect.anything(), // PhysicsShapeType.CYLINDER
        { mass: 0 },
        mockScene,
      );
    });

    it('stores the platter aggregate', () => {
      physics.applyPlatterPhysics(mockPlatterMesh, mockScene);
      expect(physics.getPlatterAggregate()).not.toBeNull();
    });
  });

  describe('applyLeverPhysics()', () => {
    it('creates a PhysicsAggregate with mass 0.1 and restitution 0.2', () => {
      const { PhysicsAggregate } = require('@babylonjs/core/Physics/v2/physicsAggregate');
      physics.applyLeverPhysics(mockLeverMesh, mockPlatterMesh, mockScene);
      expect(PhysicsAggregate).toHaveBeenCalledWith(
        mockLeverMesh,
        expect.anything(), // PhysicsShapeType.BOX
        { mass: 0.1, restitution: 0.2 },
        mockScene,
      );
    });

    it('stores the lever aggregate', () => {
      physics.applyLeverPhysics(mockLeverMesh, mockPlatterMesh, mockScene);
      expect(physics.getLeverAggregate()).not.toBeNull();
    });
  });

  describe('setTension()', () => {
    it('stores the tension value', () => {
      physics.setTension(0.5);
      // Verify via applyPlatterResistance behavior
      expect((physics as any).currentTension).toBe(0.5);
    });
  });

  describe('applyPlatterResistance()', () => {
    it('does nothing when platter aggregate is null', () => {
      physics.applyPlatterResistance(1.0);
      expect(mockApplyAngularImpulse).not.toHaveBeenCalled();
    });

    it('applies counter-torque proportional to tension and angular velocity', () => {
      physics.applyPlatterPhysics(mockPlatterMesh, mockScene);
      physics.setTension(0.5);
      physics.applyPlatterResistance(2.0);
      // resistanceTorque = -angularVelocity * tension * 120 = -2.0 * 0.5 * 120 = -120
      const { Vector3 } = require('@babylonjs/core/Maths/math.vector');
      expect(Vector3).toHaveBeenCalledWith(0, -120, 0);
      expect(mockApplyAngularImpulse).toHaveBeenCalled();
    });

    it('applies zero torque when tension is 0', () => {
      physics.applyPlatterPhysics(mockPlatterMesh, mockScene);
      physics.setTension(0);
      physics.applyPlatterResistance(2.0);
      const { Vector3 } = require('@babylonjs/core/Maths/math.vector');
      expect(Vector3).toHaveBeenCalledWith(0, -0, 0);
    });
  });

  describe('setLeverResistance()', () => {
    it('stores the resistance multiplier', () => {
      physics.setLeverResistance(2.0);
      expect((physics as any).leverResistanceMultiplier).toBe(2.0);
    });
  });

  describe('applyLeverResistance()', () => {
    it('does nothing when lever aggregate is null', () => {
      physics.applyLeverResistance(1.0);
      expect(mockApplyAngularImpulse).not.toHaveBeenCalled();
    });

    it('applies counter-torque on X-axis proportional to resistance multiplier', () => {
      physics.applyLeverPhysics(mockLeverMesh, mockPlatterMesh, mockScene);
      physics.setLeverResistance(2.0);
      physics.applyLeverResistance(1.0);
      // resistanceTorque = -angularVelocity * 50 * multiplier = -1.0 * 50 * 2.0 = -100
      const { Vector3 } = require('@babylonjs/core/Maths/math.vector');
      expect(Vector3).toHaveBeenCalledWith(-100, 0, 0);
      expect(mockApplyAngularImpulse).toHaveBeenCalled();
    });
  });

  describe('getPlatterAggregate()', () => {
    it('returns null before initialization', () => {
      expect(physics.getPlatterAggregate()).toBeNull();
    });
  });

  describe('getLeverAggregate()', () => {
    it('returns null before initialization', () => {
      expect(physics.getLeverAggregate()).toBeNull();
    });
  });

  describe('dispose()', () => {
    it('disposes platter aggregate', () => {
      physics.applyPlatterPhysics(mockPlatterMesh, mockScene);
      physics.dispose();
      expect(mockAggregateDispose).toHaveBeenCalled();
      expect(physics.getPlatterAggregate()).toBeNull();
    });

    it('disposes lever aggregate', () => {
      physics.applyLeverPhysics(mockLeverMesh, mockPlatterMesh, mockScene);
      physics.dispose();
      expect(mockAggregateDispose).toHaveBeenCalled();
      expect(physics.getLeverAggregate()).toBeNull();
    });

    it('can be called safely when empty', () => {
      expect(() => physics.dispose()).not.toThrow();
    });
  });
});
