/**
 * KeycapPhysics unit tests
 */

const mockApplyForce = jest.fn();
const mockAggregateDispose = jest.fn();
const mockConstraintDispose = jest.fn();
const mockGetAbsolutePosition = jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 });

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
      applyForce: mockApplyForce,
    },
    transformNode: {
      getAbsolutePosition: mockGetAbsolutePosition,
    },
    dispose: mockAggregateDispose,
  })),
}));

import { KeycapPhysics } from '../KeycapPhysics';

function createKeycapPhysics(): KeycapPhysics {
  (KeycapPhysics as any).instance = null;
  return KeycapPhysics.getInstance();
}

describe('KeycapPhysics', () => {
  let physics: KeycapPhysics;

  const mockScene = {} as any;
  const mockKeycapMesh = {
    name: 'keycap-A',
    position: { x: 0, y: 1, z: 0 },
  } as any;
  const mockPlatterMesh = {
    name: 'platter',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    physics = createKeycapPhysics();
  });

  afterEach(() => {
    physics.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = KeycapPhysics.getInstance();
      const b = KeycapPhysics.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = KeycapPhysics.getInstance();
      (KeycapPhysics as any).instance = null;
      const b = KeycapPhysics.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('applyKeycapPhysics()', () => {
    it('creates a PhysicsAggregate with mass 0.3 and restitution 0.1', () => {
      const { PhysicsAggregate } = require('@babylonjs/core/Physics/v2/physicsAggregate');
      physics.applyKeycapPhysics(mockKeycapMesh, mockPlatterMesh, mockScene);
      expect(PhysicsAggregate).toHaveBeenCalledWith(
        mockKeycapMesh,
        expect.anything(), // PhysicsShapeType.BOX
        { mass: 0.3, restitution: 0.1 },
        mockScene,
      );
    });

    it('stores aggregate by keycap name', () => {
      physics.applyKeycapPhysics(mockKeycapMesh, mockPlatterMesh, mockScene);
      const aggregate = physics.getKeycapAggregate('keycap-A');
      expect(aggregate).toBeDefined();
    });

    it('can apply physics to multiple keycaps', () => {
      physics.applyKeycapPhysics(mockKeycapMesh, mockPlatterMesh, mockScene);
      const mockKeycapB = { ...mockKeycapMesh, name: 'keycap-B' };
      physics.applyKeycapPhysics(mockKeycapB as any, mockPlatterMesh, mockScene);
      expect(physics.getKeycapAggregate('keycap-A')).toBeDefined();
      expect(physics.getKeycapAggregate('keycap-B')).toBeDefined();
    });
  });

  describe('getKeycapAggregate()', () => {
    it('returns undefined for unknown keycap', () => {
      expect(physics.getKeycapAggregate('keycap-Z')).toBeUndefined();
    });

    it('returns the stored aggregate by name', () => {
      physics.applyKeycapPhysics(mockKeycapMesh, mockPlatterMesh, mockScene);
      expect(physics.getKeycapAggregate('keycap-A')).toBeDefined();
    });
  });

  describe('getKeycapConstraint()', () => {
    it('returns undefined for unknown keycap', () => {
      expect(physics.getKeycapConstraint('keycap-Z')).toBeUndefined();
    });
  });

  describe('applyKeycapForce()', () => {
    it('applies downward force to existing keycap', () => {
      physics.applyKeycapPhysics(mockKeycapMesh, mockPlatterMesh, mockScene);
      physics.applyKeycapForce('keycap-A', 0.5);
      expect(mockApplyForce).toHaveBeenCalledTimes(1);
    });

    it('does nothing for unknown keycap', () => {
      physics.applyKeycapForce('keycap-Z', 0.5);
      expect(mockApplyForce).not.toHaveBeenCalled();
    });

    it('scales force by input factor with scale 10', () => {
      const { Vector3 } = require('@babylonjs/core/Maths/math.vector');
      physics.applyKeycapPhysics(mockKeycapMesh, mockPlatterMesh, mockScene);
      physics.applyKeycapForce('keycap-A', 0.8);
      // Vector3(0, -0.8*10, 0) = Vector3(0, -8, 0)
      expect(Vector3).toHaveBeenCalledWith(0, -8, 0);
    });
  });

  describe('dispose()', () => {
    it('disposes all aggregates', () => {
      physics.applyKeycapPhysics(mockKeycapMesh, mockPlatterMesh, mockScene);
      physics.dispose();
      expect(mockAggregateDispose).toHaveBeenCalledTimes(1);
    });

    it('clears aggregates map', () => {
      physics.applyKeycapPhysics(mockKeycapMesh, mockPlatterMesh, mockScene);
      physics.dispose();
      expect(physics.getKeycapAggregate('keycap-A')).toBeUndefined();
    });

    it('can be called safely when empty', () => {
      expect(() => physics.dispose()).not.toThrow();
    });
  });
});
