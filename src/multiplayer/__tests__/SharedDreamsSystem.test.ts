/**
 * SharedDreamsSystem unit tests
 */

const mockMeshDispose = jest.fn();

jest.mock('@babylonjs/core/Materials/standardMaterial', () => ({
  StandardMaterial: jest.fn().mockImplementation(() => ({
    diffuseColor: null,
    specularColor: null,
    alpha: 1.0,
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn().mockImplementation((r: number, g: number, b: number) => ({ r, g, b })),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => {
  const V3 = jest.fn().mockImplementation((x: number, y: number, z: number) => ({ x, y, z }));
  (V3 as any).Zero = jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 });
  (V3 as any).Lerp = jest.fn().mockImplementation((_a: any, b: any, _t: number) => b);

  const Q = jest.fn().mockImplementation((x: number, y: number, z: number, w: number) => ({ x, y, z, w }));
  (Q as any).Identity = jest.fn().mockReturnValue({ x: 0, y: 0, z: 0, w: 1 });
  (Q as any).Slerp = jest.fn().mockImplementation((_a: any, b: any, _t: number) => b);

  return { Vector3: V3, Quaternion: Q };
});

jest.mock('@babylonjs/core/Meshes/mesh', () => ({}));
jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateCylinder: jest.fn().mockReturnValue({
      material: null,
      position: { x: 0, y: 0, z: 0 },
      rotationQuaternion: null,
      dispose: mockMeshDispose,
    }),
  },
}));
jest.mock('@babylonjs/core/scene', () => ({}));

import { SharedDreamsSystem } from '../SharedDreamsSystem';

function createSharedDreamsSystem(): SharedDreamsSystem {
  (SharedDreamsSystem as any).instance = null;
  return SharedDreamsSystem.getInstance();
}

describe('SharedDreamsSystem', () => {
  let system: SharedDreamsSystem;

  const mockTensionSystem = {
    currentTension: 0.5,
    increase: jest.fn(),
  } as any;

  const mockLocalPlatterMesh = {
    position: { x: 1, y: 2, z: 3 },
    rotationQuaternion: { x: 0, y: 0, z: 0, w: 1 },
  } as any;

  const mockScene = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    system = createSharedDreamsSystem();
  });

  afterEach(() => {
    system.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = SharedDreamsSystem.getInstance();
      const b = SharedDreamsSystem.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = SharedDreamsSystem.getInstance();
      (SharedDreamsSystem as any).instance = null;
      const b = SharedDreamsSystem.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('initialize()', () => {
    it('stores scene, tension system, and local platter mesh', () => {
      system.initialize(mockScene, mockTensionSystem, mockLocalPlatterMesh);
      expect((system as any).scene).toBe(mockScene);
      expect((system as any).tensionSystem).toBe(mockTensionSystem);
      expect((system as any).localPlatterMesh).toBe(mockLocalPlatterMesh);
    });

    it('does not throw', () => {
      expect(() => system.initialize(mockScene, mockTensionSystem, mockLocalPlatterMesh)).not.toThrow();
    });
  });

  describe('connect()', () => {
    it('throws when not initialized', async () => {
      await expect(system.connect('ws://test', 'room1')).rejects.toThrow('SharedDreamsSystem not initialized');
    });

    // WebSocket cannot be easily tested in node without a real server,
    // but we can verify the system sets up peer ID
    it('generates a peer ID when initialized', async () => {
      system.initialize(mockScene, mockTensionSystem, mockLocalPlatterMesh);
      // Mock WebSocket
      const mockWS = {
        onopen: null as any,
        onmessage: null as any,
        onerror: null as any,
        onclose: null as any,
        send: jest.fn(),
        close: jest.fn(),
      };
      (global as any).WebSocket = jest.fn().mockImplementation(() => mockWS);

      await system.connect('ws://test', 'room1');
      expect((system as any).peerId).not.toBeNull();
      expect((system as any).peerId).toMatch(/^peer-/);

      delete (global as any).WebSocket;
    });
  });

  describe('update()', () => {
    it('does nothing when no remote platter exists', () => {
      expect(() => system.update()).not.toThrow();
    });
  });

  describe('disconnect()', () => {
    it('does not throw when not connected', () => {
      expect(() => system.disconnect()).not.toThrow();
    });

    it('clears peer IDs', () => {
      system.disconnect();
      expect((system as any).peerId).toBeNull();
      expect((system as any).remotePeerId).toBeNull();
    });
  });

  describe('reset()', () => {
    it('calls disconnect', () => {
      const disconnectSpy = jest.spyOn(system, 'disconnect');
      system.reset();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    it('disconnects and clears all references', () => {
      system.initialize(mockScene, mockTensionSystem, mockLocalPlatterMesh);
      system.dispose();
      expect((system as any).scene).toBeNull();
      expect((system as any).tensionSystem).toBeNull();
      expect((system as any).localPlatterMesh).toBeNull();
    });

    it('can be called safely without initialization', () => {
      expect(() => system.dispose()).not.toThrow();
    });

    it('can be called multiple times', () => {
      system.initialize(mockScene, mockTensionSystem, mockLocalPlatterMesh);
      system.dispose();
      expect(() => system.dispose()).not.toThrow();
    });
  });

  describe('INTERPOLATION_WINDOW_MS', () => {
    it('is set to 200ms', () => {
      expect((system as any).INTERPOLATION_WINDOW_MS).toBe(200);
    });
  });

  describe('FADE_TIMEOUT_MS', () => {
    it('is set to 500ms', () => {
      expect((system as any).FADE_TIMEOUT_MS).toBe(500);
    });
  });

  describe('DISCONNECT_TIMEOUT_MS', () => {
    it('is set to 2000ms', () => {
      expect((system as any).DISCONNECT_TIMEOUT_MS).toBe(2000);
    });
  });
});
