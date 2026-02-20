/**
 * ArchetypeActivationSystem — Cognitive Dissonance v3.0
 *
 * Reads an archetype entity's slot parameters and configures primitive entities
 * accordingly. Singleton pattern (matches SystemOrchestrator, TensionSystem, etc.).
 *
 * Responsibilities:
 * - activate(archetypeType, seedHash, scene) — Creates archetype entity, configures all primitives
 * - deactivate() — Removes archetype entity, resets all primitives to inactive
 * - getActiveArchetype() — Returns current archetype component or null
 * - getActiveSlots() — Returns current slots or null
 *
 * Design: LEVEL_ARCHETYPES.md, components.ts, archetypeSlots.ts
 */

import type { Scene } from '@babylonjs/core/scene';
import type { GameEntity } from '../types';
import { deriveArchetypeSlots } from './archetypeSlots';
import type { ArchetypeComponent, ArchetypeSlots, ArchetypeType, PlatterRotationSlots } from './components';
import { ARCHETYPE_METADATA } from './components';
import { world } from './World';

export class ArchetypeActivationSystem {
  private static instance: ArchetypeActivationSystem | null = null;

  private archetypeEntity: GameEntity | null = null;

  private constructor() {}

  static getInstance(): ArchetypeActivationSystem {
    if (!ArchetypeActivationSystem.instance) {
      ArchetypeActivationSystem.instance = new ArchetypeActivationSystem();
    }
    return ArchetypeActivationSystem.instance;
  }

  /**
   * Activate an archetype: derive slots from seed, configure all primitive entities,
   * and add the archetype entity to the world.
   *
   * If an archetype is already active, deactivates it first.
   *
   * @param archetypeType - Which of the 25 archetypes to activate
   * @param seedHash - Seed hash for deterministic slot derivation
   * @param _scene - Babylon.js scene (reserved for future mesh operations)
   */
  activate(archetypeType: ArchetypeType, seedHash: number, _scene: Scene): void {
    // Dispose previous archetype if one is active
    if (this.archetypeEntity) {
      this.deactivate();
    }

    // Derive slot parameters from seed
    const slots = deriveArchetypeSlots(archetypeType, seedHash);

    // Look up pacing/cognitive load from static metadata
    const metadata = ARCHETYPE_METADATA[archetypeType];

    // Build archetype component
    const archetypeComponent: ArchetypeComponent = {
      type: archetypeType,
      slots,
      seedHash,
      pacing: metadata.pacing,
      cognitiveLoad: metadata.cognitiveLoad,
    };

    // Configure keycap entities based on slots.keycapSubset
    this.configureKeycaps(slots);

    // Configure lever entity
    this.configureLever(slots);

    // Configure platter entity
    this.configurePlatter(slots, archetypeType);

    // Configure sphere entity
    this.configureSphere(slots);

    // Configure crystalline cube spawn flag
    this.configureCrystallineCube(slots);

    // Configure morph cube spawn flag
    this.configureMorphCube(slots);

    // Add the archetype entity to the world
    this.archetypeEntity = world.add({
      archetype: archetypeComponent,
    } as GameEntity);
  }

  /**
   * Deactivate the current archetype: remove archetype entity from the world
   * and reset all primitive entities to inactive state.
   */
  deactivate(): void {
    // Remove archetype entity from world
    if (this.archetypeEntity) {
      world.remove(this.archetypeEntity);
      this.archetypeEntity = null;
    }

    // Reset all keycaps to inactive
    const keycapEntities = world.with('keycap');
    for (const entity of keycapEntities) {
      if (entity.keycap) {
        entity.keycap.active = false;
        entity.keycap.emerged = false;
        entity.keycap.glowIntensity = 0;
        entity.keycap.holdProgress = 0;
      }
    }

    // Reset lever to inactive
    const leverEntities = world.with('lever');
    for (const entity of leverEntities) {
      if (entity.lever) {
        entity.lever.active = false;
        entity.lever.position = 0;
        entity.lever.resistance = 0;
        entity.lever.locked = false;
      }
    }

    // Reset platter to inactive
    const platterEntities = world.with('platter');
    for (const entity of platterEntities) {
      if (entity.platter) {
        entity.platter.active = false;
        entity.platter.rotationRPM = 0;
        entity.platter.locked = false;
      }
    }

    // Reset sphere to inactive
    const sphereEntities = world.with('sphere');
    for (const entity of sphereEntities) {
      if (entity.sphere) {
        entity.sphere.active = false;
        entity.sphere.angularSpeed = 0;
        entity.sphere.driftEnabled = false;
        entity.sphere.driftSpeed = 0;
      }
    }

    // Reset crystalline cube to inactive
    const crystallineEntities = world.with('crystallineCube');
    for (const entity of crystallineEntities) {
      if (entity.crystallineCube) {
        entity.crystallineCube.active = false;
      }
    }

    // Reset morph cube to inactive
    const morphEntities = world.with('morphCube');
    for (const entity of morphEntities) {
      if (entity.morphCube) {
        entity.morphCube.active = false;
      }
    }
  }

  /**
   * Returns the active archetype component, or null if no archetype is active.
   */
  getActiveArchetype(): ArchetypeComponent | null {
    return this.archetypeEntity?.archetype ?? null;
  }

  /**
   * Returns the active archetype's derived slot parameters, or null if no archetype is active.
   */
  getActiveSlots(): ArchetypeSlots | null {
    return this.archetypeEntity?.archetype?.slots ?? null;
  }

  /**
   * Dispose the system (for cleanup).
   */
  dispose(): void {
    if (this.archetypeEntity) {
      this.deactivate();
    }
    this.archetypeEntity = null;
  }

  // ── Private configuration helpers ──

  /**
   * Set each keycap entity's active flag based on whether its letter
   * is in the archetype's keycapSubset.
   */
  private configureKeycaps(slots: ArchetypeSlots): void {
    const keycapEntities = world.with('keycap');
    for (const entity of keycapEntities) {
      if (entity.keycap) {
        entity.keycap.active = slots.keycapSubset.includes(entity.keycap.letter);
      }
    }
  }

  /**
   * Set lever entity's active state from slots.
   */
  private configureLever(slots: ArchetypeSlots): void {
    const leverEntities = world.with('lever');
    for (const entity of leverEntities) {
      if (entity.lever) {
        entity.lever.active = slots.leverActive;
      }
    }
  }

  /**
   * Set platter entity's active state and rotationRPM from slots.
   * rotationRPM is only present on PlatterRotationSlots.
   */
  private configurePlatter(slots: ArchetypeSlots, archetypeType: ArchetypeType): void {
    const platterEntities = world.with('platter');
    for (const entity of platterEntities) {
      if (entity.platter) {
        entity.platter.active = slots.platterActive;
        // Set rotationRPM if the archetype provides it
        if ('rotationRPM' in slots && typeof slots.rotationRPM === 'number') {
          entity.platter.rotationRPM = slots.rotationRPM;
        }
        // Set direction if the archetype provides it
        if ('direction' in slots) {
          const slotsWithDirection = slots as PlatterRotationSlots;
          entity.platter.direction = slotsWithDirection.direction;
        }
      }
    }
  }

  /**
   * Set sphere entity's active state from slots.
   */
  private configureSphere(slots: ArchetypeSlots): void {
    const sphereEntities = world.with('sphere');
    for (const entity of sphereEntities) {
      if (entity.sphere) {
        entity.sphere.active = slots.sphereActive;
      }
    }
  }

  /**
   * Set crystalline cube spawn flag from slots.
   * Just sets the active flag — GameBootstrap handles actual mesh creation.
   */
  private configureCrystallineCube(slots: ArchetypeSlots): void {
    const crystallineEntities = world.with('crystallineCube');
    for (const entity of crystallineEntities) {
      if (entity.crystallineCube) {
        entity.crystallineCube.active = slots.crystallineCubeActive;
      }
    }
  }

  /**
   * Set morph cube spawn flag from slots.
   * Just sets the active flag — GameBootstrap handles actual mesh creation.
   */
  private configureMorphCube(slots: ArchetypeSlots): void {
    const morphEntities = world.with('morphCube');
    for (const entity of morphEntities) {
      if (entity.morphCube) {
        entity.morphCube.active = slots.morphCubeActive;
      }
    }
  }
}
