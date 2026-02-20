/**
 * DreamTypeHandler — Per-archetype gameplay handler system
 *
 * Manages the active Level_Archetype gameplay loop. Each archetype fundamentally changes
 * how the platter/keycap/lever architecture behaves. Registered as the last gameplay system
 * in the update loop.
 *
 * v3.0: Refactored to use a handler registry pattern (src/systems/dream-handlers/).
 * Each handler self-registers via registerHandler() on import. Dispatch is done
 * via getHandlerFactory() lookup instead of inline property-flag conditionals.
 *
 * Source: ARCH v3.4 CognitiveDissonanceRoot.tsx + design.md Level Archetype Gameplay Mechanics
 *
 * Validates: Requirement 30 (Level Archetype Gameplay Mechanics)
 */

import type { Scene } from '@babylonjs/core/scene';
import type { ArchetypeType } from '../ecs/components';
import type { GameEntity } from '../types';
import { type DreamHandler, getHandlerFactory } from './dream-handlers';
// Side-effect imports to trigger self-registration (all 25 archetypes)
// Original 4
import './dream-handlers/PlatterRotationHandler';
import './dream-handlers/LeverTensionHandler';
import './dream-handlers/KeySequenceHandler';
import './dream-handlers/CrystallineCubeBossHandler';
// Keycap/Rhythm group
import './dream-handlers/WhackAMoleHandler';
import './dream-handlers/ChordHoldHandler';
import './dream-handlers/RhythmGateHandler';
import './dream-handlers/GhostChaseHandler';
import './dream-handlers/TurntableScratchHandler';
// Sphere-focused group
import './dream-handlers/FacetAlignHandler';
import './dream-handlers/MorphMirrorHandler';
import './dream-handlers/SphereSculptHandler';
import './dream-handlers/ZenDriftHandler';
import './dream-handlers/LabyrinthHandler';
// Combined-surface group
import './dream-handlers/ConductorHandler';
import './dream-handlers/LockPickHandler';
import './dream-handlers/ResonanceHandler';
import './dream-handlers/TendrilDodgeHandler';
import './dream-handlers/OrbitalCatchHandler';
// Cube/Meta group
import './dream-handlers/CubeJuggleHandler';
import './dream-handlers/CubeStackHandler';
import './dream-handlers/PinballHandler';
import './dream-handlers/EscalationHandler';
import './dream-handlers/SurvivalHandler';
import './dream-handlers/RefractionAimHandler';

/**
 * DreamTypeHandler singleton
 *
 * Manages the active Level_Archetype gameplay loop. Reads the active entity from ECS World
 * and delegates per-frame logic to the appropriate handler.
 */
export class DreamTypeHandler {
  private static instance: DreamTypeHandler | null = null;

  private scene: Scene | null = null;
  private currentHandler: DreamHandler | null = null;
  private currentEntity: GameEntity | null = null;
  private currentArchetypeType: ArchetypeType | null = null;

  private constructor() {}

  static getInstance(): DreamTypeHandler {
    if (!DreamTypeHandler.instance) {
      DreamTypeHandler.instance = new DreamTypeHandler();
    }
    return DreamTypeHandler.instance;
  }

  /**
   * Initialize with scene reference
   */
  initialize(scene: Scene): void {
    this.scene = scene;
  }

  /**
   * Activate a new Dream archetype
   * Disposes previous handler, preserves tension state, activates new handler.
   *
   * @param entity - GameEntity with archetype property flags
   * @param archetypeType - Optional ArchetypeType for v3.0 registry dispatch
   */
  activateDream(entity: GameEntity, archetypeType?: ArchetypeType): void {
    if (!this.scene) {
      console.error('[DreamTypeHandler] Cannot activate dream — scene not initialized');
      return;
    }

    // Dispose previous handler
    if (this.currentHandler) {
      this.currentHandler.dispose();
      this.currentHandler = null;
    }

    if (archetypeType) {
      // v3.0 registry dispatch
      const Factory = getHandlerFactory(archetypeType);
      if (Factory) {
        this.currentHandler = new Factory();
      } else {
        console.warn(`[DreamTypeHandler] No handler registered for ${archetypeType}`);
        return;
      }
      this.currentArchetypeType = archetypeType;
    } else {
      // v2.0 backward compat: property-flag dispatch via registry
      if (entity.platterCore && entity.rotationAxis) {
        const Factory = getHandlerFactory('PlatterRotation');
        this.currentHandler = Factory ? new Factory() : null;
        this.currentArchetypeType = 'PlatterRotation';
      } else if (entity.leverCore) {
        const Factory = getHandlerFactory('LeverTension');
        this.currentHandler = Factory ? new Factory() : null;
        this.currentArchetypeType = 'LeverTension';
      } else if (entity.keycapPatterns) {
        const Factory = getHandlerFactory('KeySequence');
        this.currentHandler = Factory ? new Factory() : null;
        this.currentArchetypeType = 'KeySequence';
      } else if (entity.boss && entity.cubeCrystalline) {
        const Factory = getHandlerFactory('CrystallineCubeBoss');
        this.currentHandler = Factory ? new Factory() : null;
        this.currentArchetypeType = 'CrystallineCubeBoss';
      } else {
        console.error('[DreamTypeHandler] Unknown archetype for entity:', entity);
        this.currentArchetypeType = null;
        return;
      }
    }

    // Activate handler
    if (this.currentHandler) {
      this.currentHandler.activate(entity, this.scene);
      this.currentEntity = entity;
      console.log('[DreamTypeHandler] Activated dream archetype:', this.getArchetypeName());
    }
  }

  /**
   * Per-frame update — delegates to active handler
   */
  update(dt: number): void {
    if (this.currentHandler) {
      this.currentHandler.update(dt);
    }
  }

  /**
   * Get current handler (for external system access)
   */
  getCurrentHandler(): DreamHandler | null {
    return this.currentHandler;
  }

  /**
   * Get current archetype name (for debugging)
   */
  getArchetypeName(): string {
    if (this.currentArchetypeType) {
      // Map ArchetypeType to display names
      switch (this.currentArchetypeType) {
        case 'PlatterRotation':
          return 'PlatterRotationDream';
        case 'LeverTension':
          return 'LeverTensionDream';
        case 'KeySequence':
          return 'KeySequenceDream';
        case 'CrystallineCubeBoss':
          return 'CrystallineCubeBossDream';
        default:
          return `${this.currentArchetypeType}Dream`;
      }
    }

    if (!this.currentEntity) return 'None';

    // Fallback: property-flag detection (v2.0 backward compat)
    if (this.currentEntity.platterCore && this.currentEntity.rotationAxis) return 'PlatterRotationDream';
    if (this.currentEntity.leverCore) return 'LeverTensionDream';
    if (this.currentEntity.keycapPatterns) return 'KeySequenceDream';
    if (this.currentEntity.boss && this.currentEntity.cubeCrystalline) return 'CrystallineCubeBossDream';
    return 'Unknown';
  }

  /**
   * Dispose current handler and reset
   */
  dispose(): void {
    if (this.currentHandler) {
      this.currentHandler.dispose();
      this.currentHandler = null;
    }
    this.currentEntity = null;
    this.currentArchetypeType = null;
    this.scene = null;
  }
}

// Re-export DreamHandler interface for consumers that import from this module
export type { DreamHandler } from './dream-handlers';
