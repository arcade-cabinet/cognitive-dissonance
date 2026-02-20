/**
 * CrystallineCubeBossDream handler
 *
 * Mechanics:
 * - Immediate boss encounter (no warmup phase)
 * - Platter locks rotation, all keycaps retract
 * - Unique boss timeline: longer descend (4s), multiple slam cycles (up to 3)
 * - Counter requires simultaneous lever + keycap input:
 *   - Lever controls shield angle (GSAP-animated shield plane)
 *   - Keycaps fire stabilization pulses (each held key = one pulse per 200ms, reduces boss health by 0.008)
 * - Boss health starts at 1.5 (vs 1.0 for standard boss spawn)
 * - Success: boss shatters into 7 Yuka shards (one per trait), tension drops to 0.5
 * - Failure: permanent platter deformation + tension -> 0.999
 */

import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../../types';
import { MechanicalAnimationSystem } from '../MechanicalAnimationSystem';
import { type DreamHandler, registerHandler } from './index';

export class CrystallineCubeBossHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future scene access and disposed in dispose()
  private scene: Scene | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Tracks boss state, set in activate() and cleared in dispose()
  private bossActive = false;
  private platterMesh: Mesh | null = null;
  private shieldMesh: Mesh | null = null;
  private slamCycles = 3;

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;
    this.slamCycles = entity.slamCycles ?? 3;

    // Find platter mesh
    this.platterMesh = scene.getMeshByName('platter') as Mesh;

    // Lock platter rotation
    if (this.platterMesh) {
      gsap.killTweensOf(this.platterMesh.rotation);
      gsap.to(this.platterMesh.rotation, { y: 0, duration: 0.5, ease: 'power2.out' });
    }

    // Retract all keycaps via MechanicalAnimationSystem
    const mechAnim = MechanicalAnimationSystem.getInstance();
    const keycapLetters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];
    for (const letter of keycapLetters) {
      mechAnim.retractKeycap(letter);
    }
    console.log('[CrystallineCubeBossHandler] Retracted all keycaps');

    // Create shield plane — positioned between boss and platter, controlled by lever
    if (scene) {
      this.shieldMesh = MeshBuilder.CreatePlane('bossShieldPlane', { width: 0.8, height: 0.4 }, scene);
      this.shieldMesh.position = new Vector3(0, 0.25, 0); // Between platter surface and boss descent path
      const shieldMat = new PBRMaterial('bossShieldMaterial', scene);
      shieldMat.metallic = 0.3;
      shieldMat.roughness = 0.1;
      shieldMat.albedoColor = new Color3(0.4, 0.7, 1.0); // Light blue
      shieldMat.emissiveColor = new Color3(0.2, 0.4, 0.9); // Blue glow
      shieldMat.alpha = 0.6;
      this.shieldMesh.material = shieldMat;
      console.log('[CrystallineCubeBossHandler] Shield plane created');
    }

    this.bossActive = true;
  }

  update(_dt: number): void {
    // Boss logic is event-driven (handled by CrystallineCubeBossSystem)
    // This update loop is a no-op for CrystallineCubeBossDream
  }

  /**
   * Update shield angle based on lever position
   */
  updateShieldAngle(leverPosition: number): void {
    if (!this.shieldMesh) return;

    // Lever position 0.0-1.0 -> shield angle -45 degrees to +45 degrees
    const angle = (leverPosition - 0.5) * (Math.PI / 2);
    gsap.to(this.shieldMesh.rotation, { z: angle, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
  }

  /**
   * Fire stabilization pulse from held keycap
   * Returns damage dealt to boss (0.008 per pulse)
   */
  fireStabilizationPulse(_keycapName: string): number {
    // Placeholder — full implementation would create visual pulse effect
    return 0.008;
  }

  dispose(): void {
    // Unlock platter rotation
    if (this.platterMesh) {
      gsap.killTweensOf(this.platterMesh.rotation);
    }

    // Kill shield tweens then dispose mesh
    if (this.shieldMesh) {
      gsap.killTweensOf(this.shieldMesh.rotation);
      this.shieldMesh.dispose();
      this.shieldMesh = null;
    }

    this.entity = null;
    this.scene = null;
    this.platterMesh = null;
    this.bossActive = false;
  }
}

// Self-register
registerHandler('CrystallineCubeBoss', CrystallineCubeBossHandler);
