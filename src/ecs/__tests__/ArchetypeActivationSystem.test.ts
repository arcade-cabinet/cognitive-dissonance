import type { Scene } from '@babylonjs/core/scene';
import type { GameEntity } from '../../types';
import { ArchetypeActivationSystem } from '../ArchetypeActivationSystem';
import { deriveArchetypeSlots } from '../archetypeSlots';
import type { ArchetypeType } from '../components';
import { world } from '../World';

// Mock scene (unused by system currently, reserved for future mesh ops)
const mockScene = {} as Scene;

// Helper to create a fresh ArchetypeActivationSystem instance
function createSystem(): ArchetypeActivationSystem {
  (ArchetypeActivationSystem as any).instance = null;
  return ArchetypeActivationSystem.getInstance();
}

// Helper to add keycap entities to the world
function addKeycapEntities(letters: string[]): GameEntity[] {
  return letters.map((letter) =>
    world.add({
      keycap: {
        letter,
        active: false,
        emerged: false,
        glowIntensity: 0,
        holdProgress: 0,
      },
    } as GameEntity),
  );
}

// Helper to add a lever entity
function addLeverEntity(): GameEntity {
  return world.add({
    lever: {
      position: 0,
      active: false,
      resistance: 0,
      locked: false,
    },
  } as GameEntity);
}

// Helper to add a platter entity
function addPlatterEntity(): GameEntity {
  return world.add({
    platter: {
      rotationRPM: 0,
      direction: 1,
      active: false,
      locked: false,
    },
  } as GameEntity);
}

// Helper to add a sphere entity
function addSphereEntity(): GameEntity {
  return world.add({
    sphere: {
      active: false,
      angularSpeed: 0,
      driftEnabled: false,
      driftSpeed: 0,
    },
  } as GameEntity);
}

// Helper to add a crystalline cube entity
function addCrystallineCubeEntity(): GameEntity {
  return world.add({
    crystallineCube: {
      active: false,
      role: 'reference',
      health: 1.0,
      facetCount: 6,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orbitRadius: 0.5,
      orbitSpeed: 0,
      altitude: 0,
    },
  } as GameEntity);
}

// Helper to add a morph cube entity
function addMorphCubeEntity(): GameEntity {
  return world.add({
    morphCube: {
      active: false,
      role: 'mirror',
      morphProgress: 0,
      currentTrait: 'NeonRaymarcher',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orbitRadius: 0.5,
      orbitSpeed: 0,
      altitude: 0,
    },
  } as GameEntity);
}

describe('ArchetypeActivationSystem', () => {
  let system: ArchetypeActivationSystem;

  beforeEach(() => {
    system = createSystem();
  });

  afterEach(() => {
    system.dispose();
    // Clean up all entities
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on multiple getInstance calls', () => {
      const instance1 = ArchetypeActivationSystem.getInstance();
      const instance2 = ArchetypeActivationSystem.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('returns a new instance after reset', () => {
      const instance1 = ArchetypeActivationSystem.getInstance();
      (ArchetypeActivationSystem as any).instance = null;
      const instance2 = ArchetypeActivationSystem.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('activate', () => {
    it('creates archetype entity with correct type and slots', () => {
      const archetypeType: ArchetypeType = 'PlatterRotation';
      const seedHash = 42;

      system.activate(archetypeType, seedHash, mockScene);

      const archetype = system.getActiveArchetype();
      expect(archetype).not.toBeNull();
      expect(archetype!.type).toBe('PlatterRotation');
      expect(archetype!.seedHash).toBe(42);
      expect(archetype!.pacing).toBe('steady');
      expect(archetype!.cognitiveLoad).toBe('low-med');
    });

    it('derives slots deterministically from seed', () => {
      const archetypeType: ArchetypeType = 'KeySequence';
      const seedHash = 12345;

      system.activate(archetypeType, seedHash, mockScene);

      const slots = system.getActiveSlots();
      const expectedSlots = deriveArchetypeSlots('KeySequence', 12345);
      expect(slots).toEqual(expectedSlots);
    });

    it('sets keycap active/inactive based on slots.keycapSubset', () => {
      const allLetters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];
      const keycapEntities = addKeycapEntities(allLetters);

      const archetypeType: ArchetypeType = 'PlatterRotation';
      const seedHash = 42;
      system.activate(archetypeType, seedHash, mockScene);

      const slots = deriveArchetypeSlots('PlatterRotation', 42);
      const activeSubset = slots.keycapSubset;

      for (const entity of keycapEntities) {
        if (entity.keycap) {
          const shouldBeActive = activeSubset.includes(entity.keycap.letter);
          expect(entity.keycap.active).toBe(shouldBeActive);
        }
      }
    });

    it('configures lever active state from slots', () => {
      const leverEntity = addLeverEntity();

      // LeverTension archetype always has lever active
      system.activate('LeverTension', 42, mockScene);

      expect(leverEntity.lever!.active).toBe(true);
    });

    it('configures lever inactive for archetypes that do not use lever', () => {
      const leverEntity = addLeverEntity();

      // KeySequence archetype does not use lever
      system.activate('KeySequence', 42, mockScene);

      const slots = deriveArchetypeSlots('KeySequence', 42);
      expect(leverEntity.lever!.active).toBe(slots.leverActive);
    });

    it('configures platter active state from slots', () => {
      const platterEntity = addPlatterEntity();

      // PlatterRotation archetype always has platter active
      system.activate('PlatterRotation', 42, mockScene);

      expect(platterEntity.platter!.active).toBe(true);
    });

    it('configures platter rotationRPM from PlatterRotation slots', () => {
      const platterEntity = addPlatterEntity();

      system.activate('PlatterRotation', 42, mockScene);

      const slots = deriveArchetypeSlots('PlatterRotation', 42);
      expect(platterEntity.platter!.rotationRPM).toBe((slots as any).rotationRPM);
    });

    it('configures sphere active state from slots', () => {
      const sphereEntity = addSphereEntity();

      // FacetAlign archetype has sphere active
      system.activate('FacetAlign', 42, mockScene);

      expect(sphereEntity.sphere!.active).toBe(true);
    });

    it('configures sphere inactive for archetypes that do not use sphere', () => {
      const sphereEntity = addSphereEntity();

      // LeverTension archetype does not use sphere
      system.activate('LeverTension', 42, mockScene);

      expect(sphereEntity.sphere!.active).toBe(false);
    });

    it('configures crystalline cube active flag from slots', () => {
      const crystallineEntity = addCrystallineCubeEntity();

      // CrystallineCubeBoss archetype has crystalline cube active
      system.activate('CrystallineCubeBoss', 42, mockScene);

      expect(crystallineEntity.crystallineCube!.active).toBe(true);
    });

    it('configures morph cube active flag from slots', () => {
      const morphEntity = addMorphCubeEntity();

      // MorphMirror archetype has morph cube active
      system.activate('MorphMirror', 42, mockScene);

      expect(morphEntity.morphCube!.active).toBe(true);
    });

    it('disposes previous archetype before creating new one', () => {
      system.activate('PlatterRotation', 42, mockScene);

      const firstArchetype = system.getActiveArchetype();
      expect(firstArchetype!.type).toBe('PlatterRotation');

      system.activate('LeverTension', 99, mockScene);

      const secondArchetype = system.getActiveArchetype();
      expect(secondArchetype!.type).toBe('LeverTension');

      // Only one archetype entity should exist in the world
      const archetypeEntities = world.with('archetype');
      expect(archetypeEntities.entities.length).toBe(1);
    });
  });

  describe('deactivate', () => {
    it('removes archetype entity from world', () => {
      system.activate('PlatterRotation', 42, mockScene);
      expect(system.getActiveArchetype()).not.toBeNull();

      system.deactivate();

      expect(system.getActiveArchetype()).toBeNull();
      const archetypeEntities = world.with('archetype');
      expect(archetypeEntities.entities.length).toBe(0);
    });

    it('resets all keycaps to inactive', () => {
      const keycapEntities = addKeycapEntities(['Q', 'W', 'E', 'R']);

      system.activate('PlatterRotation', 42, mockScene);

      // Some keycaps should be active after activation
      system.deactivate();

      for (const entity of keycapEntities) {
        expect(entity.keycap!.active).toBe(false);
        expect(entity.keycap!.emerged).toBe(false);
        expect(entity.keycap!.glowIntensity).toBe(0);
        expect(entity.keycap!.holdProgress).toBe(0);
      }
    });

    it('resets lever to inactive', () => {
      const leverEntity = addLeverEntity();

      system.activate('LeverTension', 42, mockScene);
      expect(leverEntity.lever!.active).toBe(true);

      system.deactivate();

      expect(leverEntity.lever!.active).toBe(false);
      expect(leverEntity.lever!.position).toBe(0);
      expect(leverEntity.lever!.resistance).toBe(0);
      expect(leverEntity.lever!.locked).toBe(false);
    });

    it('resets platter to inactive', () => {
      const platterEntity = addPlatterEntity();

      system.activate('PlatterRotation', 42, mockScene);
      expect(platterEntity.platter!.active).toBe(true);

      system.deactivate();

      expect(platterEntity.platter!.active).toBe(false);
      expect(platterEntity.platter!.rotationRPM).toBe(0);
      expect(platterEntity.platter!.locked).toBe(false);
    });

    it('resets sphere to inactive', () => {
      const sphereEntity = addSphereEntity();

      system.activate('FacetAlign', 42, mockScene);
      expect(sphereEntity.sphere!.active).toBe(true);

      system.deactivate();

      expect(sphereEntity.sphere!.active).toBe(false);
      expect(sphereEntity.sphere!.angularSpeed).toBe(0);
      expect(sphereEntity.sphere!.driftEnabled).toBe(false);
      expect(sphereEntity.sphere!.driftSpeed).toBe(0);
    });

    it('resets crystalline cube to inactive', () => {
      const crystallineEntity = addCrystallineCubeEntity();

      system.activate('CrystallineCubeBoss', 42, mockScene);
      expect(crystallineEntity.crystallineCube!.active).toBe(true);

      system.deactivate();

      expect(crystallineEntity.crystallineCube!.active).toBe(false);
    });

    it('resets morph cube to inactive', () => {
      const morphEntity = addMorphCubeEntity();

      system.activate('MorphMirror', 42, mockScene);
      expect(morphEntity.morphCube!.active).toBe(true);

      system.deactivate();

      expect(morphEntity.morphCube!.active).toBe(false);
    });

    it('is safe to call when no archetype is active', () => {
      expect(() => system.deactivate()).not.toThrow();
    });
  });

  describe('getActiveArchetype', () => {
    it('returns null when no archetype is active', () => {
      expect(system.getActiveArchetype()).toBeNull();
    });

    it('returns archetype component when active', () => {
      system.activate('ZenDrift', 777, mockScene);

      const archetype = system.getActiveArchetype();
      expect(archetype).not.toBeNull();
      expect(archetype!.type).toBe('ZenDrift');
      expect(archetype!.seedHash).toBe(777);
      expect(archetype!.pacing).toBe('meditative');
      expect(archetype!.cognitiveLoad).toBe('low');
    });
  });

  describe('getActiveSlots', () => {
    it('returns null when no archetype is active', () => {
      expect(system.getActiveSlots()).toBeNull();
    });

    it('returns derived slots when active', () => {
      system.activate('WhackAMole', 555, mockScene);

      const slots = system.getActiveSlots();
      expect(slots).not.toBeNull();
      expect(slots!.keycapSubset.length).toBeGreaterThan(0);
      expect(slots!.morphCubeActive).toBe(true);
    });
  });

  describe('dispose', () => {
    it('cleans up archetype entity', () => {
      system.activate('PlatterRotation', 42, mockScene);
      expect(system.getActiveArchetype()).not.toBeNull();

      system.dispose();

      expect(system.getActiveArchetype()).toBeNull();
    });

    it('is safe to call multiple times', () => {
      system.activate('PlatterRotation', 42, mockScene);
      expect(() => {
        system.dispose();
        system.dispose();
      }).not.toThrow();
    });
  });

  describe('Full lifecycle', () => {
    it('supports activate -> deactivate -> activate cycle', () => {
      const leverEntity = addLeverEntity();
      const sphereEntity = addSphereEntity();

      // First activation: LeverTension (lever active, sphere inactive)
      system.activate('LeverTension', 42, mockScene);
      expect(leverEntity.lever!.active).toBe(true);
      expect(sphereEntity.sphere!.active).toBe(false);

      // Deactivate
      system.deactivate();
      expect(leverEntity.lever!.active).toBe(false);
      expect(sphereEntity.sphere!.active).toBe(false);

      // Second activation: FacetAlign (sphere active, lever inactive)
      system.activate('FacetAlign', 99, mockScene);
      expect(sphereEntity.sphere!.active).toBe(true);
      expect(leverEntity.lever!.active).toBe(false);
    });
  });
});
