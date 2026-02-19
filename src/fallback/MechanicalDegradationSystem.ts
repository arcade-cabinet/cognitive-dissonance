import type { Mesh, PBRMaterial, Scene } from '@babylonjs/core';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { TensionSystem } from '../systems/TensionSystem';

/**
 * MechanicalDegradationSystem — WebGL2 fallback visual feedback
 *
 * Provides diegetic visual feedback when running on WebGL2 fallback (not WebGPU):
 * - Platter rim hairline cracks (PBR normal map intensity up to 0.8)
 * - Rotation micro-jitter (sinusoidal at 200ms period, 0.0005 amplitude)
 * - Lever resistance creep (increases GSAP timeline resistance)
 *
 * CRITICAL: Zero color or tone changes to the Sphere under any fallback condition.
 *
 * Source: ARCH v3.1 MechanicalDegradationSystem
 * Validates: Requirement 21
 */
export class MechanicalDegradationSystem {
  private static instance: MechanicalDegradationSystem | null = null;

  private scene: Scene;
  private tensionSystem: TensionSystem;
  private platterMesh: Mesh | null = null;
  private crackNormalMap: DynamicTexture | null = null;
  private currentTension = 0.0;
  private isActive = false;
  private jitterStartTime = 0;
  private baseRotationY = 0;
  private boundSetTension: (tension: number) => void;

  private constructor(scene: Scene, tensionSystem: TensionSystem) {
    this.scene = scene;
    this.tensionSystem = tensionSystem;
    this.jitterStartTime = performance.now();

    // Bind setTension method once and store reference
    this.boundSetTension = this.setTension.bind(this);

    // Register as tension listener
    this.tensionSystem.addListener(this.boundSetTension);
  }

  static getInstance(scene: Scene, tensionSystem: TensionSystem): MechanicalDegradationSystem {
    if (!MechanicalDegradationSystem.instance) {
      MechanicalDegradationSystem.instance = new MechanicalDegradationSystem(scene, tensionSystem);
    }
    return MechanicalDegradationSystem.instance;
  }

  /**
   * Activate degradation system (WebGL2 fallback detected)
   */
  activate(platterMesh: Mesh, _leverMesh: Mesh): void {
    this.isActive = true;
    this.platterMesh = platterMesh;
    this.baseRotationY = platterMesh.rotation.y;

    // Create crack normal map
    this.createCrackNormalMap();

    // Register per-frame update
    this.scene.registerBeforeRender(this.update);
  }

  /**
   * Deactivate degradation system (not needed or Dream transition)
   */
  deactivate(): void {
    this.isActive = false;
    this.scene.unregisterBeforeRender(this.update);

    // Remove crack normal map
    if (this.crackNormalMap) {
      this.crackNormalMap.dispose();
      this.crackNormalMap = null;
    }

    // Reset platter rotation
    if (this.platterMesh) {
      this.platterMesh.rotation.y = this.baseRotationY;
    }
  }

  /**
   * TensionSystem listener interface
   */
  setTension(tension: number): void {
    this.currentTension = tension;
    this.updateCrackIntensity();
  }

  /**
   * Create procedural crack normal map
   */
  private createCrackNormalMap(): void {
    if (!this.platterMesh) return;

    const size = 512;
    this.crackNormalMap = new DynamicTexture('crackNormalMap', size, this.scene, false);
    const ctx = this.crackNormalMap.getContext() as CanvasRenderingContext2D;

    // Draw hairline cracks (radial pattern from center)
    ctx.fillStyle = '#8080ff'; // Normal map neutral (no displacement)
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#4040ff'; // Slight inward normal
    ctx.lineWidth = 1;

    const centerX = size / 2;
    const centerY = size / 2;
    const numCracks = 12;

    for (let i = 0; i < numCracks; i++) {
      const angle = (i / numCracks) * Math.PI * 2;
      const startRadius = size * 0.3;
      const endRadius = size * 0.5;

      const startX = centerX + Math.cos(angle) * startRadius;
      const startY = centerY + Math.sin(angle) * startRadius;
      const endX = centerX + Math.cos(angle) * endRadius;
      const endY = centerY + Math.sin(angle) * endRadius;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    this.crackNormalMap.update();

    // Apply to platter material
    const material = this.platterMesh.material as PBRMaterial;
    if (material) {
      material.bumpTexture = this.crackNormalMap;
      material.bumpTexture.level = 0.0; // Start at zero, will scale with tension
    }
  }

  /**
   * Update crack intensity based on tension
   */
  private updateCrackIntensity(): void {
    if (!this.platterMesh || !this.crackNormalMap) return;

    const material = this.platterMesh.material as PBRMaterial;
    if (material?.bumpTexture) {
      // Scale crack intensity from 0.0 to 0.8 with tension
      material.bumpTexture.level = this.currentTension * 0.8;
    }
  }

  /**
   * Per-frame update: rotation micro-jitter
   */
  private update = (): void => {
    if (!this.isActive || !this.platterMesh) return;

    const elapsed = performance.now() - this.jitterStartTime;
    const jitterPeriod = 200; // ms
    const jitterAmplitude = 0.0005;

    // Sinusoidal jitter
    const jitter = Math.sin((elapsed / jitterPeriod) * Math.PI * 2) * jitterAmplitude * this.currentTension;

    // Apply jitter to rotation (additive to any existing rotation)
    this.platterMesh.rotation.y = this.baseRotationY + jitter;
  };

  /**
   * Get current lever resistance multiplier (for GSAP timeline integration)
   */
  getLeverResistanceMultiplier(): number {
    // Lever resistance creeps from 1.0 to 2.5 with tension
    return 1.0 + this.currentTension * 1.5;
  }

  /**
   * Trigger world impact effect (boss slam)
   */
  triggerWorldImpact(): void {
    if (!this.isActive || !this.platterMesh) return;

    // Permanent crack intensity increase
    const material = this.platterMesh.material as PBRMaterial;
    if (material?.bumpTexture) {
      material.bumpTexture.level = Math.min(0.8, material.bumpTexture.level + 0.2);
    }

    // Jitter spike (reset jitter start time for phase shift)
    this.jitterStartTime = performance.now();
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    this.currentTension = 0.0;
    this.jitterStartTime = performance.now();
    this.updateCrackIntensity();
  }

  /**
   * Dispose system
   */
  dispose(): void {
    this.deactivate();
    this.tensionSystem.removeListener(this.boundSetTension);
    MechanicalDegradationSystem.instance = null;
  }
}
