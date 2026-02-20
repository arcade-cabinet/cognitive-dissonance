/**
 * CubeJuggleDream handler
 *
 * Mechanics:
 * - Multiple cubes orbit the sphere, each with decaying orbital energy
 * - cubeCount cubes active simultaneously
 * - Each cube's orbit radius slowly decays at decayRate per second
 * - When a cube drifts too close to sphere (radius < 0.1), it "falls" (tension +0.03)
 * - Player "bumps" cubes by rotating sphere toward them — sphere trackball rotation
 *   near a cube's angle boosts its orbit radius by bumpStrength
 * - New cubes spawn every spawnInterval seconds
 * - orbitSpread controls angular separation between cubes
 * - Successfully keeping all cubes in orbit for 10s = tension decrease
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { CubeJuggleSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** Tracks an individual orbiting cube */
interface OrbitTracker {
  angle: number;       // Current angle in radians around sphere
  radius: number;      // Current orbit radius (decays over time)
  speed: number;       // Angular speed (rad/s)
  alive: boolean;      // Whether this cube is still in orbit
}

/** Minimum orbit radius before a cube "falls" */
const FALL_RADIUS = 0.1;

/** Bump proximity threshold in radians — sphere rotation within this angle triggers bump */
const BUMP_PROXIMITY_RAD = 0.3;

/** Duration in seconds all cubes must stay alive for tension decrease */
const SUSTAIN_DURATION_S = 10;

export class CubeJuggleHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;
  private sphereMesh: Mesh | null = null;

  // Slot parameters
  private cubeCount = 3;
  private decayRate = 0.03;
  private bumpStrength = 0.6;
  private orbitSpread = 0.5;
  private spawnInterval = 12;

  // Runtime state
  private orbitTrackers: OrbitTracker[] = [];
  private elapsedTime = 0;
  private lastSpawnTime = 0;
  private sustainTimer = 0;
  private previousSphereAngle = 0;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as CubeJuggleSlots | undefined;
    this.cubeCount = slots?.cubeCount ?? 3;
    this.decayRate = slots?.decayRate ?? 0.03;
    this.bumpStrength = slots?.bumpStrength ?? 0.6;
    this.orbitSpread = slots?.orbitSpread ?? 0.5;
    this.spawnInterval = slots?.spawnInterval ?? 12;

    // Find sphere mesh
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;

    // Initialize orbit trackers with evenly spread angles
    this.orbitTrackers = [];
    for (let i = 0; i < this.cubeCount; i++) {
      this.orbitTrackers.push({
        angle: (i * Math.PI * 2 * this.orbitSpread) / this.cubeCount,
        radius: 0.5 + Math.random() * 0.3,
        speed: 0.5 + Math.random() * 0.5,
        alive: true,
      });
    }

    this.elapsedTime = 0;
    this.lastSpawnTime = 0;
    this.sustainTimer = 0;
    this.previousSphereAngle = this.sphereMesh?.rotation.y ?? 0;
  }

  update(dt: number): void {
    if (!this.scene) return;

    this.elapsedTime += dt;
    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Get current sphere rotation angle (Y-axis)
    const currentSphereAngle = this.sphereMesh?.rotation.y ?? 0;
    const sphereDelta = currentSphereAngle - this.previousSphereAngle;
    this.previousSphereAngle = currentSphereAngle;

    let allAlive = true;

    for (const tracker of this.orbitTrackers) {
      if (!tracker.alive) {
        allAlive = false;
        continue;
      }

      // Advance orbit angle
      tracker.angle += tracker.speed * dt;
      tracker.angle = tracker.angle % (Math.PI * 2);

      // Decay orbit radius
      tracker.radius -= this.decayRate * dt * (1 + tension * 0.5);

      // Check for bump: sphere rotation delta near cube angle
      const angleDiff = Math.abs(
        ((currentSphereAngle - tracker.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
      );
      if (angleDiff <= BUMP_PROXIMITY_RAD && Math.abs(sphereDelta) > 0.01) {
        tracker.radius += this.bumpStrength * Math.abs(sphereDelta);
        // Clamp max radius
        tracker.radius = Math.min(tracker.radius, 1.2);
      }

      // Check for fall
      if (tracker.radius < FALL_RADIUS) {
        tracker.alive = false;
        allAlive = false;

        // Tension increase on fall
        if (this.scene?.metadata) {
          this.scene.metadata.currentTension = Math.min(
            1,
            (this.scene.metadata.currentTension ?? 0) + 0.03,
          );
        }
      }
    }

    // Sustain timer — all cubes alive for SUSTAIN_DURATION_S
    if (allAlive && this.orbitTrackers.length > 0) {
      this.sustainTimer += dt;
      if (this.sustainTimer >= SUSTAIN_DURATION_S) {
        this.sustainTimer = 0;
        // Tension decrease for sustaining
        if (this.scene?.metadata) {
          this.scene.metadata.currentTension = Math.max(
            0,
            (this.scene.metadata.currentTension ?? 0) - 0.05,
          );
        }
      }
    } else {
      this.sustainTimer = 0;
    }

    // Spawn new cubes on interval
    if (this.elapsedTime - this.lastSpawnTime >= this.spawnInterval) {
      this.lastSpawnTime = this.elapsedTime;
      this.spawnCube();
    }
  }

  /** Spawn a new orbiting cube */
  private spawnCube(): void {
    const existingAngles = this.orbitTrackers
      .filter((t) => t.alive)
      .map((t) => t.angle);

    // Find an angle spread away from existing cubes
    let bestAngle = Math.random() * Math.PI * 2;
    if (existingAngles.length > 0) {
      bestAngle = existingAngles[existingAngles.length - 1] + Math.PI * this.orbitSpread;
    }

    this.orbitTrackers.push({
      angle: bestAngle % (Math.PI * 2),
      radius: 0.5 + Math.random() * 0.3,
      speed: 0.5 + Math.random() * 0.5,
      alive: true,
    });
  }

  /** Get orbit tracker states (for external rendering / testing) */
  getOrbitTrackers(): ReadonlyArray<OrbitTracker> {
    return this.orbitTrackers;
  }

  /** Get the number of alive cubes */
  getAliveCubeCount(): number {
    return this.orbitTrackers.filter((t) => t.alive).length;
  }

  dispose(): void {
    this.orbitTrackers = [];
    this.elapsedTime = 0;
    this.lastSpawnTime = 0;
    this.sustainTimer = 0;
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
  }
}

// Self-register
registerHandler('CubeJuggle', CubeJuggleHandler);
