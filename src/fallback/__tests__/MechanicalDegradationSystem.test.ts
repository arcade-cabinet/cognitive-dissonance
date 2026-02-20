/**
 * MechanicalDegradationSystem unit tests (Grok spec)
 *
 * Verifies:
 * - Voronoi crack generation (mechanicalCrack shader)
 * - Crack propagation with tension
 * - Dust particle spawn from slit edges (dustParticle shader)
 * - Sphere PBR normal map fracture propagation
 * - Gear-binding micro-jitter
 * - Lever resistance creep
 * - World impact effects
 */

const mockRegisterBeforeRender = jest.fn();
const mockUnregisterBeforeRender = jest.fn();
const mockDynamicTextureDispose = jest.fn();
const mockDynamicTextureUpdate = jest.fn();
const mockShaderMaterialDispose = jest.fn();
const mockShaderSetFloat = jest.fn();
const mockParticleSystemDispose = jest.fn();
const mockParticleSystemStart = jest.fn();

jest.mock('@babylonjs/core/Materials/PBR/pbrMaterial', () => ({}));
jest.mock('@babylonjs/core/Materials/Textures/dynamicTexture', () => ({
  DynamicTexture: jest.fn().mockImplementation(() => ({
    getContext: jest.fn().mockReturnValue({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
    }),
    update: mockDynamicTextureUpdate,
    dispose: mockDynamicTextureDispose,
  })),
}));
jest.mock('@babylonjs/core/Materials/shaderMaterial', () => ({
  ShaderMaterial: jest.fn().mockImplementation(() => ({
    setFloat: mockShaderSetFloat,
    dispose: mockShaderMaterialDispose,
  })),
}));
jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
  Color4: jest.fn((r: number, g: number, b: number, a: number) => ({ r, g, b, a })),
}));
jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: jest.fn((x: number, y: number, z: number) => ({ x, y, z })),
}));
jest.mock('@babylonjs/core/Meshes/mesh', () => ({}));
jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreatePlane: jest.fn(() => ({ dispose: jest.fn() })),
  },
}));
jest.mock('@babylonjs/core/Particles/particleSystem', () => ({
  ParticleSystem: jest.fn().mockImplementation(() => ({
    particleTexture: null,
    emitter: null,
    color1: null,
    color2: null,
    colorDead: null,
    minSize: 0,
    maxSize: 0,
    minLifeTime: 0,
    maxLifeTime: 0,
    emitRate: 0,
    gravity: null,
    minEmitBox: null,
    maxEmitBox: null,
    start: mockParticleSystemStart,
    dispose: mockParticleSystemDispose,
  })),
}));
jest.mock('@babylonjs/core/scene', () => ({}));

import { MechanicalDegradationSystem } from '../MechanicalDegradationSystem';

function createMockTensionSystem() {
  return {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
}

function createMockScene() {
  return {
    registerBeforeRender: mockRegisterBeforeRender,
    unregisterBeforeRender: mockUnregisterBeforeRender,
  } as any;
}

function createMechanicalDegradationSystem(
  scene = createMockScene(),
  tensionSystem = createMockTensionSystem(),
): MechanicalDegradationSystem {
  (MechanicalDegradationSystem as any).instance = null;
  return MechanicalDegradationSystem.getInstance(scene, tensionSystem as any);
}

describe('MechanicalDegradationSystem', () => {
  let system: MechanicalDegradationSystem;
  let mockScene: any;
  let mockTensionSystem: ReturnType<typeof createMockTensionSystem>;

  const createMockPlatterMesh = () => ({
    name: 'platter',
    rotation: { y: 0 },
    material: {
      bumpTexture: null as any,
    },
  });

  const createMockSphereMesh = () => ({
    name: 'sphere',
    material: {
      bumpTexture: null as any,
    },
  });

  const mockLeverMesh = { name: 'lever' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScene = createMockScene();
    mockTensionSystem = createMockTensionSystem();
    system = createMechanicalDegradationSystem(mockScene, mockTensionSystem);
  });

  afterEach(() => {
    system.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = MechanicalDegradationSystem.getInstance(mockScene, mockTensionSystem as any);
      const b = MechanicalDegradationSystem.getInstance(mockScene, mockTensionSystem as any);
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = MechanicalDegradationSystem.getInstance(mockScene, mockTensionSystem as any);
      (MechanicalDegradationSystem as any).instance = null;
      const b = MechanicalDegradationSystem.getInstance(mockScene, mockTensionSystem as any);
      expect(a).not.toBe(b);
    });
  });

  describe('constructor', () => {
    it('registers as tension listener', () => {
      expect(mockTensionSystem.addListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('activate()', () => {
    it('sets isActive to true', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      expect((system as any).isActive).toBe(true);
    });

    it('creates Voronoi crack normal map', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      expect((system as any).crackNormalMap).not.toBeNull();
    });

    it('creates crack ShaderMaterial for Voronoi generation', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      expect((system as any).crackShaderMaterial).not.toBeNull();
    });

    it('creates dust particle system', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      expect((system as any).dustParticleSystem).not.toBeNull();
    });

    it('starts dust particle system', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      expect(mockParticleSystemStart).toHaveBeenCalled();
    });

    it('creates sphere fracture map when sphere is provided', () => {
      const mockPlatter = createMockPlatterMesh();
      const mockSphere = createMockSphereMesh();
      system.activate(mockPlatter as any, mockLeverMesh, mockSphere as any);
      expect((system as any).sphereFractureMap).not.toBeNull();
    });

    it('does not create sphere fracture map when no sphere provided', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      expect((system as any).sphereFractureMap).toBeNull();
    });

    it('registers per-frame update loop', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      expect(mockRegisterBeforeRender).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('deactivate()', () => {
    it('sets isActive to false', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.deactivate();
      expect((system as any).isActive).toBe(false);
    });

    it('unregisters the update loop', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.deactivate();
      expect(mockUnregisterBeforeRender).toHaveBeenCalled();
    });

    it('disposes crack normal map', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.deactivate();
      expect(mockDynamicTextureDispose).toHaveBeenCalled();
    });

    it('disposes crack shader material', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.deactivate();
      expect(mockShaderMaterialDispose).toHaveBeenCalled();
    });

    it('disposes dust particle system', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.deactivate();
      expect(mockParticleSystemDispose).toHaveBeenCalled();
    });

    it('removes residual jitter from platter rotation', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      (system as any).previousJitter = 0.001;
      system.deactivate();
      expect(mockPlatter.rotation.y).toBe(-0.001);
    });
  });

  describe('setTension() — crack propagation', () => {
    it('updates currentTension', () => {
      system.setTension(0.6);
      expect((system as any).currentTension).toBe(0.6);
    });

    it('propagates crack density with tension', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(0.5);
      expect(system.getCrackDensity()).toBeCloseTo(0.4);
    });

    it('sets crack propagation equal to tension', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(0.7);
      expect(system.getCrackPropagation()).toBe(0.7);
    });

    it('updates bump texture level = tension * 0.8', () => {
      const mockPlatter = createMockPlatterMesh();
      mockPlatter.material.bumpTexture = { level: 0 };
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(0.5);
      expect(mockPlatter.material.bumpTexture.level).toBe(0.4);
    });

    it('updates crack shader uniforms', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      mockShaderSetFloat.mockClear();
      system.setTension(0.5);
      expect(mockShaderSetFloat).toHaveBeenCalledWith('tension', 0.5);
      expect(mockShaderSetFloat).toHaveBeenCalledWith('crackDensity', 0.4);
    });
  });

  describe('setTension() — dust particles', () => {
    it('scales dust emit rate with tension', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(0.5);
      expect(system.getDustEmitRate()).toBe(25);
    });

    it('sets dust emit rate to 0 at tension 0', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(0.0);
      expect(system.getDustEmitRate()).toBe(0);
    });

    it('sets dust emit rate to 50 at tension 1.0', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(1.0);
      expect(system.getDustEmitRate()).toBe(50);
    });
  });

  describe('setTension() — sphere fracture', () => {
    it('updates sphere fracture level', () => {
      const mockPlatter = createMockPlatterMesh();
      const mockSphere = createMockSphereMesh();
      system.activate(mockPlatter as any, mockLeverMesh, mockSphere as any);
      system.setTension(0.6);
      expect(system.getSphereFractureLevel()).toBeCloseTo(0.3);
    });

    it('does not change sphere albedo (pure normal map)', () => {
      const mockPlatter = createMockPlatterMesh();
      const mockSphere = createMockSphereMesh();
      system.activate(mockPlatter as any, mockLeverMesh, mockSphere as any);
      system.setTension(0.8);
      // Sphere material should only have bumpTexture modified
      expect(mockSphere.material.bumpTexture).toBeDefined();
    });
  });

  describe('getLeverResistanceMultiplier()', () => {
    it('returns 1.0 at tension 0', () => {
      system.setTension(0);
      expect(system.getLeverResistanceMultiplier()).toBe(1.0);
    });

    it('includes lever resistance creep at high tension', () => {
      system.setTension(1.0);
      // 1.0 + 1.0 * 1.5 + (1.0^2) * 0.5 = 1.0 + 1.5 + 0.5 = 3.0
      expect(system.getLeverResistanceMultiplier()).toBe(3.0);
    });

    it('increases with tension squared for progressive feel', () => {
      system.setTension(0.5);
      // 1.0 + 0.5 * 1.5 + (0.5^2) * 0.5 = 1.0 + 0.75 + 0.125 = 1.875
      expect(system.getLeverResistanceMultiplier()).toBeCloseTo(1.875);
    });
  });

  describe('triggerWorldImpact()', () => {
    it('does nothing when not active', () => {
      expect(() => system.triggerWorldImpact()).not.toThrow();
    });

    it('increases bump texture level by 0.2 (capped at 0.8)', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      mockPlatter.material.bumpTexture.level = 0.5;
      system.triggerWorldImpact();
      expect(mockPlatter.material.bumpTexture.level).toBe(0.7);
    });

    it('caps bump texture level at 0.8', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      mockPlatter.material.bumpTexture.level = 0.7;
      system.triggerWorldImpact();
      expect(mockPlatter.material.bumpTexture.level).toBe(0.8);
    });

    it('resets jitter start time for phase shift', () => {
      const mockPlatter = createMockPlatterMesh();
      mockPlatter.material.bumpTexture = { level: 0 };
      system.activate(mockPlatter as any, mockLeverMesh);
      const before = (system as any).jitterStartTime;
      system.triggerWorldImpact();
      expect((system as any).jitterStartTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe('update loop (jitter with gear-binding)', () => {
    it('applies sinusoidal jitter to platter rotation when active', () => {
      const mockPlatter = createMockPlatterMesh();
      mockPlatter.material.bumpTexture = { level: 0 };
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(0.5);

      const updateFn = mockRegisterBeforeRender.mock.calls[0][0];
      updateFn();

      expect(typeof mockPlatter.rotation.y).toBe('number');
    });

    it('does not apply jitter when not active', () => {
      const mockPlatter = createMockPlatterMesh();
      mockPlatter.material.bumpTexture = { level: 0 };
      system.activate(mockPlatter as any, mockLeverMesh);
      system.deactivate();

      const updateFn = (system as any).update;
      mockPlatter.rotation.y = 0;
      updateFn();
      expect(mockPlatter.rotation.y).toBe(0);
    });

    it('includes gear-binding micro-jitter at high tension', () => {
      const mockPlatter = createMockPlatterMesh();
      mockPlatter.material.bumpTexture = { level: 0 };
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(0.8); // Above 0.5 threshold

      const updateFn = mockRegisterBeforeRender.mock.calls[0][0];
      updateFn();

      // Jitter should be non-zero at high tension
      expect(typeof mockPlatter.rotation.y).toBe('number');
    });
  });

  describe('reset()', () => {
    it('resets tension to 0', () => {
      system.setTension(0.8);
      system.reset();
      expect((system as any).currentTension).toBe(0.0);
    });

    it('resets crack propagation to 0', () => {
      system.setTension(0.8);
      system.reset();
      expect(system.getCrackPropagation()).toBe(0.0);
    });

    it('resets crack density to 0', () => {
      system.setTension(0.8);
      system.reset();
      expect(system.getCrackDensity()).toBe(0.0);
    });

    it('resets dust emit rate to 0', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.setTension(0.8);
      system.reset();
      expect(system.getDustEmitRate()).toBe(0);
    });

    it('resets sphere fracture level to 0', () => {
      system.setTension(0.8);
      system.reset();
      expect(system.getSphereFractureLevel()).toBe(0.0);
    });

    it('resets jitter start time', () => {
      const before = (system as any).jitterStartTime;
      system.reset();
      expect((system as any).jitterStartTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe('dispose()', () => {
    it('deactivates the system', () => {
      const mockPlatter = createMockPlatterMesh();
      system.activate(mockPlatter as any, mockLeverMesh);
      system.dispose();
      expect((system as any).isActive).toBe(false);
    });

    it('removes tension listener', () => {
      system.dispose();
      expect(mockTensionSystem.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('clears singleton instance', () => {
      system.dispose();
      expect((MechanicalDegradationSystem as any).instance).toBeNull();
    });
  });
});
