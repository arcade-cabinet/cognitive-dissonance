/**
 * TurntableScratch dream handler
 *
 * Mechanics:
 * - Platter rotates at BPM-derived speed, acting as a turntable
 * - "Scratch points" are marked positions on the platter rotation
 * - Player must reverse platter direction (via lever or touch) when passing scratch points
 * - Scratch window: +/-scratchWindowMs tolerance around the scratch point
 * - keyDropSubset keycaps "drop" (emerge) on beat for bonus coherence
 * - Missing a scratch point increases tension by 0.03
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { TurntableScratchSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** A scratch point on the platter */
interface ScratchPoint {
  angle: number; // radians
  hit: boolean; // whether player scratched at this point in the current phrase
}

export class TurntableScratchHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private phraseLengthBeats = 8;
  private scratchPointCount = 2;
  private bpm = 120;
  private keyDropSubset: string[] = [];
  private scratchWindowMs = 200;

  // Derived
  private beatPeriod = 0.5; // seconds per beat
  private phraseDuration = 4; // seconds per phrase
  private rotationSpeed = 0; // radians per second

  // Runtime state
  private platterMesh: Mesh | null = null;
  private leverMesh: Mesh | null = null;
  private keycapMeshes: Map<string, Mesh> = new Map();
  private scratchPoints: ScratchPoint[] = [];
  private platterAngle = 0; // current platter rotation in radians
  private elapsedTime = 0;
  private beatClock = 0;
  private currentBeat = 0;
  private lastLeverPosition = 0;
  private scratchDetected = false;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as TurntableScratchSlots | undefined;
    this.phraseLengthBeats = slots?.phraseLengthBeats ?? 8;
    this.scratchPointCount = slots?.scratchPoints ?? 2;
    this.bpm = slots?.bpm ?? 120;
    this.keyDropSubset = slots?.keyDropSubset ?? ['Q', 'W', 'E'];
    this.scratchWindowMs = slots?.scratchWindowMs ?? 200;

    // Calculate derived values
    this.beatPeriod = 60 / this.bpm;
    this.phraseDuration = this.beatPeriod * this.phraseLengthBeats;
    // Full rotation over one phrase
    this.rotationSpeed = (2 * Math.PI) / this.phraseDuration;

    // Find platter and lever meshes
    this.platterMesh = scene.getMeshByName('platter') as Mesh;
    this.leverMesh = scene.getMeshByName('lever') as Mesh;

    // Find keycap meshes for key drops
    for (const letter of this.keyDropSubset) {
      const mesh = scene.getMeshByName(`keycap-${letter}`) as Mesh;
      if (mesh) {
        this.keycapMeshes.set(letter, mesh);
      }
    }

    // Mark scratch point angles (evenly distributed across the phrase rotation)
    this.scratchPoints = [];
    for (let i = 0; i < this.scratchPointCount; i++) {
      const angle = ((i + 1) / (this.scratchPointCount + 1)) * 2 * Math.PI;
      this.scratchPoints.push({ angle, hit: false });
    }

    this.platterAngle = 0;
    this.elapsedTime = 0;
    this.beatClock = 0;
    this.currentBeat = 0;
    this.lastLeverPosition = 0;
    this.scratchDetected = false;

    // Start platter rotation via GSAP (continuous)
    if (this.platterMesh) {
      this.animatePlatterRotation();
    }
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    this.elapsedTime += dt;
    this.beatClock += dt;

    // Update platter angle
    this.platterAngle += this.rotationSpeed * dt;

    // Wrap angle to 0-2PI range
    const phraseAngle = this.platterAngle % (2 * Math.PI);

    // Check lever state for scratch detection
    const leverPosition: number = this.scene?.metadata?.leverPosition ?? 0;
    const leverChanged = Math.abs(leverPosition - this.lastLeverPosition) > 0.1;
    this.scratchDetected = leverChanged && leverPosition < this.lastLeverPosition;
    this.lastLeverPosition = leverPosition;

    // Check proximity to scratch points
    const scratchWindowRad = (this.scratchWindowMs / 1000) * this.rotationSpeed;

    for (const point of this.scratchPoints) {
      if (point.hit) continue;

      const angleDiff = Math.abs(phraseAngle - point.angle);
      const withinWindow = angleDiff <= scratchWindowRad || (2 * Math.PI - angleDiff) <= scratchWindowRad;

      if (withinWindow) {
        if (this.scratchDetected) {
          // Successful scratch
          point.hit = true;
        }
      } else if (phraseAngle > point.angle + scratchWindowRad && !point.hit) {
        // Missed scratch point — increase tension
        point.hit = true; // Mark as processed (missed)
        if (this.scene?.metadata) {
          const currentTension = this.scene.metadata.currentTension ?? 0;
          this.scene.metadata.currentTension = Math.min(1, currentTension + 0.03);
        }
      }
    }

    // Check for phrase end — reset scratch points
    if (this.platterAngle >= 2 * Math.PI) {
      this.platterAngle -= 2 * Math.PI;
      for (const point of this.scratchPoints) {
        point.hit = false;
      }
    }

    // Drop keycaps on beat
    const newBeat = Math.floor(this.beatClock / this.beatPeriod);
    if (newBeat !== this.currentBeat) {
      this.currentBeat = newBeat;
      this.dropKeycapOnBeat();
    }
  }

  private animatePlatterRotation(): void {
    if (!this.platterMesh) return;

    // Continuous rotation driven by update(), this is just for initial visual feedback
    gsap.to(this.platterMesh.rotation, {
      y: `+=${Math.PI * 2}`,
      duration: this.phraseDuration,
      ease: 'none',
      repeat: -1,
    });
  }

  private dropKeycapOnBeat(): void {
    if (this.keyDropSubset.length === 0) return;

    // Pick a keycap from the drop subset based on beat
    const letter = this.keyDropSubset[this.currentBeat % this.keyDropSubset.length];
    const mesh = this.keycapMeshes.get(letter);
    if (!mesh) return;

    // Emerge (drop up) and retract animation
    gsap.to(mesh.position, {
      y: 0.03,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(mesh.position, {
          y: 0,
          duration: 0.3,
          ease: 'power2.in',
          delay: this.beatPeriod * 0.5,
        });
      },
    });
  }

  /** Get scratch point status (for testing/UI) */
  getScratchPoints(): ReadonlyArray<{ angle: number; hit: boolean }> {
    return this.scratchPoints.map((p) => ({ angle: p.angle, hit: p.hit }));
  }

  /** Get current platter angle in radians */
  getPlatterAngle(): number {
    return this.platterAngle;
  }

  dispose(): void {
    // Stop platter rotation
    if (this.platterMesh) {
      gsap.killTweensOf(this.platterMesh.rotation);
    }

    // Kill keycap tweens
    for (const mesh of this.keycapMeshes.values()) {
      gsap.killTweensOf(mesh.position);
    }

    this.keycapMeshes.clear();
    this.scratchPoints = [];
    this.platterMesh = null;
    this.leverMesh = null;
    this.entity = null;
    this.scene = null;
  }
}

// Self-register
registerHandler('TurntableScratch', TurntableScratchHandler);
