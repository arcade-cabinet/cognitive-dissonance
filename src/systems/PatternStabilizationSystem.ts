import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { world } from '../ecs/World';
import { ProceduralMorphSystem } from '../enemies/ProceduralMorphSystem';
import { YukaSteeringSystem } from '../enemies/YukaSteeringSystem';
import { useSeedStore } from '../store/seed-store';
import type { GameEntity, PhaseConfig, YukaTrait } from '../types';
import { MechanicalHaptics } from '../xr/MechanicalHaptics';
import { CorruptionTendrilSystem } from './CorruptionTendrilSystem';
import { EchoSystem } from './EchoSystem';
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
  private keycapMeshMap: Map<string, Mesh> = new Map();
  private spawning = false;
  private spawnTimer = 0;
  private spawnInterval = 1.2; // seconds between pattern spawns (updated by DifficultyScalingSystem)
  private patternTimeWindow = 3.0; // seconds to hold a pattern before it counts as missed
  private pendingPatterns: Map<string, number> = new Map(); // key -> expiry timestamp (performance.now)

  // Phase progression (driven by tension thresholds from patterns.json)
  private phases: PhaseConfig[] = [];
  private currentPhaseIndex = 0;

  // Yuka traits for random enemy spawning
  private static readonly YUKA_TRAITS: YukaTrait[] = [
    'NeonRaymarcher',
    'TendrilBinder',
    'PlatterCrusher',
    'GlassShatterer',
    'EchoRepeater',
    'LeverSnatcher',
    'SphereCorruptor',
  ];

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
   * Set keycap mesh map for echo position lookups.
   * Called by GameBootstrap after MechanicalPlatter creates keycaps.
   */
  setKeycapMeshMap(meshMap: Map<string, Mesh>): void {
    this.keycapMeshMap = meshMap;
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
   * Set phase progression data from patterns.json.
   * Phases define tension thresholds, pattern keys, spawn rates, and enemy counts.
   * Called by GameBootstrap after loadSeedConfigs().
   */
  setPhases(phases: PhaseConfig[]): void {
    this.phases = phases;
    this.currentPhaseIndex = 0;
    if (phases.length > 0) {
      this.requiredPatternSet = new Set(phases[0].patternKeys);
      this.spawnInterval = phases[0].spawnRate;
    }
  }

  /**
   * Get the current phase index (for external system queries).
   */
  getCurrentPhaseIndex(): number {
    return this.currentPhaseIndex;
  }

  /**
   * Start spawning corruption patterns at the current spawn rate.
   * Called when playing phase begins.
   */
  startPatternSpawning(): void {
    this.spawning = true;
    this.spawnTimer = 0;
    this.pendingPatterns.clear();
    console.log('[PatternStabilizationSystem] Pattern spawning started');
  }

  /**
   * Stop spawning patterns (phase ended or Dream changed).
   */
  stopPatternSpawning(): void {
    this.spawning = false;
    this.pendingPatterns.clear();
  }

  /**
   * Per-frame update: spawn new patterns and check for timeouts.
   * Must be called via scene.registerBeforeRender.
   *
   * @param dt - Delta time in seconds
   */
  update(dt: number): void {
    if (!this.spawning || this.requiredPatternSet.size === 0) return;

    // Check for phase progression based on current tension
    this.checkPhaseProgression();

    // Read spawn rate from level entity (written by DifficultyScalingSystem each frame)
    const entitySpawnRate = this.currentLevelEntity?.spawnRate;
    if (entitySpawnRate && entitySpawnRate > 0) {
      this.spawnInterval = entitySpawnRate;
    }

    // Spawn timer countdown
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnNewPattern();
    }

    // Check for expired pending patterns
    const now = performance.now();
    for (const [key, expiry] of this.pendingPatterns) {
      if (now >= expiry) {
        // Pattern expired without being held — missed!
        this.pendingPatterns.delete(key);
        this.missedPattern(key);
      }
    }
  }

  /**
   * Spawn a new corruption pattern (random key from required set).
   * Extends corruption tendrils toward the keycap.
   */
  private spawnNewPattern(): void {
    const availableKeys = Array.from(this.requiredPatternSet).filter(
      (key) => !this.pendingPatterns.has(key) && !this.activePatterns.has(key),
    );
    if (availableKeys.length === 0) return;

    const rng = useSeedStore.getState().rng;
    const key = availableKeys[Math.floor((rng?.() ?? Math.random()) * availableKeys.length)];
    const expiry = performance.now() + this.patternTimeWindow * 1000;
    this.pendingPatterns.set(key, expiry);

    // Increase tension slightly for each spawned pattern
    this.tensionSystem?.increase(this.currentLevelEntity?.tensionCurve?.increaseRate ?? 0.015);
  }

  /**
   * Check if tension has crossed a phase threshold and advance to the next phase.
   * Phases are defined in patterns.json with ascending tension thresholds.
   * When advancing, updates the required pattern set and spawn interval.
   */
  private checkPhaseProgression(): void {
    if (this.phases.length === 0) return;

    const currentTension = this.tensionSystem?.currentTension ?? 0;
    const nextPhaseIndex = this.currentPhaseIndex + 1;

    // Check if we should advance to the next phase
    if (nextPhaseIndex < this.phases.length) {
      const nextPhase = this.phases[nextPhaseIndex];
      if (currentTension >= nextPhase.tension) {
        this.currentPhaseIndex = nextPhaseIndex;

        // Update pattern set to the new phase's keys
        this.requiredPatternSet = new Set(nextPhase.patternKeys);
        this.spawnInterval = nextPhase.spawnRate;

        // Clear any pending patterns from the old phase
        this.pendingPatterns.clear();
        this.spawnTimer = 0;

        // Update level entity keyPatterns for coherence bonus checking
        if (this.currentLevelEntity) {
          this.currentLevelEntity.keyPatterns = nextPhase.patternKeys;
        }

        console.log(
          `[PatternStabilizationSystem] Phase ${this.currentPhaseIndex} activated at tension ${currentTension.toFixed(3)} — keys: [${nextPhase.patternKeys.join(', ')}], spawnRate: ${nextPhase.spawnRate}`,
        );
      }
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

    // Clear pending pattern if this key was awaiting stabilization
    this.pendingPatterns.delete(keyName);

    // Start hold timer
    this.holdTimers.set(keyName, Date.now());

    // Decrease tension via TensionSystem
    // Base decrease rate from tensionCurve, scaled by grip strength
    const decreaseRate = this.currentLevelEntity.tensionCurve?.decreaseRate ?? 0.018;
    const decreaseAmount = decreaseRate * handGrip;
    this.tensionSystem.decrease(decreaseAmount);

    // Retract corruption tendrils from this key (visual feedback)
    CorruptionTendrilSystem.getInstance().retractFromKey(keyName);

    // Trigger haptic feedback scaled to grip strength
    MechanicalHaptics.getInstance().triggerContact(0.6 * handGrip, 'keycapHold');

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
   * Spawns a ghost keycap Echo and a morphing Yuka_Enemy at the keycap's position.
   * Validates: Requirement 6.4
   *
   * @param keyName - The keycap that was missed
   */
  missedPattern(keyName: string): void {
    console.log(`PatternStabilizationSystem: Missed pattern for key ${keyName}`);

    // Determine spawn position from keycap mesh or fall back to platter rim
    const keycapMesh = this.keycapMeshMap.get(keyName);
    const pos = keycapMesh
      ? { x: keycapMesh.position.x, y: keycapMesh.position.y + 0.1, z: keycapMesh.position.z }
      : { x: 0, y: 0.1, z: 0 };

    // Spawn ghost keycap echo (EchoSystem handles tension increase + haptic)
    EchoSystem.getInstance().spawnEcho(keyName, pos);

    // Spawn Yuka enemy via ProceduralMorphSystem + ECS
    try {
      const morphSystem = ProceduralMorphSystem.getInstance();
      const rng = useSeedStore.getState().rng;
      const trait =
        PatternStabilizationSystem.YUKA_TRAITS[
          Math.floor((rng?.() ?? Math.random()) * PatternStabilizationSystem.YUKA_TRAITS.length)
        ];
      const spawnPos = new Vector3(
        pos.x + ((rng?.() ?? Math.random()) - 0.5) * 0.3,
        pos.y + 0.2,
        pos.z + ((rng?.() ?? Math.random()) - 0.5) * 0.3,
      );
      const { mesh, manager } = morphSystem.createMorphedEnemy(trait, spawnPos);

      // Add enemy entity to ECS World
      world.add({
        enemy: true,
        yuka: true,
        currentTrait: trait,
        morphProgress: 0.0,
        morphTarget: { mesh, manager },
        position: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
      } as GameEntity);

      // Register with Yuka AI steering for movement behavior
      YukaSteeringSystem.getInstance().registerEnemy(mesh, trait);

      console.log(`PatternStabilizationSystem: Spawned Yuka enemy (${trait}) for missed key ${keyName}`);
    } catch (err) {
      console.warn('PatternStabilizationSystem: Could not spawn Yuka enemy:', err);
    }
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
    // P3: Deferred — requires @babylonjs/havok WASM initialization
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
    this.pendingPatterns.clear();
    this.spawning = false;
    this.spawnTimer = 0;
    this.currentPhaseIndex = 0;
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
