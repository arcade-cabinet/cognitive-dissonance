/**
 * DreamTypeHandler — Per-archetype gameplay handler system
 *
 * Manages the active Level_Archetype gameplay loop. Each archetype fundamentally changes
 * how the platter/keycap/lever architecture behaves. Registered as the last gameplay system
 * in the update loop.
 *
 * Source: ARCH v3.4 CognitiveDissonanceRoot.tsx + design.md Level Archetype Gameplay Mechanics
 *
 * Validates: Requirement 30 (Level Archetype Gameplay Mechanics)
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../types';

/**
 * DreamHandler interface — per-archetype gameplay logic
 */
export interface DreamHandler {
  activate(entity: GameEntity, scene: Scene): void;
  update(dt: number): void;
  dispose(): void;
}

/**
 * PlatterRotationDream handler
 *
 * Mechanics:
 * - Platter physically rotates at seed-derived RPM (2–8 RPM base, scales to 18 RPM with tension)
 * - Keycaps orbit with platter
 * - Player must hold keycaps as they pass the 90° reach zone (±45° from camera forward)
 * - Holding outside reach zone has no effect
 * - Rotation speed increases logarithmically with tension
 */
class PlatterRotationDreamHandler implements DreamHandler {
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private platterMesh: Mesh | null = null;
  private baseRPM = 0;
  private currentRPM = 0;
  private reachZoneArc = Math.PI / 2; // 90° arc (±45°)

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;
    this.baseRPM = entity.rotationRPM ?? 5; // Default 5 RPM if not set
    this.currentRPM = this.baseRPM;

    // Find platter mesh in scene
    this.platterMesh = scene.getMeshByName('platter') as Mesh;
    if (!this.platterMesh) {
      console.warn('[PlatterRotationDreamHandler] Platter mesh not found in scene');
    }
  }

  update(dt: number): void {
    if (!this.platterMesh || !this.entity) return;

    // Get current tension from scene metadata
    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Logarithmic RPM scaling: rpm * (1 + log1p(tension * 3))
    this.currentRPM = this.baseRPM * (1 + Math.log1p(tension * 3));

    // Rotate platter: RPM → radians per second → radians per frame
    const radiansPerSecond = (this.currentRPM * 2 * Math.PI) / 60;
    const radiansPerFrame = radiansPerSecond * dt;
    this.platterMesh.rotation.y += radiansPerFrame;
  }

  /**
   * Check if a keycap world position is within the 90° reach zone
   * (±45° from camera forward projected onto platter plane)
   */
  isInReachZone(keycapWorldPosition: Vector3): boolean {
    if (!this.scene) return false;

    const camera = this.scene.activeCamera;
    if (!camera) return false;

    // Camera forward projected onto XZ plane (platter plane)
    const cameraForward = camera.getForwardRay().direction;
    const cameraForwardXZ = new Vector3(cameraForward.x, 0, cameraForward.z).normalize();

    // Keycap direction from platter center projected onto XZ plane
    const platterCenter = this.platterMesh?.position ?? Vector3.Zero();
    const keycapDirection = keycapWorldPosition.subtract(platterCenter);
    const keycapDirectionXZ = new Vector3(keycapDirection.x, 0, keycapDirection.z).normalize();

    // Angle between camera forward and keycap direction
    const angle = Math.acos(Vector3.Dot(cameraForwardXZ, keycapDirectionXZ));

    // Within ±45° (π/4 radians)?
    return angle <= this.reachZoneArc / 2;
  }

  dispose(): void {
    // Stop platter rotation
    if (this.platterMesh) {
      gsap.killTweensOf(this.platterMesh.rotation);
    }
    this.entity = null;
    this.scene = null;
    this.platterMesh = null;
  }
}

/**
 * LeverTensionDream handler
 *
 * Mechanics:
 * - MODE_LEVER is primary input (corruption tendrils target lever instead of keycaps)
 * - Lever has continuous resistance position (0.0–1.0)
 * - Corruption patterns carry "frequency" value (0.0–1.0)
 * - Player must match lever position within ±tolerance (seed-derived, scales with difficulty)
 * - Garage-door slit opens/closes rhythmically (seed-derived period 1.5–4s)
 * - Patterns emerge from slit during open phase only
 */
class LeverTensionDreamHandler implements DreamHandler {
  private entity: GameEntity | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future scene access and disposed in dispose()
  private scene: Scene | null = null;
  private slitTopMesh: Mesh | null = null;
  private slitBottomMesh: Mesh | null = null;
  private slitPeriod = 2.5; // seconds
  private slitPhase = 0; // 0 = closed, 1 = open
  private slitTimer = 0;
  private frequencyTolerance = 0.15; // ±0.15 base

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;
    this.slitPeriod = entity.slitPeriod ?? 2.5;
    this.frequencyTolerance = entity.frequencyTolerance ?? 0.15;

    // Find slit meshes
    this.slitTopMesh = scene.getMeshByName('slit-top') as Mesh;
    this.slitBottomMesh = scene.getMeshByName('slit-bottom') as Mesh;

    if (!this.slitTopMesh || !this.slitBottomMesh) {
      console.warn('[LeverTensionDreamHandler] Slit meshes not found in scene');
    }

    // Start slit cycle
    this.slitTimer = 0;
    this.slitPhase = 0;
  }

  update(dt: number): void {
    if (!this.entity) return;

    // Update slit cycle timer
    this.slitTimer += dt;
    if (this.slitTimer >= this.slitPeriod) {
      this.slitTimer = 0;
      this.slitPhase = this.slitPhase === 0 ? 1 : 0;

      // Animate slit open/close
      if (this.slitPhase === 1) {
        this.openSlit();
      } else {
        this.closeSlit();
      }
    }
  }

  private openSlit(): void {
    if (!this.slitTopMesh || !this.slitBottomMesh) return;

    // Top slides up, bottom slides down
    gsap.to(this.slitTopMesh.position, { y: 0.15, duration: 0.4, ease: 'power2.out' });
    gsap.to(this.slitBottomMesh.position, { y: -0.15, duration: 0.5, ease: 'power2.out' });
  }

  private closeSlit(): void {
    if (!this.slitTopMesh || !this.slitBottomMesh) return;

    // Return to closed position
    gsap.to(this.slitTopMesh.position, { y: 0.05, duration: 0.4, ease: 'power2.in' });
    gsap.to(this.slitBottomMesh.position, { y: -0.05, duration: 0.5, ease: 'power2.in' });
  }

  /**
   * Check if lever position matches pattern frequency within tolerance
   */
  matchesFrequency(leverPosition: number, patternFrequency: number): boolean {
    return Math.abs(leverPosition - patternFrequency) <= this.frequencyTolerance;
  }

  /**
   * Check if slit is currently open (patterns can emerge)
   */
  isSlitOpen(): boolean {
    return this.slitPhase === 1;
  }

  dispose(): void {
    // Stop slit animations
    if (this.slitTopMesh) gsap.killTweensOf(this.slitTopMesh.position);
    if (this.slitBottomMesh) gsap.killTweensOf(this.slitBottomMesh.position);

    this.entity = null;
    this.scene = null;
    this.slitTopMesh = null;
    this.slitBottomMesh = null;
  }
}

/**
 * KeySequenceDream handler
 *
 * Mechanics:
 * - Patterns require ordered multi-key sequences (2–5 keys) instead of single holds
 * - Sequence length scales with tension: 2 + floor(tension * 3), capped at 5
 * - Ghost keycap highlights show required sequence order
 * - Per-key time window: seed-derived base (800–2000ms), scales down with difficulty
 * - Wrong key in sequence resets progress and spawns Echo
 * - Full sequence completion grants double coherence bonus (0.18 tension decrease)
 */
class KeySequenceDreamHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private currentSequence: string[] = [];
  private sequenceProgress = 0;
  private baseTimeWindow = 1200; // ms per key
  private ghostMeshes: Mesh[] = [];

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;
    this.baseTimeWindow = entity.stabilizationHoldTime ?? 1200;
    this.currentSequence = [];
    this.sequenceProgress = 0;
  }

  update(_dt: number): void {
    // Sequence logic is event-driven (handled by KeyboardInputSystem / HandInteractionSystem)
    // This update loop is a no-op for KeySequenceDream
  }

  /**
   * Start a new sequence with given keys
   */
  startSequence(keys: string[]): void {
    this.currentSequence = keys;
    this.sequenceProgress = 0;
    this.showGhostHighlights(keys);
  }

  /**
   * Process a key press in the sequence
   * Returns true if sequence is complete, false otherwise
   */
  processKey(key: string): boolean {
    if (this.sequenceProgress >= this.currentSequence.length) {
      return false; // Sequence already complete
    }

    const expectedKey = this.currentSequence[this.sequenceProgress];
    if (key === expectedKey) {
      this.sequenceProgress++;
      this.updateGhostHighlights();

      // Sequence complete?
      if (this.sequenceProgress >= this.currentSequence.length) {
        this.clearGhostHighlights();
        return true;
      }
    } else {
      // Wrong key — reset progress
      this.sequenceProgress = 0;
      this.updateGhostHighlights();
      // Caller should spawn Echo
    }

    return false;
  }

  /**
   * Get current sequence length based on tension
   */
  getSequenceLength(tension: number): number {
    return Math.min(5, 2 + Math.floor(tension * 3));
  }

  /**
   * Get per-key time window based on difficulty
   */
  getTimeWindow(difficulty: number): number {
    // Scales from baseTimeWindow down to 400ms
    return Math.max(400, this.baseTimeWindow / (1 + difficulty));
  }

  private showGhostHighlights(keys: string[]): void {
    if (!this.scene) return;

    // Create ghost keycap meshes for each key in sequence
    // (Simplified — full implementation would position at actual keycap locations)
    this.clearGhostHighlights();

    for (let i = 0; i < keys.length; i++) {
      const keycapMesh = this.scene.getMeshByName(`keycap-${keys[i]}`) as Mesh;
      if (keycapMesh) {
        const ghost = keycapMesh.clone(`ghost-${keys[i]}-${i}`);
        if (ghost) {
          ghost.position.y += 0.05; // Slightly above real keycap
          // biome-ignore lint/suspicious/noExplicitAny: Material type varies
          (ghost.material as any).alpha = 0.4;
          this.ghostMeshes.push(ghost);
        }
      }
    }
  }

  private updateGhostHighlights(): void {
    // Fade completed keys, highlight current key
    for (let i = 0; i < this.ghostMeshes.length; i++) {
      const ghost = this.ghostMeshes[i];
      if (i < this.sequenceProgress) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies
        (ghost.material as any).alpha = 0.1; // Faded
      } else if (i === this.sequenceProgress) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies
        (ghost.material as any).alpha = 0.6; // Highlighted
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies
        (ghost.material as any).alpha = 0.4; // Normal
      }
    }
  }

  private clearGhostHighlights(): void {
    for (const ghost of this.ghostMeshes) {
      ghost.dispose();
    }
    this.ghostMeshes = [];
  }

  dispose(): void {
    this.clearGhostHighlights();
    this.entity = null;
    this.scene = null;
    this.currentSequence = [];
    this.sequenceProgress = 0;
  }
}

/**
 * CrystallineCubeBossDream handler
 *
 * Mechanics:
 * - Immediate boss encounter (no warmup phase)
 * - Platter locks rotation, all keycaps retract
 * - Unique boss timeline: longer descend (4s), multiple slam cycles (up to 3)
 * - Counter requires simultaneous lever + keycap input:
 *   - Lever controls shield angle (GSAP-animated shield plane)
 *   - Keycaps fire stabilization pulses (each held key = one pulse per 200ms, reduces boss health by 0.008)
 * - Boss health starts at 1.5 (vs 1.0 for standard boss spawn)
 * - Success: boss shatters into 7 Yuka shards (one per trait), tension drops to 0.5
 * - Failure: permanent platter deformation + tension → 0.999
 */
class CrystallineCubeBossDreamHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future scene access and disposed in dispose()
  private scene: Scene | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Tracks boss state, set in activate() and cleared in dispose()
  private bossActive = false;
  private platterMesh: Mesh | null = null;
  private shieldMesh: Mesh | null = null;
  private slamCycles = 3;

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;
    this.slamCycles = entity.slamCycles ?? 3;

    // Find platter mesh
    this.platterMesh = scene.getMeshByName('platter') as Mesh;

    // Lock platter rotation
    if (this.platterMesh) {
      gsap.killTweensOf(this.platterMesh.rotation);
      gsap.to(this.platterMesh.rotation, { y: 0, duration: 0.5, ease: 'power2.out' });
    }

    // Retract all keycaps (placeholder — full implementation would call MechanicalAnimationSystem)
    console.log('[CrystallineCubeBossDream] Retracting all keycaps');

    // Create shield plane (placeholder — full implementation would create actual mesh)
    console.log('[CrystallineCubeBossDream] Creating shield plane');

    this.bossActive = true;
  }

  update(_dt: number): void {
    // Boss logic is event-driven (handled by CrystallineCubeBossSystem)
    // This update loop is a no-op for CrystallineCubeBossDream
  }

  /**
   * Update shield angle based on lever position
   */
  updateShieldAngle(leverPosition: number): void {
    if (!this.shieldMesh) return;

    // Lever position 0.0–1.0 → shield angle -45° to +45°
    const angle = (leverPosition - 0.5) * (Math.PI / 2);
    gsap.to(this.shieldMesh.rotation, { z: angle, duration: 0.2, ease: 'power2.out' });
  }

  /**
   * Fire stabilization pulse from held keycap
   * Returns damage dealt to boss (0.008 per pulse)
   */
  fireStabilizationPulse(_keycapName: string): number {
    // Placeholder — full implementation would create visual pulse effect
    return 0.008;
  }

  dispose(): void {
    // Unlock platter rotation
    if (this.platterMesh) {
      gsap.killTweensOf(this.platterMesh.rotation);
    }

    // Dispose shield
    if (this.shieldMesh) {
      this.shieldMesh.dispose();
      this.shieldMesh = null;
    }

    this.entity = null;
    this.scene = null;
    this.platterMesh = null;
    this.bossActive = false;
  }
}

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
   * Disposes previous handler, preserves tension state, activates new handler
   */
  activateDream(entity: GameEntity): void {
    if (!this.scene) {
      console.error('[DreamTypeHandler] Cannot activate dream — scene not initialized');
      return;
    }

    // Dispose previous handler
    if (this.currentHandler) {
      this.currentHandler.dispose();
      this.currentHandler = null;
    }

    // Determine archetype and create handler
    if (entity.platterCore && entity.rotationAxis) {
      // PlatterRotationDream
      this.currentHandler = new PlatterRotationDreamHandler();
    } else if (entity.leverCore) {
      // LeverTensionDream
      this.currentHandler = new LeverTensionDreamHandler();
    } else if (entity.keycapPatterns) {
      // KeySequenceDream
      this.currentHandler = new KeySequenceDreamHandler();
    } else if (entity.boss && entity.cubeCrystalline) {
      // CrystallineCubeBossDream
      this.currentHandler = new CrystallineCubeBossDreamHandler();
    } else {
      console.error('[DreamTypeHandler] Unknown archetype for entity:', entity);
      return;
    }

    // Activate handler
    this.currentHandler.activate(entity, this.scene);
    this.currentEntity = entity;

    console.log('[DreamTypeHandler] Activated dream archetype:', this.getArchetypeName());
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
    if (!this.currentEntity) return 'None';
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
    this.scene = null;
  }
}
