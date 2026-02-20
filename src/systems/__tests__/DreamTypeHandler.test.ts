/**
 * Tests for DreamTypeHandler
 *
 * Covers: initialize(), activateDream(), getCurrentHandler(), getArchetypeName(),
 *         update(), dispose(), and all four archetype handlers
 */

import * as fc from 'fast-check';
import type { GameEntity } from '../../types';

// ── Mock GSAP ──
jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    to: jest.fn(),
    killTweensOf: jest.fn(),
    timeline: jest.fn(() => ({
      kill: jest.fn(),
      to: jest.fn().mockReturnThis(),
    })),
    registerPlugin: jest.fn(),
  },
}));

jest.mock('gsap/CustomEase', () => ({
  __esModule: true,
  CustomEase: { create: jest.fn() },
}));

jest.mock('gsap/MotionPathPlugin', () => ({
  __esModule: true,
  MotionPathPlugin: {},
}));

// ── Mock Babylon.js ──
jest.mock('@babylonjs/core/Materials/PBR/pbrMaterial', () => ({
  PBRMaterial: jest.fn().mockImplementation(() => ({
    metallic: 0,
    roughness: 0,
    albedoColor: null,
    emissiveColor: null,
    alpha: 1,
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: Object.assign(
    jest.fn((x: number, y: number, z: number) => ({
      x,
      y,
      z,
      normalize: jest.fn().mockReturnThis(),
      subtract: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0, normalize: jest.fn().mockReturnThis() }),
    })),
    {
      Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
      Dot: jest.fn(() => 1),
    },
  ),
}));

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreatePlane: jest.fn(() => ({
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      rotation: { x: 0, y: 0, z: 0 },
      material: null,
      dispose: jest.fn(),
    })),
  },
}));

// Mock MechanicalAnimationSystem (used by CrystallineCubeBossDreamHandler)
jest.mock('../MechanicalAnimationSystem', () => ({
  MechanicalAnimationSystem: {
    getInstance: jest.fn(() => ({
      retractKeycap: jest.fn(),
    })),
  },
}));

import { DreamTypeHandler } from '../DreamTypeHandler';
import { getHandlerFactory, getRegisteredTypes, hasHandler } from '../dream-handlers';

// ── Helpers ──

function createSystem(): DreamTypeHandler {
  (DreamTypeHandler as any).instance = null;
  return DreamTypeHandler.getInstance();
}

function createMockScene() {
  return {
    getMeshByName: jest.fn(() => ({
      position: { x: 0, y: 0, z: 0, set: jest.fn(), clone: jest.fn() },
      rotation: { x: 0, y: 0, z: 0 },
      material: { alpha: 1 },
      clone: jest.fn(() => ({
        position: { x: 0, y: 0, z: 0, set: jest.fn() },
        material: { alpha: 1 },
        dispose: jest.fn(),
      })),
      dispose: jest.fn(),
    })),
    metadata: { currentTension: 0 },
    activeCamera: {
      getForwardRay: jest.fn(() => ({
        direction: { x: 0, y: 0, z: 1 },
      })),
    },
  } as any;
}

describe('DreamTypeHandler', () => {
  let system: DreamTypeHandler;
  let mockScene: any;

  beforeEach(() => {
    jest.clearAllMocks();
    system = createSystem();
    mockScene = createMockScene();
    system.initialize(mockScene);
  });

  afterEach(() => {
    system.dispose();
  });

  // ── Singleton ──

  it('returns the same instance on repeated calls', () => {
    const a = DreamTypeHandler.getInstance();
    const b = DreamTypeHandler.getInstance();
    expect(a).toBe(b);
  });

  // ── initialize / dispose ──

  it('stores scene reference on initialize', () => {
    expect((system as any).scene).toBe(mockScene);
  });

  it('dispose clears scene and handler', () => {
    system.dispose();
    expect((system as any).scene).toBeNull();
    expect((system as any).currentHandler).toBeNull();
    expect((system as any).currentEntity).toBeNull();
  });

  // ── activateDream — PlatterRotationDream ──

  it('activates PlatterRotationDream for platterCore + rotationAxis entity', () => {
    const entity: GameEntity = { platterCore: true, rotationAxis: true, rotationRPM: 5 };
    system.activateDream(entity);
    expect(system.getCurrentHandler()).not.toBeNull();
    expect(system.getArchetypeName()).toBe('PlatterRotationDream');
  });

  // ── activateDream — LeverTensionDream ──

  it('activates LeverTensionDream for leverCore entity', () => {
    const entity: GameEntity = { leverCore: true };
    system.activateDream(entity);
    expect(system.getCurrentHandler()).not.toBeNull();
    expect(system.getArchetypeName()).toBe('LeverTensionDream');
  });

  // ── activateDream — KeySequenceDream ──

  it('activates KeySequenceDream for keycapPatterns entity', () => {
    const entity: GameEntity = { keycapPatterns: [['Q', 'W'], ['E', 'R']] };
    system.activateDream(entity);
    expect(system.getCurrentHandler()).not.toBeNull();
    expect(system.getArchetypeName()).toBe('KeySequenceDream');
  });

  // ── activateDream — CrystallineCubeBossDream ──

  it('activates CrystallineCubeBossDream for boss + cubeCrystalline entity', () => {
    const entity: GameEntity = { boss: true, cubeCrystalline: true, slamCycles: 3 };
    system.activateDream(entity);
    expect(system.getCurrentHandler()).not.toBeNull();
    expect(system.getArchetypeName()).toBe('CrystallineCubeBossDream');
  });

  // ── activateDream — unknown entity ──

  it('logs error for unknown archetype and does not set handler', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const entity: GameEntity = {};
    system.activateDream(entity);
    expect(system.getCurrentHandler()).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown archetype'),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  // ── activateDream — scene not initialized ──

  it('logs error when activating without scene', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const noSceneSystem = createSystem();
    // Do NOT call initialize
    noSceneSystem.activateDream({ platterCore: true, rotationAxis: true });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot activate dream'),
    );
    expect(noSceneSystem.getCurrentHandler()).toBeNull();
    errorSpy.mockRestore();
    noSceneSystem.dispose();
  });

  // ── activateDream disposes previous handler ──

  it('disposes previous handler when activating a new dream', () => {
    const entity1: GameEntity = { platterCore: true, rotationAxis: true };
    system.activateDream(entity1);
    const handler1 = system.getCurrentHandler();
    const disposeSpy = jest.spyOn(handler1!, 'dispose');

    const entity2: GameEntity = { leverCore: true };
    system.activateDream(entity2);
    expect(disposeSpy).toHaveBeenCalled();
    expect(system.getArchetypeName()).toBe('LeverTensionDream');
  });

  // ── update delegates to handler ──

  it('delegates update to the active handler', () => {
    const entity: GameEntity = { keycapPatterns: [['Q']] };
    system.activateDream(entity);
    const handler = system.getCurrentHandler()!;
    const updateSpy = jest.spyOn(handler, 'update');
    system.update(0.016);
    expect(updateSpy).toHaveBeenCalledWith(0.016);
  });

  it('update is a no-op when no handler is active', () => {
    // Should not throw
    expect(() => system.update(0.016)).not.toThrow();
  });

  // ── getArchetypeName ──

  it('returns "None" when no entity is active', () => {
    expect(system.getArchetypeName()).toBe('None');
  });

  // ── v3.0 Registry dispatch (archetypeType parameter) ──

  describe('v3.0 registry dispatch', () => {
    it('activates PlatterRotation via archetypeType parameter', () => {
      const entity: GameEntity = { level: true };
      system.activateDream(entity, 'PlatterRotation');
      expect(system.getCurrentHandler()).not.toBeNull();
      expect(system.getArchetypeName()).toBe('PlatterRotationDream');
    });

    it('activates LeverTension via archetypeType parameter', () => {
      const entity: GameEntity = { level: true };
      system.activateDream(entity, 'LeverTension');
      expect(system.getCurrentHandler()).not.toBeNull();
      expect(system.getArchetypeName()).toBe('LeverTensionDream');
    });

    it('activates KeySequence via archetypeType parameter', () => {
      const entity: GameEntity = { level: true };
      system.activateDream(entity, 'KeySequence');
      expect(system.getCurrentHandler()).not.toBeNull();
      expect(system.getArchetypeName()).toBe('KeySequenceDream');
    });

    it('activates CrystallineCubeBoss via archetypeType parameter', () => {
      const entity: GameEntity = { level: true };
      system.activateDream(entity, 'CrystallineCubeBoss');
      expect(system.getCurrentHandler()).not.toBeNull();
      expect(system.getArchetypeName()).toBe('CrystallineCubeBossDream');
    });

    it('warns for unregistered archetype type', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const entity: GameEntity = { level: true };
      system.activateDream(entity, 'NonExistentArchetype' as any);
      expect(system.getCurrentHandler()).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No handler registered for NonExistentArchetype'),
      );
      warnSpy.mockRestore();
    });

    it('archetypeType takes precedence over property flags', () => {
      // Entity has platterCore flags but archetypeType says LeverTension
      const entity: GameEntity = { platterCore: true, rotationAxis: true };
      system.activateDream(entity, 'LeverTension');
      expect(system.getArchetypeName()).toBe('LeverTensionDream');
    });
  });

  // ── Handler Registry ──

  describe('Handler Registry', () => {
    it('has all 4 handlers registered', () => {
      expect(hasHandler('PlatterRotation')).toBe(true);
      expect(hasHandler('LeverTension')).toBe(true);
      expect(hasHandler('KeySequence')).toBe(true);
      expect(hasHandler('CrystallineCubeBoss')).toBe(true);
    });

    it('returns null for unregistered types', () => {
      // Use a type that doesn't exist in any handler
      expect(getHandlerFactory('NonExistentType' as any)).toBeNull();
      expect(hasHandler('NonExistentType' as any)).toBe(false);
    });

    it('getRegisteredTypes returns all 25 archetype handlers', () => {
      const types = getRegisteredTypes();
      // Original 4
      expect(types).toContain('PlatterRotation');
      expect(types).toContain('LeverTension');
      expect(types).toContain('KeySequence');
      expect(types).toContain('CrystallineCubeBoss');
      // Keycap/Rhythm group
      expect(types).toContain('WhackAMole');
      expect(types).toContain('ChordHold');
      expect(types).toContain('RhythmGate');
      expect(types).toContain('GhostChase');
      expect(types).toContain('TurntableScratch');
      // Sphere-focused group
      expect(types).toContain('FacetAlign');
      expect(types).toContain('MorphMirror');
      expect(types).toContain('SphereSculpt');
      expect(types).toContain('ZenDrift');
      expect(types).toContain('Labyrinth');
      // Combined-surface group
      expect(types).toContain('Conductor');
      expect(types).toContain('LockPick');
      expect(types).toContain('Resonance');
      expect(types).toContain('TendrilDodge');
      expect(types).toContain('OrbitalCatch');
      // Cube/Meta group
      expect(types).toContain('CubeJuggle');
      expect(types).toContain('CubeStack');
      expect(types).toContain('Pinball');
      expect(types).toContain('Escalation');
      expect(types).toContain('Survival');
      expect(types).toContain('RefractionAim');
      expect(types).toHaveLength(25);
    });

    it('factory creates correct handler instance', () => {
      const Factory = getHandlerFactory('PlatterRotation');
      expect(Factory).not.toBeNull();
      const handler = new Factory!();
      expect(handler).toHaveProperty('activate');
      expect(handler).toHaveProperty('update');
      expect(handler).toHaveProperty('dispose');
    });
  });

  // ── Property-based: archetype selection deterministic ──

  describe('Property-Based Tests', () => {
    it('archetype selection is deterministic for the same entity shape', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { platterCore: true, rotationAxis: true } as GameEntity,
            { leverCore: true } as GameEntity,
            { keycapPatterns: [['Q', 'W']] } as GameEntity,
            { boss: true, cubeCrystalline: true } as GameEntity,
          ),
          (entity) => {
            const s1 = createSystem();
            s1.initialize(mockScene);
            s1.activateDream(entity);
            const name1 = s1.getArchetypeName();

            const s2 = createSystem();
            s2.initialize(mockScene);
            s2.activateDream(entity);
            const name2 = s2.getArchetypeName();

            expect(name1).toBe(name2);
            s1.dispose();
            s2.dispose();
          },
        ),
      );
    });

    it('v3.0 registry dispatch is deterministic for the same archetype type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'PlatterRotation' as const,
            'LeverTension' as const,
            'KeySequence' as const,
            'CrystallineCubeBoss' as const,
          ),
          (archetypeType) => {
            const s1 = createSystem();
            s1.initialize(mockScene);
            s1.activateDream({ level: true }, archetypeType);
            const name1 = s1.getArchetypeName();

            const s2 = createSystem();
            s2.initialize(mockScene);
            s2.activateDream({ level: true }, archetypeType);
            const name2 = s2.getArchetypeName();

            expect(name1).toBe(name2);
            s1.dispose();
            s2.dispose();
          },
        ),
      );
    });
  });
});
