/**
 * Resonance dream handler
 *
 * Mechanics:
 * - A "resonance frequency" target drifts slowly over time
 * - LEVER controls the player's frequency (position 0.0-1.0 maps to frequency)
 * - Player must match lever to resonance frequency within toleranceBand
 * - While matched, a resonance counter fills up
 * - Must hold match for holdDurationS to complete resonance
 * - Sphere rotation controls "amplitude" — smoother rotation = higher amplitude = faster fill
 * - Target frequency drifts at frequencyDriftRate per second
 * - CrystallineCube pulses brighter as resonance builds (visual feedback)
 * - Complete resonance = tension drops significantly
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { ResonanceSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

export class ResonanceHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private resonanceFrequency = 0.5;
  private toleranceBand = 0.1;
  private frequencyDriftRate = 0.005;
  private amplitudeRange: [number, number] = [0.2, 0.8];
  private holdDurationS = 5;

  // Runtime state
  private leverMesh: Mesh | null = null;
  private sphereMesh: Mesh | null = null;
  private cubeMesh: Mesh | null = null;
  private currentTargetFrequency = 0.5;
  private resonanceProgress = 0; // 0.0 to holdDurationS
  private driftDirection = 1; // 1 or -1
  private lastSphereRotationY = 0;
  private smoothnessAccumulator = 0;
  private smoothnessSamples = 0;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as ResonanceSlots | undefined;
    this.resonanceFrequency = slots?.resonanceFrequency ?? 0.5;
    this.toleranceBand = slots?.toleranceBand ?? 0.1;
    this.frequencyDriftRate = slots?.frequencyDriftRate ?? 0.005;
    this.amplitudeRange = slots?.amplitudeRange ?? [0.2, 0.8];
    this.holdDurationS = slots?.holdDurationS ?? 5;

    // Initialize state
    this.currentTargetFrequency = this.resonanceFrequency;
    this.resonanceProgress = 0;
    this.driftDirection = 1;
    this.lastSphereRotationY = 0;
    this.smoothnessAccumulator = 0;
    this.smoothnessSamples = 0;

    // Find meshes
    this.leverMesh = scene.getMeshByName('lever') as Mesh;
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    this.cubeMesh = scene.getMeshByName('crystallineCube') as Mesh;

    if (!this.leverMesh) {
      console.warn('[ResonanceHandler] Lever mesh not found in scene');
    }
    if (!this.sphereMesh) {
      console.warn('[ResonanceHandler] Sphere mesh not found in scene');
    }

    // Initialize sphere rotation tracking
    if (this.sphereMesh) {
      this.lastSphereRotationY = this.sphereMesh.rotation.y;
    }
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Drift target frequency
    this.currentTargetFrequency += this.frequencyDriftRate * this.driftDirection * dt;

    // Bounce frequency within 0.05-0.95 range
    if (this.currentTargetFrequency >= 0.95) {
      this.currentTargetFrequency = 0.95;
      this.driftDirection = -1;
    } else if (this.currentTargetFrequency <= 0.05) {
      this.currentTargetFrequency = 0.05;
      this.driftDirection = 1;
    }

    // Get lever position as player's frequency
    const leverPosition = this.entity.lever?.position ?? this.entity.modeLeverPosition ?? 0.5;
    const frequencyDiff = Math.abs(leverPosition - this.currentTargetFrequency);
    const isMatched = frequencyDiff <= this.toleranceBand;

    // Calculate sphere smoothness (amplitude modifier)
    const amplitude = this.calculateAmplitude();

    if (isMatched) {
      // Accumulate resonance progress, scaled by amplitude
      const fillRate = amplitude * dt;
      this.resonanceProgress += fillRate;

      // Check for resonance completion
      if (this.resonanceProgress >= this.holdDurationS) {
        // Resonance complete — significant tension drop
        if (this.scene.metadata) {
          this.scene.metadata.currentTension = Math.max(0, tension - 0.2);
        }
        // Reset for next resonance cycle
        this.resonanceProgress = 0;
        this.currentTargetFrequency = this.resonanceFrequency;
      }
    } else {
      // Not matched — resonance decays
      this.resonanceProgress = Math.max(0, this.resonanceProgress - dt * 0.3);

      // Slight tension increase when not matched
      if (this.scene.metadata) {
        this.scene.metadata.currentTension = Math.min(1, tension + 0.005 * dt);
      }
    }

    // Update crystalline cube glow based on resonance progress
    this.updateCubeGlow();
  }

  private calculateAmplitude(): number {
    if (!this.sphereMesh) return this.amplitudeRange[0];

    // Measure rotation smoothness (delta between frames)
    const currentRotY = this.sphereMesh.rotation.y;
    const rotationDelta = Math.abs(currentRotY - this.lastSphereRotationY);
    this.lastSphereRotationY = currentRotY;

    // Track smoothness: lower delta variance = smoother = higher amplitude
    this.smoothnessAccumulator += rotationDelta;
    this.smoothnessSamples++;

    // Compute smoothness as inverse of jerkiness
    const avgDelta = this.smoothnessSamples > 0 ? this.smoothnessAccumulator / this.smoothnessSamples : 0;
    const smoothness = Math.max(0, 1 - avgDelta * 10); // Higher is smoother

    // Map smoothness to amplitude range
    const [minAmp, maxAmp] = this.amplitudeRange;
    return minAmp + smoothness * (maxAmp - minAmp);
  }

  private updateCubeGlow(): void {
    if (!this.cubeMesh?.material || !('emissiveColor' in this.cubeMesh.material)) return;

    const progress = this.resonanceProgress / this.holdDurationS;
    const glowIntensity = Math.min(1, progress);

    // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
    (this.cubeMesh.material as any).emissiveColor = {
      r: 0.1 + glowIntensity * 0.5,
      g: 0.2 + glowIntensity * 0.6,
      b: 0.8 + glowIntensity * 0.2,
    };
  }

  /** Get current resonance state for external query */
  getResonanceState(): {
    targetFrequency: number;
    progress: number;
    holdDuration: number;
    isComplete: boolean;
  } {
    return {
      targetFrequency: this.currentTargetFrequency,
      progress: this.resonanceProgress,
      holdDuration: this.holdDurationS,
      isComplete: this.resonanceProgress >= this.holdDurationS,
    };
  }

  dispose(): void {
    // Reset cube glow
    if (this.cubeMesh?.material && 'emissiveColor' in this.cubeMesh.material) {
      // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
      (this.cubeMesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
    }

    // Kill any GSAP tweens
    if (this.leverMesh) gsap.killTweensOf(this.leverMesh.position);
    if (this.sphereMesh) gsap.killTweensOf(this.sphereMesh.rotation);
    if (this.cubeMesh) gsap.killTweensOf(this.cubeMesh.position);

    this.entity = null;
    this.scene = null;
    this.leverMesh = null;
    this.sphereMesh = null;
    this.cubeMesh = null;
    this.resonanceProgress = 0;
  }
}

// Self-register
registerHandler('Resonance', ResonanceHandler);
