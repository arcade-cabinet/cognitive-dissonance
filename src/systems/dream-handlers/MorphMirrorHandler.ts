/**
 * MorphMirrorDream handler
 *
 * Mechanics:
 * - Morph cube performs a continuous motion pattern (rotation, stretch, or oscillate)
 * - Player must MIRROR the motion with the sphere trackball (inverse mapping)
 * - Rotation: cube rotates clockwise -> player must rotate sphere counterclockwise
 * - Stretch: cube scales on X -> player rotates sphere on X axis
 * - Oscillate: cube bobs up/down -> player applies vertical trackball gesture
 * - inversePrecisionDeg is how close the mirror must be (lower = harder)
 * - Pattern changes every patternChangeIntervalS (new random motion)
 * - Matching the mirror reduces tension, diverging increases it
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

type MotionType = 'rotation' | 'stretch' | 'oscillate';

export class MorphMirrorHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private sphereMesh: Mesh | null = null;
  private morphCubeMesh: Mesh | null = null;

  // Slot parameters
  private cubePatternSpeed = 0.8;
  private cubeMotionType: MotionType = 'rotation';
  private inversePrecisionDeg = 20;
  private patternChangeIntervalS = 6;

  // Runtime state
  private patternTimer = 0;
  private cubePhase = 0; // Current phase of cube motion (radians)
  private expectedSphereAngle = 0; // What the sphere angle SHOULD be (inverse of cube)
  private previousSphereAngle = 0;
  private matchAccumulator = 0; // Tracks how well player is matching

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;

    // Read slot parameters from archetype
    const slots = entity.archetype?.slots;
    if (slots && 'cubePatternSpeed' in slots) {
      this.cubePatternSpeed = slots.cubePatternSpeed;
      this.cubeMotionType = slots.cubeMotionType;
      this.inversePrecisionDeg = slots.inversePrecisionDeg;
      this.patternChangeIntervalS = slots.patternChangeIntervalS;
    }

    // Find meshes
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.morphCubeMesh = scene.getMeshByName('morphCube') as Mesh;

    if (!this.sphereMesh) {
      console.warn('[MorphMirrorHandler] Sphere mesh not found in scene');
    }
    if (!this.morphCubeMesh) {
      console.warn('[MorphMirrorHandler] Morph cube mesh not found in scene');
    }

    // Initialize state
    this.patternTimer = 0;
    this.cubePhase = 0;
    this.expectedSphereAngle = 0;
    this.previousSphereAngle = this.sphereMesh?.rotation.y ?? 0;
    this.matchAccumulator = 0;
  }

  update(dt: number): void {
    if (!this.morphCubeMesh || !this.sphereMesh) return;

    // Advance cube motion phase
    this.cubePhase += this.cubePatternSpeed * dt;

    // Animate cube based on motion type
    this.animateCube(dt);

    // Calculate expected sphere inverse angle
    this.calculateExpectedInverse();

    // Compare actual sphere rotation to expected inverse
    const currentSphereAngleDeg = (this.sphereMesh.rotation.y * 180) / Math.PI;
    const expectedDeg = (this.expectedSphereAngle * 180) / Math.PI;
    const angleDiff = Math.abs(((currentSphereAngleDeg - expectedDeg + 540) % 360) - 180);

    // Update tension based on match quality
    if (this.scene?.metadata) {
      if (angleDiff <= this.inversePrecisionDeg) {
        // Good match — decrease tension
        this.matchAccumulator += dt;
        this.scene.metadata.currentTension = Math.max(
          0,
          (this.scene.metadata.currentTension ?? 0) - 0.02 * dt,
        );
      } else {
        // Poor match — increase tension proportionally to divergence
        const divergenceRatio = Math.min(1, angleDiff / 180);
        this.scene.metadata.currentTension = Math.min(
          1,
          (this.scene.metadata.currentTension ?? 0) + 0.03 * divergenceRatio * dt,
        );
      }
    }

    // Track previous sphere angle
    this.previousSphereAngle = this.sphereMesh.rotation.y;

    // Pattern change timer
    this.patternTimer += dt;
    if (this.patternTimer >= this.patternChangeIntervalS) {
      this.patternTimer = 0;
      this.changePattern();
    }
  }

  /** Animate the morph cube based on current motion type */
  private animateCube(_dt: number): void {
    if (!this.morphCubeMesh) return;

    switch (this.cubeMotionType) {
      case 'rotation':
        // Cube rotates around Y-axis
        this.morphCubeMesh.rotation.y = this.cubePhase;
        break;
      case 'stretch':
        // Cube scales on X based on sine wave
        this.morphCubeMesh.rotation.x = Math.sin(this.cubePhase) * 0.5;
        break;
      case 'oscillate':
        // Cube bobs up and down
        this.morphCubeMesh.position.y = 0.3 + Math.sin(this.cubePhase) * 0.2;
        break;
    }
  }

  /** Calculate the expected inverse sphere angle based on cube motion */
  private calculateExpectedInverse(): void {
    switch (this.cubeMotionType) {
      case 'rotation':
        // Inverse: counterclockwise (negate the cube phase)
        this.expectedSphereAngle = -this.cubePhase;
        break;
      case 'stretch':
        // Inverse: sphere X rotation mirrors cube X
        this.expectedSphereAngle = -Math.sin(this.cubePhase) * 0.5;
        break;
      case 'oscillate':
        // Inverse: vertical gesture mapped to sphere Y rotation
        this.expectedSphereAngle = -Math.sin(this.cubePhase) * 0.3;
        break;
    }
  }

  /** Change to a new random motion pattern */
  private changePattern(): void {
    const motionTypes: MotionType[] = ['rotation', 'stretch', 'oscillate'];
    const available = motionTypes.filter((t) => t !== this.cubeMotionType);
    this.cubeMotionType = available[Math.floor(Math.random() * available.length)];
    this.cubePhase = 0;
  }

  /** Get current motion type (for external system / visual feedback) */
  getCurrentMotionType(): MotionType {
    return this.cubeMotionType;
  }

  /** Get match accumulator (total seconds of good mirroring) */
  getMatchAccumulator(): number {
    return this.matchAccumulator;
  }

  dispose(): void {
    if (this.morphCubeMesh) {
      gsap.killTweensOf(this.morphCubeMesh.position);
      gsap.killTweensOf(this.morphCubeMesh.rotation);
    }
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.morphCubeMesh = null;
    this.patternTimer = 0;
    this.cubePhase = 0;
    this.expectedSphereAngle = 0;
    this.matchAccumulator = 0;
  }
}

// Self-register
registerHandler('MorphMirror', MorphMirrorHandler);
