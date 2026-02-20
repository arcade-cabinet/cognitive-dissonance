import type { YukaTrait } from '../../types';
import { YukaSteeringSystem } from '../YukaSteeringSystem';

// Mock yuka
const mockSteeringAdd = jest.fn();
const mockEntityManagerAdd = jest.fn();
const mockEntityManagerRemove = jest.fn();
const mockEntityManagerUpdate = jest.fn();

jest.mock('yuka', () => {
  class MockVector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  }

  class MockVehicle {
    position = new MockVector3();
    maxSpeed = 0;
    maxForce = 0;
    boundingRadius = 0;
    steering = { add: mockSteeringAdd };
  }

  class MockEntityManager {
    add = mockEntityManagerAdd;
    remove = mockEntityManagerRemove;
    update = mockEntityManagerUpdate;
  }

  class MockSeekBehavior {
    target: any;
    constructor(target: any) {
      this.target = target;
    }
  }

  class MockArriveBehavior {
    target: any;
    deceleration: number;
    constructor(target: any, deceleration: number) {
      this.target = target;
      this.deceleration = deceleration;
    }
  }

  class MockWanderBehavior {
    jitter = 0;
    radius = 0;
    distance = 0;
  }

  return {
    Vehicle: MockVehicle,
    EntityManager: MockEntityManager,
    SeekBehavior: MockSeekBehavior,
    ArriveBehavior: MockArriveBehavior,
    WanderBehavior: MockWanderBehavior,
    Vector3: MockVector3,
  };
});

const ALL_TRAITS: YukaTrait[] = [
  'NeonRaymarcher',
  'TendrilBinder',
  'PlatterCrusher',
  'GlassShatterer',
  'EchoRepeater',
  'LeverSnatcher',
  'SphereCorruptor',
];

function createMockMesh(x = 0, y = 0, z = 0) {
  return {
    position: { x, y, z },
    isDisposed: jest.fn(() => false),
  } as any;
}

describe('YukaSteeringSystem', () => {
  let system: YukaSteeringSystem;

  beforeEach(() => {
    (YukaSteeringSystem as any).instance = null;
    mockSteeringAdd.mockClear();
    mockEntityManagerAdd.mockClear();
    mockEntityManagerRemove.mockClear();
    mockEntityManagerUpdate.mockClear();
    system = YukaSteeringSystem.getInstance();
  });

  afterEach(() => {
    system.dispose();
  });

  describe('singleton', () => {
    it('returns same instance on subsequent calls', () => {
      const instance2 = YukaSteeringSystem.getInstance();
      expect(instance2).toBe(system);
    });

    it('creates new instance after dispose', () => {
      const first = system;
      system.dispose();
      (YukaSteeringSystem as any).instance = null;
      system = YukaSteeringSystem.getInstance();
      expect(system).not.toBe(first);
    });
  });

  describe('initialize', () => {
    it('sets sphere position from mesh', () => {
      const mockScene = {} as any;
      const sphereMesh = createMockMesh(1, 2, 3);
      const leverMesh = createMockMesh(4, 5, 6);

      system.initialize(mockScene, sphereMesh, leverMesh);

      const spherePos = (system as any).spherePosition;
      expect(spherePos.x).toBe(1);
      expect(spherePos.y).toBe(2);
      expect(spherePos.z).toBe(3);
    });

    it('sets lever position from mesh', () => {
      const mockScene = {} as any;
      const sphereMesh = createMockMesh(1, 2, 3);
      const leverMesh = createMockMesh(4, 5, 6);

      system.initialize(mockScene, sphereMesh, leverMesh);

      const leverPos = (system as any).leverPosition;
      expect(leverPos.x).toBe(4);
      expect(leverPos.y).toBe(5);
      expect(leverPos.z).toBe(6);
    });
  });

  describe('registerEnemy', () => {
    it('returns a Vehicle', () => {
      const mesh = createMockMesh(1, 0, 0);
      const vehicle = system.registerEnemy(mesh, 'NeonRaymarcher');

      expect(vehicle).toBeDefined();
      expect(vehicle.position.x).toBe(1);
    });

    it('adds vehicle to EntityManager', () => {
      const mesh = createMockMesh();
      system.registerEnemy(mesh, 'NeonRaymarcher');

      expect(mockEntityManagerAdd).toHaveBeenCalledTimes(1);
    });

    it('adds steering behavior to vehicle', () => {
      const mesh = createMockMesh();
      system.registerEnemy(mesh, 'NeonRaymarcher');

      expect(mockSteeringAdd).toHaveBeenCalledTimes(1);
    });

    it('sets maxForce to 1.0', () => {
      const mesh = createMockMesh();
      const vehicle = system.registerEnemy(mesh, 'NeonRaymarcher');

      expect(vehicle.maxForce).toBe(1.0);
    });

    it('sets boundingRadius to 0.15', () => {
      const mesh = createMockMesh();
      const vehicle = system.registerEnemy(mesh, 'NeonRaymarcher');

      expect(vehicle.boundingRadius).toBe(0.15);
    });

    it('increments active enemy count', () => {
      const mesh = createMockMesh();
      system.registerEnemy(mesh, 'NeonRaymarcher');

      expect(system.getActiveEnemyCount()).toBe(1);
    });
  });

  describe('registerEnemy — trait-specific speeds', () => {
    const expectedSpeeds: Record<YukaTrait, number> = {
      NeonRaymarcher: 0.3,
      TendrilBinder: 0.2,
      PlatterCrusher: 0.15,
      GlassShatterer: 0.5,
      EchoRepeater: 0.25,
      LeverSnatcher: 0.35,
      SphereCorruptor: 0.1,
    };

    for (const trait of ALL_TRAITS) {
      it(`sets maxSpeed to ${expectedSpeeds[trait]} for ${trait}`, () => {
        const mesh = createMockMesh();
        const vehicle = system.registerEnemy(mesh, trait);
        expect(vehicle.maxSpeed).toBe(expectedSpeeds[trait]);
      });
    }
  });

  describe('registerEnemy — trait-specific behaviors', () => {
    for (const trait of ALL_TRAITS) {
      it(`adds steering behavior for ${trait}`, () => {
        mockSteeringAdd.mockClear();
        const mesh = createMockMesh();
        system.registerEnemy(mesh, trait);
        expect(mockSteeringAdd).toHaveBeenCalledTimes(1);
      });
    }
  });

  describe('unregisterEnemy', () => {
    it('removes vehicle from EntityManager', () => {
      const mesh = createMockMesh();
      system.registerEnemy(mesh, 'NeonRaymarcher');
      system.unregisterEnemy(mesh);

      expect(mockEntityManagerRemove).toHaveBeenCalledTimes(1);
    });

    it('decrements active enemy count', () => {
      const mesh = createMockMesh();
      system.registerEnemy(mesh, 'NeonRaymarcher');
      expect(system.getActiveEnemyCount()).toBe(1);

      system.unregisterEnemy(mesh);
      expect(system.getActiveEnemyCount()).toBe(0);
    });

    it('is a no-op for unknown mesh', () => {
      const mesh = createMockMesh();
      system.unregisterEnemy(mesh);

      expect(mockEntityManagerRemove).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('calls EntityManager.update with delta time', () => {
      system.update(0.016);
      expect(mockEntityManagerUpdate).toHaveBeenCalledWith(0.016);
    });

    it('syncs Yuka vehicle position back to Babylon.js mesh', () => {
      const mesh = createMockMesh(0, 0, 0);
      const vehicle = system.registerEnemy(mesh, 'NeonRaymarcher');

      // Simulate Yuka moving the vehicle
      vehicle.position.x = 5;
      vehicle.position.y = 10;
      vehicle.position.z = 15;

      system.update(0.016);

      expect(mesh.position.x).toBe(5);
      expect(mesh.position.y).toBe(10);
      expect(mesh.position.z).toBe(15);
    });

    it('cleans up disposed meshes during update', () => {
      const mesh = createMockMesh();
      mesh.isDisposed = jest.fn(() => true);
      system.registerEnemy(mesh, 'NeonRaymarcher');

      expect(system.getActiveEnemyCount()).toBe(1);

      system.update(0.016);

      expect(system.getActiveEnemyCount()).toBe(0);
      expect(mockEntityManagerRemove).toHaveBeenCalled();
    });

    it('does not sync disposed meshes', () => {
      const mesh = createMockMesh(0, 0, 0);
      mesh.isDisposed = jest.fn(() => true);
      const vehicle = system.registerEnemy(mesh, 'NeonRaymarcher');
      vehicle.position.x = 99;

      system.update(0.016);

      // Mesh position should NOT be updated since it's disposed
      expect(mesh.position.x).toBe(0);
    });
  });

  describe('getActiveEnemyCount', () => {
    it('returns 0 when no enemies registered', () => {
      expect(system.getActiveEnemyCount()).toBe(0);
    });

    it('returns correct count with multiple enemies', () => {
      system.registerEnemy(createMockMesh(), 'NeonRaymarcher');
      system.registerEnemy(createMockMesh(), 'TendrilBinder');
      system.registerEnemy(createMockMesh(), 'PlatterCrusher');

      expect(system.getActiveEnemyCount()).toBe(3);
    });
  });

  describe('reset', () => {
    it('removes all vehicles from EntityManager', () => {
      system.registerEnemy(createMockMesh(), 'NeonRaymarcher');
      system.registerEnemy(createMockMesh(), 'TendrilBinder');

      system.reset();

      expect(mockEntityManagerRemove).toHaveBeenCalledTimes(2);
    });

    it('clears vehicle map', () => {
      system.registerEnemy(createMockMesh(), 'NeonRaymarcher');
      system.reset();

      expect(system.getActiveEnemyCount()).toBe(0);
    });
  });

  describe('dispose', () => {
    it('resets and nullifies singleton', () => {
      system.registerEnemy(createMockMesh(), 'NeonRaymarcher');
      system.dispose();

      expect(system.getActiveEnemyCount()).toBe(0);
      expect((YukaSteeringSystem as any).instance).toBeNull();
    });

    it('allows creating new instance after dispose', () => {
      system.dispose();
      (YukaSteeringSystem as any).instance = null;
      const newSystem = YukaSteeringSystem.getInstance();
      expect(newSystem).toBeDefined();
      expect(newSystem.getActiveEnemyCount()).toBe(0);
      newSystem.dispose();
    });
  });
});
