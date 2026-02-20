/**
 * LockPick dream handler
 *
 * Mechanics:
 * - Sphere has pinCount "pins" at specific rotation angles (notchPositions)
 * - Player rotates sphere to find each pin's notch position
 * - When sphere rotation is within notchWidthDeg of a pin's notch, that pin "clicks" (audio cue)
 * - Player must then HOLD lever for leverHoldDurationMs to lock the pin
 * - If sphere moves off the notch before lever hold completes, pin resets
 * - resetPenalty: 'reset-all' = ALL pins reset, 'reset-one' = only current pin resets
 * - All pins locked = Dream complete bonus
 * - Tension increases with each failed attempt, decreases with each locked pin
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { LockPickSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** Tracks the state of a single lock pin */
interface PinState {
  notchAngleDeg: number;
  locked: boolean;
  leverHoldProgress: number; // ms accumulated
}

export class LockPickHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private pinCount = 5;
  private notchWidthDeg = 8;
  private notchPositions: number[] = [];
  private resetPenalty: 'reset-all' | 'reset-one' = 'reset-one';
  private leverHoldDurationMs = 500;

  // Runtime state
  private sphereMesh: Mesh | null = null;
  private leverMesh: Mesh | null = null;
  private pins: PinState[] = [];
  private currentPinIndex = 0;
  private leverHeld = false;
  private failedAttempts = 0;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as LockPickSlots | undefined;
    this.pinCount = slots?.pinCount ?? 5;
    this.notchWidthDeg = slots?.notchWidthDeg ?? 8;
    this.notchPositions = slots?.notchPositions ?? this.generateDefaultNotchPositions();
    this.resetPenalty = slots?.resetPenalty ?? 'reset-one';
    this.leverHoldDurationMs = slots?.leverHoldDurationMs ?? 500;

    // Initialize pin states
    this.pins = [];
    for (let i = 0; i < this.pinCount; i++) {
      this.pins.push({
        notchAngleDeg: this.notchPositions[i] ?? (i * (360 / this.pinCount)),
        locked: false,
        leverHoldProgress: 0,
      });
    }

    this.currentPinIndex = 0;
    this.leverHeld = false;
    this.failedAttempts = 0;

    // Find sphere mesh
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    if (!this.sphereMesh) {
      console.warn('[LockPickHandler] Sphere mesh not found in scene');
    }

    // Find lever mesh
    this.leverMesh = scene.getMeshByName('lever') as Mesh;
    if (!this.leverMesh) {
      console.warn('[LockPickHandler] Lever mesh not found in scene');
    }
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Check if all pins are locked
    if (this.areAllPinsLocked()) return;

    // Find next unlocked pin
    this.currentPinIndex = this.pins.findIndex((p) => !p.locked);
    if (this.currentPinIndex === -1) return;

    const currentPin = this.pins[this.currentPinIndex];

    // Get sphere rotation in degrees (Y-axis rotation mapped to 0-360)
    const sphereRotationDeg = this.getSphereRotationDeg();

    // Check if sphere is aligned with current pin's notch
    const angleDiff = Math.abs(this.normalizeAngle(sphereRotationDeg - currentPin.notchAngleDeg));
    const isAligned = angleDiff <= this.notchWidthDeg / 2;

    // Check lever hold state
    const leverPosition = this.entity.lever?.position ?? this.entity.modeLeverPosition ?? 0;
    this.leverHeld = leverPosition > 0.7; // Lever pulled past 70%

    if (isAligned && this.leverHeld) {
      // Accumulate lever hold progress
      currentPin.leverHoldProgress += dt * 1000;

      if (currentPin.leverHoldProgress >= this.leverHoldDurationMs) {
        // Pin locked
        currentPin.locked = true;
        currentPin.leverHoldProgress = 0;

        // Decrease tension for successful lock
        if (this.scene.metadata) {
          this.scene.metadata.currentTension = Math.max(0, tension - 0.05);
        }
      }
    } else if (this.leverHeld && !isAligned && currentPin.leverHoldProgress > 0) {
      // Sphere moved off notch during lever hold — penalty
      this.applyResetPenalty();
      this.failedAttempts++;

      // Increase tension for failed attempt
      if (this.scene.metadata) {
        this.scene.metadata.currentTension = Math.min(1, tension + 0.03);
      }
    } else if (!this.leverHeld) {
      // Lever released — reset hold progress but no penalty
      currentPin.leverHoldProgress = 0;
    }
  }

  private generateDefaultNotchPositions(): number[] {
    const positions: number[] = [];
    for (let i = 0; i < this.pinCount; i++) {
      positions.push(Math.random() * 360);
    }
    return positions;
  }

  private getSphereRotationDeg(): number {
    if (!this.sphereMesh) return 0;
    // Convert Y-axis rotation (radians) to degrees, normalize to 0-360
    const radians = this.sphereMesh.rotation.y;
    return this.normalizeAngle((radians * 180) / Math.PI);
  }

  private normalizeAngle(angle: number): number {
    let normalized = angle % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
  }

  private applyResetPenalty(): void {
    if (this.resetPenalty === 'reset-all') {
      // Reset ALL pins
      for (const pin of this.pins) {
        pin.locked = false;
        pin.leverHoldProgress = 0;
      }
    } else {
      // Reset only current pin
      const pin = this.pins[this.currentPinIndex];
      if (pin) {
        pin.leverHoldProgress = 0;
      }
    }
  }

  /** Check if all pins are locked */
  areAllPinsLocked(): boolean {
    return this.pins.length > 0 && this.pins.every((p) => p.locked);
  }

  /** Get pin states for external query */
  getPinStates(): ReadonlyArray<{ locked: boolean; holdProgress: number }> {
    return this.pins.map((p) => ({ locked: p.locked, holdProgress: p.leverHoldProgress }));
  }

  /** Get number of failed attempts */
  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  dispose(): void {
    // Kill any GSAP tweens
    if (this.sphereMesh) {
      gsap.killTweensOf(this.sphereMesh.rotation);
    }
    if (this.leverMesh) {
      gsap.killTweensOf(this.leverMesh.position);
    }

    this.pins = [];
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.leverMesh = null;
  }
}

// Self-register
registerHandler('LockPick', LockPickHandler);
