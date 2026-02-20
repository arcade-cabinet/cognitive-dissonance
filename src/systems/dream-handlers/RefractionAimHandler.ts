/**
 * RefractionAimDream handler
 *
 * Mechanics:
 * - A light "beam" emanates from the crystalline cube
 * - Beam refracts through the sphere (sphere rotation changes beam direction)
 * - targetKeycapCount keycaps are highlighted as targets
 * - Player must rotate sphere to aim the refracted beam at target keycaps
 * - beamWidth is the angular width of the beam (wider = more forgiving)
 * - driftSpeed causes the beam origin to slowly drift (must continuously adjust)
 * - refractionAngle determines how much sphere rotation affects beam direction
 * - Beam hitting target keycap for 0.5s = target complete, new target appears
 * - Missing targets (beam sweeps past) = small tension increase
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { RefractionAimSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** State for a target keycap */
interface TargetKeycap {
  letter: string;
  angleDeg: number;     // Angle on the field where this keycap sits
  hitTimer: number;      // Seconds the beam has been on this target
  completed: boolean;
}

/** Duration in seconds the beam must be on target to complete it */
const HIT_DURATION_S = 0.5;

/** All available keycap letters */
const ALL_LETTERS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];

export class RefractionAimHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;
  private sphereMesh: Mesh | null = null;
  private cubeMesh: Mesh | null = null;

  // Slot parameters
  private beamWidth = 0.15;
  private targetKeycapCount = 2;
  private driftSpeed = 0.005;
  private refractionAngle = 30;

  // Runtime state
  private targets: TargetKeycap[] = [];
  private beamOriginAngleDeg = 0;
  private beamDirectionDeg = 0;
  private completedCount = 0;
  private elapsedTime = 0;
  private availableLetters: string[] = [];

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as RefractionAimSlots | undefined;
    this.beamWidth = slots?.beamWidth ?? 0.15;
    this.targetKeycapCount = slots?.targetKeycapCount ?? 2;
    this.driftSpeed = slots?.driftSpeed ?? 0.005;
    this.refractionAngle = slots?.refractionAngle ?? 30;

    // Determine available keycap letters
    const keycapSubset = slots?.keycapSubset ?? ALL_LETTERS.slice(0, 4);
    this.availableLetters = [...keycapSubset];

    // Find meshes
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.cubeMesh = scene.getMeshByName('crystallineCube') as Mesh;

    // Initialize beam origin
    this.beamOriginAngleDeg = Math.random() * 360;

    // Initialize targets
    this.targets = [];
    this.completedCount = 0;
    this.spawnTargets();

    this.elapsedTime = 0;
  }

  update(dt: number): void {
    if (!this.scene || !this.sphereMesh) return;

    this.elapsedTime += dt;
    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Drift beam origin angle
    this.beamOriginAngleDeg += this.driftSpeed * 360 * dt * (1 + tension * 0.3);
    this.beamOriginAngleDeg = this.beamOriginAngleDeg % 360;

    // Calculate refracted beam direction from sphere rotation
    const sphereAngleDeg = ((this.sphereMesh.rotation.y * 180) / Math.PI) % 360;
    this.beamDirectionDeg = this.beamOriginAngleDeg + sphereAngleDeg * (this.refractionAngle / 45);
    this.beamDirectionDeg = ((this.beamDirectionDeg % 360) + 360) % 360;

    // Beam angular half-width in degrees
    const beamHalfWidthDeg = this.beamWidth * 180;

    let anyTargetHit = false;

    for (const target of this.targets) {
      if (target.completed) continue;

      // Check angular distance between beam direction and target
      const diff = Math.abs(((this.beamDirectionDeg - target.angleDeg + 540) % 360) - 180);

      if (diff <= beamHalfWidthDeg) {
        // Beam is on target
        target.hitTimer += dt;
        anyTargetHit = true;

        if (target.hitTimer >= HIT_DURATION_S) {
          // Target completed
          target.completed = true;
          this.completedCount++;

          // Tension decrease for completion
          if (this.scene?.metadata) {
            this.scene.metadata.currentTension = Math.max(
              0,
              (this.scene.metadata.currentTension ?? 0) - 0.04,
            );
          }

          // Spawn replacement target
          this.spawnSingleTarget();
        }
      } else {
        // Beam missed — reset hit timer
        if (target.hitTimer > 0.1) {
          // Was tracking but lost — small tension increase
          if (this.scene?.metadata) {
            this.scene.metadata.currentTension = Math.min(
              1,
              (this.scene.metadata.currentTension ?? 0) + 0.005,
            );
          }
        }
        target.hitTimer = 0;
      }
    }

    // If beam is sweeping without hitting any target, mild tension increase
    if (!anyTargetHit) {
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.min(
          1,
          (this.scene.metadata.currentTension ?? 0) + 0.001 * dt,
        );
      }
    }
  }

  /** Spawn initial set of target keycaps */
  private spawnTargets(): void {
    for (let i = 0; i < this.targetKeycapCount; i++) {
      this.spawnSingleTarget();
    }
  }

  /** Spawn a single new target keycap */
  private spawnSingleTarget(): void {
    // Pick a random available letter not already targeted
    const activeTargetLetters = new Set(
      this.targets.filter((t) => !t.completed).map((t) => t.letter),
    );
    const available = this.availableLetters.filter((l) => !activeTargetLetters.has(l));
    if (available.length === 0) return;

    const letter = available[Math.floor(Math.random() * available.length)];

    // Assign keycap a position angle on the ring (based on letter index)
    const letterIndex = ALL_LETTERS.indexOf(letter);
    const angleDeg = (letterIndex / ALL_LETTERS.length) * 360;

    this.targets.push({
      letter,
      angleDeg,
      hitTimer: 0,
      completed: false,
    });
  }

  /** Get the current beam direction in degrees */
  getBeamDirectionDeg(): number {
    return this.beamDirectionDeg;
  }

  /** Get the beam origin angle in degrees */
  getBeamOriginAngleDeg(): number {
    return this.beamOriginAngleDeg;
  }

  /** Get target states (for external rendering / testing) */
  getTargets(): ReadonlyArray<TargetKeycap> {
    return this.targets;
  }

  /** Get the total number of completed targets */
  getCompletedCount(): number {
    return this.completedCount;
  }

  /** Get the active (non-completed) target count */
  getActiveTargetCount(): number {
    return this.targets.filter((t) => !t.completed).length;
  }

  dispose(): void {
    this.targets = [];
    this.completedCount = 0;
    this.beamOriginAngleDeg = 0;
    this.beamDirectionDeg = 0;
    this.elapsedTime = 0;
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.cubeMesh = null;
  }
}

// Self-register
registerHandler('RefractionAim', RefractionAimHandler);
