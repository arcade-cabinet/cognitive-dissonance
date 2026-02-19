import type { Scene } from '@babylonjs/core/scene';
import type { GameEntity } from '../types';
import type { TensionSystem } from './TensionSystem';

/**
 * PatternStabilizationSystem
 *
 * Manages active pattern tracking, keycap holds, tendril retraction, and coherence bonuses.
 * Validates: Requirement 6 (Pattern Stabilization System)
 */
export class PatternStabilizationSystem {
  private static instance: PatternStabilizationSystem | null = null;

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Will be used when system is fully integrated with scene observers
  private scene: Scene | null = null;
  private activePatterns: Set<string> = new Set();
  private requiredPatternSet: Set<string> = new Set();
  private holdTimers: Map<string, number> = new Map();
  private tensionSystem: TensionSystem | null = null;
  private currentLevelEntity: GameEntity | null = null;

  private constructor() {}

  static getInstance(): PatternStabilizationSystem {
    if (!PatternStabilizationSystem.instance) {
      PatternStabilizationSystem.instance = new PatternStabilizationSystem();
    }
    return PatternStabilizationSystem.instance;
  }

  /**
   * Initialize the system with scene and tension system references.
   */
  initialize(scene: Scene, tensionSystem: TensionSystem): void {
    this.scene = scene;
    this.tensionSystem = tensionSystem;
  }

  /**
   * Set the current level entity to read tensionCurve parameters.
   */
  setLevelEntity(entity: GameEntity): void {
    this.currentLevelEntity = entity;
    // Update required pattern set from entity's keyPatterns
    if (entity.keyPatterns && entity.keyPatterns.length > 0) {
      this.requiredPatternSet = new Set(entity.keyPatterns);
    }
  }

  /**
   * Hold a keycap to stabilize a corruption pattern.
   * Validates: Requirement 6.2
   *
   * @param keyName - The keycap letter (e.g., 'A', 'Q')
   * @param holdDuration - Duration of the hold in milliseconds
   * @param handGrip - Grip strength (0.0–1.0) from hand tracking, or 1.0 for keyboard
   */
  holdKey(keyName: string, _holdDuration: number, handGrip: number): void {
    if (!this.tensionSystem || !this.currentLevelEntity) {
      console.warn('PatternStabilizationSystem: Cannot hold key — system not initialized');
      return;
    }

    // Add to active patterns
    this.activePatterns.add(keyName);

    // Start hold timer
    this.holdTimers.set(keyName, Date.now());

    // Decrease tension via TensionSystem
    // Base decrease rate from tensionCurve, scaled by grip strength
    const decreaseRate = this.currentLevelEntity.tensionCurve?.decreaseRate ?? 0.018;
    const decreaseAmount = decreaseRate * handGrip;
    this.tensionSystem.decrease(decreaseAmount);

    // Check for full pattern match
    this.checkPatternMatch();
  }

  /**
   * Release a keycap hold.
   * Validates: Requirement 6.6
   *
   * @param keyName - The keycap letter to release
   */
  releaseKey(keyName: string): void {
    this.activePatterns.delete(keyName);
    this.holdTimers.delete(keyName);
  }

  /**
   * Check if all required keys for a pattern set are held simultaneously.
   * If yes, grant coherence bonus (0.09 tension decrease).
   * Validates: Requirement 6.3
   */
  private checkPatternMatch(): void {
    if (!this.tensionSystem || this.requiredPatternSet.size === 0) {
      return;
    }

    // Check if all required keys are currently held
    const allKeysHeld = Array.from(this.requiredPatternSet).every((key) => this.activePatterns.has(key));

    if (allKeysHeld) {
      // Grant coherence bonus
      this.tensionSystem.decrease(0.09);
      console.log('PatternStabilizationSystem: Full pattern match — coherence bonus granted');
    }
  }

  /**
   * Trigger a missed pattern event.
   * Spawns an Echo and a Yuka_Enemy.
   * Validates: Requirement 6.4
   *
   * @param keyName - The keycap that was missed
   */
  missedPattern(keyName: string): void {
    console.log(`PatternStabilizationSystem: Missed pattern for key ${keyName}`);
    // Echo spawn and Yuka spawn will be handled by EchoSystem and ProceduralMorphSystem
    // This method is a hook for those systems to listen to
  }

  /**
   * Get the set of currently active patterns.
   */
  getActivePatterns(): Set<string> {
    return new Set(this.activePatterns);
  }

  /**
   * Apply physics impostors to keycaps.
   * Validates: Requirement 6.5
   *
   * This will be called by MechanicalPlatter when keycaps are created.
   * Physics parameters: mass 0.3, restitution 0.1
   *
   * @param keycapMeshes - Array of keycap meshes to apply physics to
   */
  // biome-ignore lint/suspicious/noExplicitAny: Mesh type will be properly typed when MechanicalPlatter is implemented (Task 14)
  applyKeycapPhysics(keycapMeshes: any[]): void {
    // TODO: Implement when Havok physics is initialized (Task 42)
    // For each keycap mesh:
    //   - Create PhysicsAggregate with mass 0.3, restitution 0.1
    //   - Apply 6DoF constraint for spring-loaded vertical travel
    console.log(`PatternStabilizationSystem: Physics impostors will be applied to ${keycapMeshes.length} keycaps`);
  }

  /**
   * Reset the system for a new Dream.
   */
  reset(): void {
    this.activePatterns.clear();
    this.requiredPatternSet.clear();
    this.holdTimers.clear();
    this.currentLevelEntity = null;
  }

  /**
   * Dispose the system.
   */
  dispose(): void {
    this.reset();
    this.scene = null;
    this.tensionSystem = null;
  }
}
