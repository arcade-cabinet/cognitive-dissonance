/**
 * SphereSculptDream handler
 *
 * Mechanics:
 * - A "target shape" is displayed on the morph cube (morph target at a specific progress)
 * - Player rotates sphere on different axes to sculpt the morph cube toward the target
 * - X-axis rotation -> morph target 1, Y-axis -> morph target 2, Z-axis -> morph target 3
 * - axisMappingSensitivity controls how much sphere rotation affects morph progress
 * - morphDamping creates momentum/inertia (morph progress doesn't snap)
 * - Must hold within target tolerance for targetHoldDurationS to "complete" the shape
 * - Target changes every targetChangeIntervalS
 * - Keycaps act as "locks" — holding a keycap locks one morph axis
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** Tracks progress on each of the 3 morph axes */
interface MorphAxisState {
  current: number;   // 0.0-1.0 current morph progress
  target: number;    // 0.0-1.0 target morph progress
  velocity: number;  // current rate of change
  locked: boolean;   // locked by keycap hold
}

export class SphereSculptHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private sphereMesh: Mesh | null = null;
  private morphCubeMesh: Mesh | null = null;
  private crystallineCubeMesh: Mesh | null = null;

  // Slot parameters
  private targetComplexity = 0.6;
  private axisMappingSensitivity = 1.0;
  private morphDamping = 0.6;
  private targetHoldDurationS = 4;
  private targetChangeIntervalS = 20;

  // Runtime state
  private axes: [MorphAxisState, MorphAxisState, MorphAxisState] = [
    { current: 0, target: 0, velocity: 0, locked: false },
    { current: 0, target: 0, velocity: 0, locked: false },
    { current: 0, target: 0, velocity: 0, locked: false },
  ];
  private previousSphereRotation = { x: 0, y: 0, z: 0 };
  private holdTimer = 0;
  private targetChangeTimer = 0;
  private shapeComplete = false;
  private tolerance = 0.1; // Derived from targetComplexity

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;

    // Read slot parameters from archetype
    const slots = entity.archetype?.slots;
    if (slots && 'targetComplexity' in slots) {
      this.targetComplexity = slots.targetComplexity;
      this.axisMappingSensitivity = slots.axisMappingSensitivity;
      this.morphDamping = slots.morphDamping;
      this.targetHoldDurationS = slots.targetHoldDurationS;
      this.targetChangeIntervalS = slots.targetChangeIntervalS;
    }

    // Tolerance inversely related to complexity (higher complexity = tighter tolerance)
    this.tolerance = 0.15 - this.targetComplexity * 0.1;

    // Find meshes
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.morphCubeMesh = scene.getMeshByName('morphCube') as Mesh;
    this.crystallineCubeMesh = scene.getMeshByName('crystallineCube') as Mesh;

    if (!this.sphereMesh) {
      console.warn('[SphereSculptHandler] Sphere mesh not found in scene');
    }
    if (!this.morphCubeMesh) {
      console.warn('[SphereSculptHandler] Morph cube mesh not found in scene');
    }

    // Store initial sphere rotation
    if (this.sphereMesh) {
      this.previousSphereRotation = {
        x: this.sphereMesh.rotation.x,
        y: this.sphereMesh.rotation.y,
        z: this.sphereMesh.rotation.z,
      };
    }

    // Generate random target morph progress values
    this.generateTargets();

    this.holdTimer = 0;
    this.targetChangeTimer = 0;
    this.shapeComplete = false;
  }

  update(dt: number): void {
    if (!this.sphereMesh || this.shapeComplete) return;

    // Calculate sphere angular velocity (delta rotation this frame)
    const deltaX = this.sphereMesh.rotation.x - this.previousSphereRotation.x;
    const deltaY = this.sphereMesh.rotation.y - this.previousSphereRotation.y;
    const deltaZ = this.sphereMesh.rotation.z - this.previousSphereRotation.z;

    // Apply sphere rotation deltas to morph axes (with sensitivity)
    const deltas = [deltaX, deltaY, deltaZ];
    for (let i = 0; i < 3; i++) {
      const axis = this.axes[i];
      if (axis.locked) continue;

      // Add rotation delta to velocity (sensitivity scaling)
      axis.velocity += deltas[i] * this.axisMappingSensitivity;

      // Apply damping (exponential decay)
      axis.velocity *= this.morphDamping;

      // Update current morph progress
      axis.current = Math.max(0, Math.min(1, axis.current + axis.velocity * dt));
    }

    // Store current sphere rotation for next frame
    this.previousSphereRotation = {
      x: this.sphereMesh.rotation.x,
      y: this.sphereMesh.rotation.y,
      z: this.sphereMesh.rotation.z,
    };

    // Check if all axes are within tolerance of their targets
    const allWithinTolerance = this.axes.every(
      (axis) => Math.abs(axis.current - axis.target) <= this.tolerance,
    );

    if (allWithinTolerance) {
      this.holdTimer += dt;
      if (this.holdTimer >= this.targetHoldDurationS) {
        // Shape complete
        this.shapeComplete = true;
        if (this.scene?.metadata) {
          this.scene.metadata.currentTension = Math.max(
            0,
            (this.scene.metadata.currentTension ?? 0) - 0.1,
          );
        }
        return;
      }
    } else {
      // Reset hold timer if outside tolerance
      this.holdTimer = Math.max(0, this.holdTimer - dt * 0.5); // Gradual decay instead of instant reset
    }

    // Target change timer
    this.targetChangeTimer += dt;
    if (this.targetChangeTimer >= this.targetChangeIntervalS) {
      this.targetChangeTimer = 0;
      this.generateTargets();
      this.holdTimer = 0;
    }

    // Update morph cube visualization (if mesh exists)
    if (this.morphCubeMesh) {
      // Map morph axis progress to cube visual (rotation as proxy for morph)
      this.morphCubeMesh.rotation.x = this.axes[0].current * Math.PI;
      this.morphCubeMesh.rotation.y = this.axes[1].current * Math.PI;
      this.morphCubeMesh.rotation.z = this.axes[2].current * Math.PI;
    }
  }

  /** Generate new random target morph progress values for each axis */
  private generateTargets(): void {
    for (const axis of this.axes) {
      axis.target = Math.random() * this.targetComplexity;
    }
  }

  /** Lock a morph axis by index (0=X, 1=Y, 2=Z) — called when keycap is held */
  lockAxis(axisIndex: number): void {
    if (axisIndex >= 0 && axisIndex < 3) {
      this.axes[axisIndex].locked = true;
    }
  }

  /** Unlock a morph axis by index */
  unlockAxis(axisIndex: number): void {
    if (axisIndex >= 0 && axisIndex < 3) {
      this.axes[axisIndex].locked = false;
    }
  }

  /** Get current axis states (for external system / visual feedback) */
  getAxes(): ReadonlyArray<Readonly<MorphAxisState>> {
    return this.axes;
  }

  /** Check if shape is complete */
  isShapeComplete(): boolean {
    return this.shapeComplete;
  }

  /** Get current hold timer progress (0.0-1.0) */
  getHoldProgress(): number {
    return Math.min(1, this.holdTimer / this.targetHoldDurationS);
  }

  dispose(): void {
    if (this.morphCubeMesh) {
      gsap.killTweensOf(this.morphCubeMesh.rotation);
    }
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.morphCubeMesh = null;
    this.crystallineCubeMesh = null;
    this.axes = [
      { current: 0, target: 0, velocity: 0, locked: false },
      { current: 0, target: 0, velocity: 0, locked: false },
      { current: 0, target: 0, velocity: 0, locked: false },
    ];
    this.holdTimer = 0;
    this.targetChangeTimer = 0;
    this.shapeComplete = false;
  }
}

// Self-register
registerHandler('SphereSculpt', SphereSculptHandler);
