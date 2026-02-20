/**
 * ZenDriftDream handler
 *
 * Mechanics:
 * - MEDITATIVE archetype — opposite of most gameplay
 * - Sphere drifts at a constant gentle speed
 * - Player's goal: DON'T disturb the drift. Keep sphere motion smooth.
 * - Any sudden movement (angular velocity change > jerkThreshold) causes tension spike
 * - Tension naturally DECREASES over time in this mode (coherenceDecayRate)
 * - Morph cube slowly shifts shapes in response to smoothness (visual reward)
 * - gazeWeight affects how much looking away disrupts coherence (future: eye tracking)
 * - After sessionDurationS, Dream naturally completes
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

export class ZenDriftHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private sphereMesh: Mesh | null = null;
  private morphCubeMesh: Mesh | null = null;

  // Slot parameters
  private driftSpeed = 0.003; // rad/frame
  private jerkThreshold = 0.03;
  private coherenceDecayRate = 0.01;
  private sessionDurationS = 60;
  private gazeWeight = 0.5;

  // Runtime state
  private sessionTimer = 0;
  private previousAngularVelocity = 0;
  private smoothnessScore = 1.0; // 0.0-1.0, starts perfect
  private sessionComplete = false;
  private previousSphereRotationY = 0;

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;

    // Read slot parameters from archetype (use jerkThreshold as discriminator — unique to ZenDriftSlots)
    const slots = entity.archetype?.slots;
    if (slots && 'jerkThreshold' in slots) {
      this.driftSpeed = slots.driftSpeed;
      this.jerkThreshold = slots.jerkThreshold;
      this.coherenceDecayRate = slots.coherenceDecayRate;
      this.sessionDurationS = slots.sessionDurationS;
      this.gazeWeight = slots.gazeWeight;
    }

    // Find meshes
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.morphCubeMesh = scene.getMeshByName('morphCube') as Mesh;

    if (!this.sphereMesh) {
      console.warn('[ZenDriftHandler] Sphere mesh not found in scene');
    }
    if (!this.morphCubeMesh) {
      console.warn('[ZenDriftHandler] Morph cube mesh not found in scene');
    }

    // Initialize state
    this.sessionTimer = 0;
    this.previousAngularVelocity = 0;
    this.smoothnessScore = 1.0;
    this.sessionComplete = false;
    this.previousSphereRotationY = this.sphereMesh?.rotation.y ?? 0;

    // Start gentle morph cube breathing animation
    if (this.morphCubeMesh) {
      gsap.to(this.morphCubeMesh.rotation, {
        x: Math.PI * 0.1,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }

  update(dt: number): void {
    if (this.sessionComplete) return;

    // Session timer
    this.sessionTimer += dt;
    if (this.sessionTimer >= this.sessionDurationS) {
      this.sessionComplete = true;
      // Natural completion — tension drops
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.max(
          0,
          (this.scene.metadata.currentTension ?? 0) - 0.1,
        );
      }
      return;
    }

    // Apply gentle auto-drift to sphere
    if (this.sphereMesh) {
      this.sphereMesh.rotation.y += this.driftSpeed;
    }

    // Calculate current angular velocity (change in Y rotation)
    const currentRotY = this.sphereMesh?.rotation.y ?? 0;
    const currentAngularVelocity = Math.abs(currentRotY - this.previousSphereRotationY) / Math.max(dt, 0.001);

    // Detect jerk (sudden change in angular velocity)
    const jerk = Math.abs(currentAngularVelocity - this.previousAngularVelocity);

    if (jerk > this.jerkThreshold) {
      // Jerk detected — tension spike proportional to jerk magnitude
      const jerkRatio = Math.min(1, jerk / (this.jerkThreshold * 5));
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.min(
          1,
          (this.scene.metadata.currentTension ?? 0) + 0.08 * jerkRatio,
        );
      }
      // Decrease smoothness score
      this.smoothnessScore = Math.max(0, this.smoothnessScore - jerkRatio * 0.1);
    } else {
      // Smooth motion — naturally decrease tension
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.max(
          0,
          (this.scene.metadata.currentTension ?? 0) - this.coherenceDecayRate * dt,
        );
      }
      // Recover smoothness score
      this.smoothnessScore = Math.min(1, this.smoothnessScore + 0.02 * dt);
    }

    // Update morph cube visualization based on smoothness
    if (this.morphCubeMesh) {
      // Smoother play = more harmonious cube morphing (scale as visual feedback)
      const targetScale = 0.8 + this.smoothnessScore * 0.4;
      this.morphCubeMesh.rotation.z = (1 - this.smoothnessScore) * Math.PI * 0.2;
      // Use gsap for smooth visual transition
      gsap.to(this.morphCubeMesh.position, {
        y: 0.2 + this.smoothnessScore * 0.3,
        duration: 0.5,
        ease: 'sine.out',
        overwrite: 'auto',
      });
    }

    // Store for next frame
    this.previousAngularVelocity = currentAngularVelocity;
    this.previousSphereRotationY = currentRotY;
  }

  /** Get current smoothness score (0.0-1.0) */
  getSmoothnessScore(): number {
    return this.smoothnessScore;
  }

  /** Get session progress (0.0-1.0) */
  getSessionProgress(): number {
    return Math.min(1, this.sessionTimer / this.sessionDurationS);
  }

  /** Check if session has naturally completed */
  isSessionComplete(): boolean {
    return this.sessionComplete;
  }

  dispose(): void {
    if (this.morphCubeMesh) {
      gsap.killTweensOf(this.morphCubeMesh.rotation);
      gsap.killTweensOf(this.morphCubeMesh.position);
    }
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.morphCubeMesh = null;
    this.sessionTimer = 0;
    this.previousAngularVelocity = 0;
    this.smoothnessScore = 1.0;
    this.sessionComplete = false;
    this.previousSphereRotationY = 0;
  }
}

// Self-register
registerHandler('ZenDrift', ZenDriftHandler);
