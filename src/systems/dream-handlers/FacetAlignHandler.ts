/**
 * FacetAlignDream handler
 *
 * Mechanics:
 * - Crystalline cube floats above sphere with facetCount visible facets
 * - Each facet has a "target angle" — sphere rotation that aligns with it
 * - Player rotates sphere (trackball) to align with facet targets
 * - When sphere rotation is within alignmentThresholdDeg of a facet, that facet "locks" (glow green)
 * - After lockoutDurationMs, locked facet becomes permanent
 * - Every scrambleIntervalS, unlocked facets re-randomize their target angles
 * - Tension increases when facets scramble, decreases when facets lock
 * - All facets locked = Dream complete bonus (tension drops 0.15)
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** State for an individual facet */
interface FacetState {
  targetAngleDeg: number;
  locked: boolean;
  lockTimer: number; // ms elapsed while within threshold
  permanent: boolean;
}

export class FacetAlignHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private sphereMesh: Mesh | null = null;
  private cubeMesh: Mesh | null = null;

  // Slot parameters
  private facetCount = 6;
  private alignmentThresholdDeg = 12;
  private scrambleIntervalS = 14;
  private lockoutDurationMs = 600;

  // Runtime state
  private facets: FacetState[] = [];
  private scrambleTimer = 0;
  private dreamComplete = false;

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;

    // Read slot parameters from archetype
    const slots = entity.archetype?.slots;
    if (slots && 'facetCount' in slots) {
      this.facetCount = slots.facetCount;
      this.alignmentThresholdDeg = slots.alignmentThresholdDeg;
      this.scrambleIntervalS = slots.scrambleIntervalS;
      this.lockoutDurationMs = slots.lockoutDurationMs;
    }

    // Find meshes
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.cubeMesh = scene.getMeshByName('crystallineCube') as Mesh;

    if (!this.sphereMesh) {
      console.warn('[FacetAlignHandler] Sphere mesh not found in scene');
    }
    if (!this.cubeMesh) {
      console.warn('[FacetAlignHandler] Crystalline cube mesh not found in scene');
    }

    // Float cube above sphere
    if (this.cubeMesh) {
      gsap.to(this.cubeMesh.position, { y: 0.6, duration: 1.2, ease: 'power2.out' });
    }

    // Initialize facets with random target angles
    this.facets = [];
    for (let i = 0; i < this.facetCount; i++) {
      this.facets.push({
        targetAngleDeg: Math.random() * 360,
        locked: false,
        lockTimer: 0,
        permanent: false,
      });
    }

    this.scrambleTimer = 0;
    this.dreamComplete = false;
  }

  update(dt: number): void {
    if (!this.sphereMesh || this.dreamComplete) return;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Current sphere rotation in degrees (Y-axis as primary rotation)
    const sphereAngleDeg = ((this.sphereMesh.rotation.y * 180) / Math.PI) % 360;

    // Check each facet alignment
    for (const facet of this.facets) {
      if (facet.permanent) continue;

      // Angular distance (wrapping around 360)
      const diff = Math.abs(((sphereAngleDeg - facet.targetAngleDeg + 540) % 360) - 180);

      if (diff <= this.alignmentThresholdDeg) {
        // Within threshold — accumulate lock timer
        facet.lockTimer += dt * 1000; // dt is in seconds, lockoutDurationMs is in ms
        if (facet.lockTimer >= this.lockoutDurationMs) {
          facet.locked = true;
          facet.permanent = true;
          facet.lockTimer = 0;

          // Tension decrease on lock
          if (this.scene?.metadata) {
            this.scene.metadata.currentTension = Math.max(
              0,
              (this.scene.metadata.currentTension ?? 0) - 0.05,
            );
          }
        }
      } else {
        // Outside threshold — reset lock timer
        facet.lockTimer = 0;
        facet.locked = false;
      }
    }

    // Check dream completion (all facets permanently locked)
    const allPermanent = this.facets.every((f) => f.permanent);
    if (allPermanent && this.facets.length > 0) {
      this.dreamComplete = true;
      if (this.scene?.metadata) {
        this.scene.metadata.currentTension = Math.max(
          0,
          (this.scene.metadata.currentTension ?? 0) - 0.15,
        );
      }
      return;
    }

    // Scramble timer — scales inversely with tension (higher tension = faster scrambles)
    const effectiveScrambleInterval = this.scrambleIntervalS / (1 + tension * 0.5);
    this.scrambleTimer += dt;
    if (this.scrambleTimer >= effectiveScrambleInterval) {
      this.scrambleTimer = 0;
      this.scrambleFacets();
    }
  }

  /** Re-randomize target angles for all unlocked facets */
  private scrambleFacets(): void {
    for (const facet of this.facets) {
      if (!facet.permanent) {
        facet.targetAngleDeg = Math.random() * 360;
        facet.locked = false;
        facet.lockTimer = 0;
      }
    }

    // Tension spike on scramble
    if (this.scene?.metadata) {
      this.scene.metadata.currentTension = Math.min(
        1,
        (this.scene.metadata.currentTension ?? 0) + 0.04,
      );
    }
  }

  /** Get current facet states (for external system / visual feedback) */
  getFacets(): ReadonlyArray<FacetState> {
    return this.facets;
  }

  /** Check if dream is complete */
  isDreamComplete(): boolean {
    return this.dreamComplete;
  }

  dispose(): void {
    if (this.cubeMesh) {
      gsap.killTweensOf(this.cubeMesh.position);
    }
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.cubeMesh = null;
    this.facets = [];
    this.scrambleTimer = 0;
    this.dreamComplete = false;
  }
}

// Self-register
registerHandler('FacetAlign', FacetAlignHandler);
