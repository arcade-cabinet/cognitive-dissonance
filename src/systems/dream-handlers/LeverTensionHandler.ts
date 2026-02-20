/**
 * LeverTensionDream handler
 *
 * Mechanics:
 * - MODE_LEVER is primary input (corruption tendrils target lever instead of keycaps)
 * - Lever has continuous resistance position (0.0-1.0)
 * - Corruption patterns carry "frequency" value (0.0-1.0)
 * - Player must match lever position within +/-tolerance (seed-derived, scales with difficulty)
 * - Garage-door slit opens/closes rhythmically (seed-derived period 1.5-4s)
 * - Patterns emerge from slit during open phase only
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

export class LeverTensionHandler implements DreamHandler {
  private entity: GameEntity | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future scene access and disposed in dispose()
  private scene: Scene | null = null;
  private slitTopMesh: Mesh | null = null;
  private slitBottomMesh: Mesh | null = null;
  private slitPeriod = 2.5; // seconds
  private slitPhase = 0; // 0 = closed, 1 = open
  private slitTimer = 0;
  private frequencyTolerance = 0.15; // +/-0.15 base

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;
    this.slitPeriod = entity.slitPeriod ?? 2.5;
    this.frequencyTolerance = entity.frequencyTolerance ?? 0.15;

    // Find slit meshes
    this.slitTopMesh = scene.getMeshByName('slitTop') as Mesh;
    this.slitBottomMesh = scene.getMeshByName('slitBottom') as Mesh;

    if (!this.slitTopMesh || !this.slitBottomMesh) {
      console.warn('[LeverTensionHandler] Slit meshes not found in scene');
    }

    // Start slit cycle
    this.slitTimer = 0;
    this.slitPhase = 0;
  }

  update(dt: number): void {
    if (!this.entity) return;

    // Update slit cycle timer
    this.slitTimer += dt;
    if (this.slitTimer >= this.slitPeriod) {
      this.slitTimer = 0;
      this.slitPhase = this.slitPhase === 0 ? 1 : 0;

      // Animate slit open/close
      if (this.slitPhase === 1) {
        this.openSlit();
      } else {
        this.closeSlit();
      }
    }
  }

  private openSlit(): void {
    if (!this.slitTopMesh || !this.slitBottomMesh) return;

    // Top slides up, bottom slides down
    gsap.to(this.slitTopMesh.position, { y: 0.15, duration: 0.4, ease: 'power2.out' });
    gsap.to(this.slitBottomMesh.position, { y: -0.15, duration: 0.5, ease: 'power2.out' });
  }

  private closeSlit(): void {
    if (!this.slitTopMesh || !this.slitBottomMesh) return;

    // Return to closed position
    gsap.to(this.slitTopMesh.position, { y: 0.05, duration: 0.4, ease: 'power2.in' });
    gsap.to(this.slitBottomMesh.position, { y: -0.05, duration: 0.5, ease: 'power2.in' });
  }

  /**
   * Check if lever position matches pattern frequency within tolerance
   */
  matchesFrequency(leverPosition: number, patternFrequency: number): boolean {
    return Math.abs(leverPosition - patternFrequency) <= this.frequencyTolerance;
  }

  /**
   * Check if slit is currently open (patterns can emerge)
   */
  isSlitOpen(): boolean {
    return this.slitPhase === 1;
  }

  dispose(): void {
    // Stop slit animations
    if (this.slitTopMesh) gsap.killTweensOf(this.slitTopMesh.position);
    if (this.slitBottomMesh) gsap.killTweensOf(this.slitBottomMesh.position);

    this.entity = null;
    this.scene = null;
    this.slitTopMesh = null;
    this.slitBottomMesh = null;
  }
}

// Self-register
registerHandler('LeverTension', LeverTensionHandler);
