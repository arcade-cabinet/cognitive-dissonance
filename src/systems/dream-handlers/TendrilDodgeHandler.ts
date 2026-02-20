/**
 * TendrilDodge dream handler
 *
 * Mechanics:
 * - Corruption tendrils approach the sphere in waves
 * - Each wave has tendrilWaveSize tendrils approaching from random angles
 * - Tendrils approach at approachSpeed units/sec
 * - Player defends by:
 *   1. SPHERE ROTATION: Rotating sphere so it faces away from incoming tendrils
 *   2. LEVER: Pulling lever activates a temporary "shield" (GSAP glow effect on sphere)
 *   3. KEYCAPS: Pressing matching keycap dissolves a tendril within dissolveAngleDeg
 * - Shield lasts shieldDurationMs, then shieldCooldownS cooldown
 * - Tendrils touching sphere (within 0.05 units) increase tension by 0.02 each
 * - Successfully dodging entire wave decreases tension by 0.05
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { TendrilDodgeSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** Tracks a single approaching tendril */
interface Tendril {
  angleDeg: number;      // Approach angle in degrees
  distance: number;      // Distance from sphere center (starts far, approaches 0)
  dissolved: boolean;     // Whether this tendril was dissolved by keycap
  keycapIndex: number;    // Which keycap can dissolve this tendril
}

export class TendrilDodgeHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private tendrilWaveSize = 6;
  private waveIntervalS = 4;
  private approachSpeed = 0.8;
  private dissolveAngleDeg = 30;
  private shieldDurationMs = 800;
  private shieldCooldownS = 5;

  // Runtime state
  private sphereMesh: Mesh | null = null;
  private leverMesh: Mesh | null = null;
  private keycapMeshes: Map<string, Mesh> = new Map();
  private availableLetters: string[] = [];
  private activeTendrils: Tendril[] = [];
  private waveTimer = 0;
  private waveCount = 0;
  private shieldActive = false;
  private shieldTimer = 0;
  private shieldCooldownTimer = 0;
  private shieldReady = true;
  private initialTendrilDistance = 2.0;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as TendrilDodgeSlots | undefined;
    this.tendrilWaveSize = slots?.tendrilWaveSize ?? 6;
    this.waveIntervalS = slots?.waveIntervalS ?? 4;
    this.approachSpeed = slots?.approachSpeed ?? 0.8;
    this.dissolveAngleDeg = slots?.dissolveAngleDeg ?? 30;
    this.shieldDurationMs = slots?.shieldDurationMs ?? 800;
    this.shieldCooldownS = slots?.shieldCooldownS ?? 5;

    // Initialize state
    this.activeTendrils = [];
    this.waveTimer = 0;
    this.waveCount = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldCooldownTimer = 0;
    this.shieldReady = true;

    // Find sphere mesh
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    if (!this.sphereMesh) {
      console.warn('[TendrilDodgeHandler] Sphere mesh not found in scene');
    }

    // Find lever mesh
    this.leverMesh = scene.getMeshByName('lever') as Mesh;

    // Find keycap meshes
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'];
    this.availableLetters = [...keycapSubset];
    for (const letter of this.availableLetters) {
      const mesh = scene.getMeshByName(`keycap-${letter}`) as Mesh;
      if (mesh) {
        this.keycapMeshes.set(letter, mesh);
      }
    }
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Manage shield state
    this.updateShield(dt);

    // Check lever for shield activation
    const leverPosition = this.entity.lever?.position ?? this.entity.modeLeverPosition ?? 0;
    if (leverPosition > 0.7 && this.shieldReady && !this.shieldActive) {
      this.activateShield();
    }

    // Wave spawn timer
    this.waveTimer += dt;
    if (this.waveTimer >= this.waveIntervalS) {
      this.spawnWave();
      this.waveTimer = 0;
    }

    // Move tendrils toward sphere
    const tendrilsToRemove: number[] = [];
    let allDodged = true;

    for (let i = 0; i < this.activeTendrils.length; i++) {
      const tendril = this.activeTendrils[i];
      if (tendril.dissolved) continue;

      // Move tendril closer
      tendril.distance -= this.approachSpeed * dt;

      // Shield blocks tendrils
      if (this.shieldActive && tendril.distance <= 0.3) {
        tendril.dissolved = true;
        continue;
      }

      // Check if tendril reached sphere (collision)
      if (tendril.distance <= 0.05) {
        tendrilsToRemove.push(i);
        allDodged = false;

        // Tension increase per tendril hit
        if (this.scene.metadata) {
          this.scene.metadata.currentTension = Math.min(1, tension + 0.02);
        }
      }
    }

    // Remove collided tendrils (reverse order for correct indices)
    for (let i = tendrilsToRemove.length - 1; i >= 0; i--) {
      this.activeTendrils.splice(tendrilsToRemove[i], 1);
    }

    // Check if wave is complete (all tendrils dissolved or collided)
    const waveComplete = this.activeTendrils.length === 0 && this.waveCount > 0;
    if (waveComplete && allDodged && this.waveCount > 0) {
      // Successfully dodged entire wave
      if (this.scene.metadata) {
        this.scene.metadata.currentTension = Math.max(0, tension - 0.05);
      }
    }
  }

  private spawnWave(): void {
    this.activeTendrils = [];
    this.waveCount++;

    for (let i = 0; i < this.tendrilWaveSize; i++) {
      const angleDeg = Math.random() * 360;
      const keycapIndex = i % this.availableLetters.length;

      this.activeTendrils.push({
        angleDeg,
        distance: this.initialTendrilDistance,
        dissolved: false,
        keycapIndex,
      });
    }
  }

  private activateShield(): void {
    this.shieldActive = true;
    this.shieldReady = false;
    this.shieldTimer = 0;

    // GSAP glow effect on sphere
    if (this.sphereMesh?.material && 'emissiveColor' in this.sphereMesh.material) {
      // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
      gsap.to((this.sphereMesh.material as any).emissiveColor, {
        r: 0.3,
        g: 0.6,
        b: 1.0,
        duration: 0.2,
        ease: 'power2.out',
      });
    }
  }

  private updateShield(dt: number): void {
    if (this.shieldActive) {
      this.shieldTimer += dt * 1000;
      if (this.shieldTimer >= this.shieldDurationMs) {
        // Shield expired
        this.shieldActive = false;
        this.shieldCooldownTimer = 0;

        // Remove glow
        if (this.sphereMesh?.material && 'emissiveColor' in this.sphereMesh.material) {
          // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
          gsap.to((this.sphereMesh.material as any).emissiveColor, {
            r: 0,
            g: 0,
            b: 0,
            duration: 0.3,
            ease: 'power2.in',
          });
        }
      }
    } else if (!this.shieldReady) {
      // Cooldown
      this.shieldCooldownTimer += dt;
      if (this.shieldCooldownTimer >= this.shieldCooldownS) {
        this.shieldReady = true;
      }
    }
  }

  /** Attempt to dissolve a tendril with a keycap press */
  dissolveTendril(letter: string): boolean {
    const keycapIndex = this.availableLetters.indexOf(letter);
    if (keycapIndex === -1) return false;

    // Find a tendril matching this keycap within dissolve angle range
    for (const tendril of this.activeTendrils) {
      if (tendril.dissolved) continue;
      if (tendril.keycapIndex === keycapIndex) {
        tendril.dissolved = true;
        return true;
      }
    }

    return false;
  }

  /** Get active tendril count */
  getActiveTendrilCount(): number {
    return this.activeTendrils.filter((t) => !t.dissolved).length;
  }

  /** Check if shield is currently active */
  isShieldActive(): boolean {
    return this.shieldActive;
  }

  /** Check if shield is ready to use */
  isShieldReady(): boolean {
    return this.shieldReady;
  }

  /** Get wave count */
  getWaveCount(): number {
    return this.waveCount;
  }

  dispose(): void {
    // Remove all tendril state
    this.activeTendrils = [];

    // Reset shield glow
    if (this.sphereMesh?.material && 'emissiveColor' in this.sphereMesh.material) {
      // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
      (this.sphereMesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
    }

    // Kill GSAP tweens (rotation, position, and material emissive color)
    if (this.sphereMesh) {
      gsap.killTweensOf(this.sphereMesh.rotation);
      if (this.sphereMesh.material && 'emissiveColor' in this.sphereMesh.material) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
        gsap.killTweensOf((this.sphereMesh.material as any).emissiveColor);
      }
    }
    if (this.leverMesh) gsap.killTweensOf(this.leverMesh.position);

    for (const mesh of this.keycapMeshes.values()) {
      gsap.killTweensOf(mesh.position);
    }

    this.keycapMeshes.clear();
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
    this.leverMesh = null;
    this.shieldActive = false;
    this.shieldReady = true;
  }
}

// Self-register
registerHandler('TendrilDodge', TendrilDodgeHandler);
