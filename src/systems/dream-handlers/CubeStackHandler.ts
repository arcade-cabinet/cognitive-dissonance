/**
 * CubeStackDream handler
 *
 * Mechanics:
 * - Cubes must be stacked vertically above the sphere
 * - stackHeight cubes need to be balanced (each on top of the previous)
 * - Cubes naturally drift (simulating gravity/instability)
 * - driftForce pushes cubes sideways each frame
 * - Player uses sphere rotation to counteract drift (tilt the "base")
 * - Lever position selects which cube in the stack to focus corrections on
 * - alignmentThresholdDeg is max tilt before a cube falls
 * - balanceDifficultyMode:
 *   - 'static': constant drift in one direction
 *   - 'dynamic-wind': drift direction changes periodically (like wind)
 * - Fallen cube = tension +0.05, must re-stack
 * - Stack complete for 5s = tension decrease
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { CubeStackSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** State for a single cube in the stack */
interface StackCubeState {
  tiltDeg: number;       // Current tilt angle in degrees
  driftDirection: number; // -1 or +1 drift direction
  fallen: boolean;       // Whether this cube has fallen
  restacking: boolean;   // Whether cube is being re-stacked
  restackTimer: number;  // Timer for restack animation (seconds)
}

/** Duration in seconds the complete stack must hold for tension decrease */
const STACK_COMPLETE_DURATION_S = 5;

/** Duration in seconds to restack a fallen cube */
const RESTACK_DURATION_S = 1.5;

/** Period in seconds for wind direction changes in dynamic-wind mode */
const WIND_CHANGE_PERIOD_S = 4;

export class CubeStackHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;
  private sphereMesh: Mesh | null = null;
  private leverMesh: Mesh | null = null;

  // Slot parameters
  private stackHeight = 3;
  private driftForce = 0.015;
  private alignmentThresholdDeg = 10;
  private switchCooldownMs = 500;
  private balanceDifficultyMode: 'static' | 'dynamic-wind' = 'static';

  // Runtime state
  private stackCubes: StackCubeState[] = [];
  private selectedCubeIndex = 0;
  private lastSwitchTime = 0;
  private stackCompleteTimer = 0;
  private elapsedTime = 0;
  private windTimer = 0;
  private globalWindDirection = 1;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as CubeStackSlots | undefined;
    this.stackHeight = slots?.stackHeight ?? 3;
    this.driftForce = slots?.driftForce ?? 0.015;
    this.alignmentThresholdDeg = slots?.alignmentThresholdDeg ?? 10;
    this.switchCooldownMs = slots?.switchCooldownMs ?? 500;
    this.balanceDifficultyMode = slots?.balanceDifficultyMode ?? 'static';

    // Find meshes
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.leverMesh = scene.getMeshByName('lever') as Mesh;

    // Initialize stack
    this.stackCubes = [];
    for (let i = 0; i < this.stackHeight; i++) {
      this.stackCubes.push({
        tiltDeg: 0,
        driftDirection: this.balanceDifficultyMode === 'static' ? 1 : (Math.random() > 0.5 ? 1 : -1),
        fallen: false,
        restacking: false,
        restackTimer: 0,
      });
    }

    this.selectedCubeIndex = 0;
    this.lastSwitchTime = 0;
    this.stackCompleteTimer = 0;
    this.elapsedTime = 0;
    this.windTimer = 0;
    this.globalWindDirection = 1;
  }

  update(dt: number): void {
    if (!this.scene) return;

    this.elapsedTime += dt;
    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Dynamic wind: change direction periodically
    if (this.balanceDifficultyMode === 'dynamic-wind') {
      this.windTimer += dt;
      if (this.windTimer >= WIND_CHANGE_PERIOD_S) {
        this.windTimer = 0;
        this.globalWindDirection *= -1;
        for (const cube of this.stackCubes) {
          if (!cube.fallen) {
            cube.driftDirection = this.globalWindDirection * (Math.random() > 0.3 ? 1 : -1);
          }
        }
      }
    }

    // Read lever position to determine selected cube (0.0-1.0 -> stack index)
    const leverPos = this.leverMesh?.position.y ?? 0.5;
    const normalizedLever = Math.max(0, Math.min(1, (leverPos + 1) / 2));
    const targetIndex = Math.floor(normalizedLever * this.stackHeight);
    const clampedTarget = Math.min(targetIndex, this.stackHeight - 1);

    // Apply switch cooldown
    if (
      clampedTarget !== this.selectedCubeIndex &&
      (this.elapsedTime - this.lastSwitchTime) * 1000 >= this.switchCooldownMs
    ) {
      this.selectedCubeIndex = clampedTarget;
      this.lastSwitchTime = this.elapsedTime;
    }

    // Get sphere rotation for counteracting drift on selected cube
    const sphereRotY = this.sphereMesh?.rotation.y ?? 0;
    const sphereTiltDeg = (sphereRotY * 180) / Math.PI;

    let allStanding = true;

    for (let i = 0; i < this.stackCubes.length; i++) {
      const cube = this.stackCubes[i];

      // Handle restacking
      if (cube.restacking) {
        cube.restackTimer += dt;
        if (cube.restackTimer >= RESTACK_DURATION_S) {
          cube.restacking = false;
          cube.fallen = false;
          cube.tiltDeg = 0;
          cube.restackTimer = 0;
        } else {
          allStanding = false;
          continue;
        }
      }

      if (cube.fallen) {
        allStanding = false;
        // Auto-start restacking
        cube.restacking = true;
        cube.restackTimer = 0;
        continue;
      }

      // Apply drift force — higher cubes drift more (instability amplification)
      const heightMultiplier = 1 + i * 0.3;
      cube.tiltDeg += cube.driftDirection * this.driftForce * heightMultiplier * dt * 60 * (1 + tension * 0.5);

      // If this is the selected cube, apply sphere counteraction
      if (i === this.selectedCubeIndex) {
        // Sphere tilt counteracts cube drift
        cube.tiltDeg -= sphereTiltDeg * 0.1 * dt * 60;
      }

      // Propagate tilt from lower cubes (stacking instability)
      if (i > 0 && !this.stackCubes[i - 1].fallen) {
        cube.tiltDeg += this.stackCubes[i - 1].tiltDeg * 0.2 * dt;
      }

      // Check for fall
      if (Math.abs(cube.tiltDeg) >= this.alignmentThresholdDeg) {
        cube.fallen = true;
        allStanding = false;

        // Tension increase on fall
        if (this.scene?.metadata) {
          this.scene.metadata.currentTension = Math.min(
            1,
            (this.scene.metadata.currentTension ?? 0) + 0.05,
          );
        }
      }
    }

    // Stack complete timer
    if (allStanding && this.stackCubes.length > 0) {
      this.stackCompleteTimer += dt;
      if (this.stackCompleteTimer >= STACK_COMPLETE_DURATION_S) {
        this.stackCompleteTimer = 0;
        // Tension decrease for maintaining the stack
        if (this.scene?.metadata) {
          this.scene.metadata.currentTension = Math.max(
            0,
            (this.scene.metadata.currentTension ?? 0) - 0.08,
          );
        }
      }
    } else {
      this.stackCompleteTimer = 0;
    }
  }

  /** Get stack cube states (for external rendering / testing) */
  getStackCubes(): ReadonlyArray<StackCubeState> {
    return this.stackCubes;
  }

  /** Get the currently selected cube index */
  getSelectedCubeIndex(): number {
    return this.selectedCubeIndex;
  }

  /** Get the number of standing (non-fallen) cubes */
  getStandingCount(): number {
    return this.stackCubes.filter((c) => !c.fallen && !c.restacking).length;
  }

  dispose(): void {
    this.stackCubes = [];
    this.selectedCubeIndex = 0;
    this.elapsedTime = 0;
    this.stackCompleteTimer = 0;
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.leverMesh = null;
  }
}

// Self-register
registerHandler('CubeStack', CubeStackHandler);
