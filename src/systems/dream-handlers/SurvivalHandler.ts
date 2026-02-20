/**
 * SurvivalDream handler — pure survival mode
 *
 * Mechanics:
 * - EVERYTHING active from the start
 * - Tension CONSTANTLY rises at baseTensionRiseRate per second
 * - Each surface generates challenges proportional to its surfaceIntensity:
 *   - keycaps: random patterns that must be pressed (higher intensity = more simultaneous)
 *   - lever: oscillating target that must be tracked (higher intensity = faster oscillation)
 *   - platter: rotation speed increases (higher intensity = faster base RPM)
 *   - sphere: drift that must be counteracted (higher intensity = stronger drift)
 *   - cubes: cubes approach aggressively, must be dodged/caught
 * - respiteIntervalS: if >0, brief calm periods every N seconds (tension rise pauses for 3s)
 * - cubeAggressionRate multiplies how fast cubes approach the sphere
 * - Goal: survive as long as possible before tension reaches 0.999
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { SurvivalSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** State for the keycap challenge */
interface KeycapChallenge {
  activeLetters: string[];
  pressedLetters: Set<string>;
  lastPatternTime: number;
  patternIntervalS: number;
}

/** State for the lever challenge */
interface LeverChallenge {
  targetPosition: number;
  oscillationPhase: number;
  oscillationSpeed: number;
}

/** State for the cube approach challenge */
interface CubeApproachState {
  distance: number;        // Distance from sphere (starts at 1.0, approaches 0)
  angle: number;           // Angle around sphere
  speed: number;           // Approach speed
  caught: boolean;
}

/** Respite pause duration */
const RESPITE_DURATION_S = 3;

export class SurvivalHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private baseTensionRiseRate = 0.03;
  private surfaceIntensity: Record<string, number> = {
    keycaps: 1.0,
    lever: 1.0,
    platter: 1.0,
    sphere: 1.0,
    cubes: 1.0,
  };
  private respiteIntervalS = 0;
  private cubeAggressionRate = 1.0;

  // Runtime state
  private elapsedTime = 0;
  private survivalTime = 0;
  private inRespite = false;
  private respiteTimer = 0;
  private lastRespiteTime = 0;

  // Per-surface challenge states
  private keycapChallenge: KeycapChallenge = {
    activeLetters: [],
    pressedLetters: new Set(),
    lastPatternTime: 0,
    patternIntervalS: 3,
  };
  private leverChallenge: LeverChallenge = {
    targetPosition: 0.5,
    oscillationPhase: 0,
    oscillationSpeed: 1.0,
  };
  private cubeApproaches: CubeApproachState[] = [];
  private sphereDriftAngle = 0;
  private platterTargetRPM = 0;

  // Meshes
  private sphereMesh: Mesh | null = null;
  private leverMesh: Mesh | null = null;

  // Available keycap letters
  private availableLetters: string[] = [];

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as SurvivalSlots | undefined;
    this.baseTensionRiseRate = slots?.baseTensionRiseRate ?? 0.03;
    this.surfaceIntensity = slots?.surfaceIntensity ?? {
      keycaps: 1.0, lever: 1.0, platter: 1.0, sphere: 1.0, cubes: 1.0,
    };
    this.respiteIntervalS = slots?.respiteIntervalS ?? 0;
    this.cubeAggressionRate = slots?.cubeAggressionRate ?? 1.0;

    // Determine active keycap subset
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z'];
    this.availableLetters = [...keycapSubset];

    // Find meshes
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.leverMesh = scene.getMeshByName('lever') as Mesh;

    // Initialize keycap challenge
    this.keycapChallenge = {
      activeLetters: [],
      pressedLetters: new Set(),
      lastPatternTime: 0,
      patternIntervalS: Math.max(0.5, 3 / (this.surfaceIntensity.keycaps ?? 1)),
    };

    // Initialize lever challenge
    this.leverChallenge = {
      targetPosition: 0.5,
      oscillationPhase: 0,
      oscillationSpeed: (this.surfaceIntensity.lever ?? 1) * 2,
    };

    // Initialize cube approaches
    this.cubeApproaches = [];
    this.spawnCubeApproach();

    this.sphereDriftAngle = 0;
    this.platterTargetRPM = 2 * (this.surfaceIntensity.platter ?? 1);

    this.elapsedTime = 0;
    this.survivalTime = 0;
    this.inRespite = false;
    this.respiteTimer = 0;
    this.lastRespiteTime = 0;
  }

  update(dt: number): void {
    if (!this.scene) return;

    this.elapsedTime += dt;
    this.survivalTime += dt;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Check for game-over condition
    if (tension >= 0.999) return;

    // Respite management
    if (this.respiteIntervalS > 0) {
      if (this.inRespite) {
        this.respiteTimer += dt;
        if (this.respiteTimer >= RESPITE_DURATION_S) {
          this.inRespite = false;
          this.respiteTimer = 0;
        }
      } else if (this.elapsedTime - this.lastRespiteTime >= this.respiteIntervalS) {
        this.inRespite = true;
        this.lastRespiteTime = this.elapsedTime;
        this.respiteTimer = 0;
      }
    }

    // Constant tension rise (paused during respite)
    if (!this.inRespite && this.scene?.metadata) {
      const scaledRiseRate = this.baseTensionRiseRate * (1 + tension * 0.3);
      this.scene.metadata.currentTension = Math.min(
        1,
        (this.scene.metadata.currentTension ?? 0) + scaledRiseRate * dt,
      );
    }

    // --- Keycap challenge ---
    this.updateKeycapChallenge(dt, tension);

    // --- Lever challenge ---
    this.updateLeverChallenge(dt, tension);

    // --- Sphere drift challenge ---
    this.updateSphereDrift(dt, tension);

    // --- Cube approach challenge ---
    this.updateCubeApproaches(dt, tension);
  }

  private updateKeycapChallenge(dt: number, tension: number): void {
    const intensity = this.surfaceIntensity.keycaps ?? 1;
    const patternInterval = Math.max(0.5, this.keycapChallenge.patternIntervalS / (1 + tension * 0.5));

    if (this.elapsedTime - this.keycapChallenge.lastPatternTime >= patternInterval) {
      this.keycapChallenge.lastPatternTime = this.elapsedTime;
      // Generate new pattern: intensity determines simultaneous count
      const count = Math.min(Math.ceil(intensity * (1 + tension)), this.availableLetters.length);
      const shuffled = [...this.availableLetters].sort(() => Math.random() - 0.5);
      this.keycapChallenge.activeLetters = shuffled.slice(0, count);
    }

    // Check pressed keys from scene metadata
    const pressedKeys: Set<string> = this.scene?.metadata?.pressedKeys ?? new Set();
    let matchCount = 0;
    for (const letter of this.keycapChallenge.activeLetters) {
      if (pressedKeys.has(letter)) {
        matchCount++;
      }
    }

    // Tension relief for matching patterns
    if (matchCount > 0 && this.scene?.metadata) {
      this.scene.metadata.currentTension = Math.max(
        0,
        (this.scene.metadata.currentTension ?? 0) - 0.003 * matchCount * dt,
      );
    }
  }

  private updateLeverChallenge(dt: number, _tension: number): void {
    // Oscillating target
    this.leverChallenge.oscillationPhase += this.leverChallenge.oscillationSpeed * dt;
    this.leverChallenge.targetPosition = 0.5 + 0.4 * Math.sin(this.leverChallenge.oscillationPhase);

    // Check lever position
    const leverPos = this.leverMesh?.position.y ?? 0;
    const normalizedLever = Math.max(0, Math.min(1, (leverPos + 1) / 2));

    if (Math.abs(normalizedLever - this.leverChallenge.targetPosition) < 0.15) {
      // On target — small tension relief
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.max(
          0,
          (this.scene.metadata.currentTension ?? 0) - 0.002 * dt,
        );
      }
    }
  }

  private updateSphereDrift(dt: number, tension: number): void {
    const intensity = this.surfaceIntensity.sphere ?? 1;

    // Drift the sphere target angle
    this.sphereDriftAngle += intensity * 0.5 * dt * (1 + tension * 0.3);

    // Check sphere rotation vs drift target
    const sphereRot = this.sphereMesh?.rotation.y ?? 0;
    const diff = Math.abs(sphereRot - this.sphereDriftAngle);

    if (diff < 0.3) {
      // Counteracting drift — tension relief
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.max(
          0,
          (this.scene.metadata.currentTension ?? 0) - 0.002 * dt,
        );
      }
    }
  }

  private updateCubeApproaches(dt: number, tension: number): void {
    const aggression = this.cubeAggressionRate * (1 + tension * 0.5);

    for (const cube of this.cubeApproaches) {
      if (cube.caught) continue;

      cube.distance -= cube.speed * aggression * dt;

      // Cube reached the sphere
      if (cube.distance <= 0) {
        cube.caught = true;

        // Tension increase for cube reaching sphere
        if (this.scene?.metadata) {
          this.scene.metadata.currentTension = Math.min(
            1,
            (this.scene.metadata.currentTension ?? 0) + 0.04,
          );
        }
      }

      // Check if sphere rotation is aimed at cube (dodging)
      const sphereRot = this.sphereMesh?.rotation.y ?? 0;
      const angleDiff = Math.abs(
        ((sphereRot - cube.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
      );
      if (angleDiff < 0.4 && cube.distance < 0.3) {
        // "Caught" the cube — tension relief
        cube.caught = true;
        if (this.scene?.metadata) {
          this.scene.metadata.currentTension = Math.max(
            0,
            (this.scene.metadata.currentTension ?? 0) - 0.02,
          );
        }
      }
    }

    // Remove caught cubes and spawn new ones
    this.cubeApproaches = this.cubeApproaches.filter((c) => !c.caught);
    if (this.cubeApproaches.length === 0) {
      this.spawnCubeApproach();
    }
  }

  /** Spawn a new approaching cube */
  private spawnCubeApproach(): void {
    this.cubeApproaches.push({
      distance: 1.0,
      angle: Math.random() * Math.PI * 2,
      speed: 0.1 + Math.random() * 0.1,
      caught: false,
    });
  }

  /** Get current survival time in seconds */
  getSurvivalTime(): number {
    return this.survivalTime;
  }

  /** Get whether currently in a respite period */
  isInRespite(): boolean {
    return this.inRespite;
  }

  /** Get the active keycap pattern */
  getActiveKeycapPattern(): ReadonlyArray<string> {
    return this.keycapChallenge.activeLetters;
  }

  /** Get the lever challenge target position */
  getLeverTarget(): number {
    return this.leverChallenge.targetPosition;
  }

  /** Get cube approach states (for testing) */
  getCubeApproaches(): ReadonlyArray<CubeApproachState> {
    return this.cubeApproaches;
  }

  dispose(): void {
    this.keycapChallenge = {
      activeLetters: [],
      pressedLetters: new Set(),
      lastPatternTime: 0,
      patternIntervalS: 3,
    };
    this.leverChallenge = {
      targetPosition: 0.5,
      oscillationPhase: 0,
      oscillationSpeed: 1.0,
    };
    this.cubeApproaches = [];
    this.elapsedTime = 0;
    this.survivalTime = 0;
    this.inRespite = false;
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.leverMesh = null;
  }
}

// Self-register
registerHandler('Survival', SurvivalHandler);
