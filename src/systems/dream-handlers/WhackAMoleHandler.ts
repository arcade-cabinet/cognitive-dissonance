/**
 * WhackAMole dream handler
 *
 * Mechanics:
 * - Keycaps randomly emerge from below the platter surface (GSAP y animation)
 * - Player must press keycaps before they retract
 * - maxSimultaneous controls how many can be emerged at once
 * - emergeIntervalMs is the spawn interval between new emerges
 * - emergeDurationMs is how long a keycap stays emerged before auto-retracting
 * - decoyRate chance that an emerged keycap is a "decoy" (glows red; pressing a decoy INCREASES tension)
 * - Tension scales emerge duration down and spawn rate up
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { WhackAMoleSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** Tracks a single emerged keycap */
interface EmergedKeycap {
  mesh: Mesh;
  letter: string;
  isDecoy: boolean;
  emergedAt: number; // elapsed time when emerged
}

export class WhackAMoleHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private emergeDurationMs = 1000;
  private maxSimultaneous = 3;
  private emergeIntervalMs = 1500;
  private decoyRate = 0.1;

  // Runtime state
  private keycapMeshes: Map<string, Mesh> = new Map();
  private emerged: EmergedKeycap[] = [];
  private elapsedTime = 0;
  private lastEmergeTime = 0;
  private availableLetters: string[] = [];

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as WhackAMoleSlots | undefined;
    this.emergeDurationMs = slots?.emergeDurationMs ?? 1000;
    this.maxSimultaneous = slots?.maxSimultaneous ?? 3;
    this.emergeIntervalMs = slots?.emergeIntervalMs ?? 1500;
    this.decoyRate = slots?.decoyRate ?? 0.1;

    // Determine active keycap subset
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G'];
    this.availableLetters = [...keycapSubset];

    // Find keycap meshes and set all below surface
    for (const letter of this.availableLetters) {
      const mesh = scene.getMeshByName(`keycap-${letter}`) as Mesh;
      if (mesh) {
        this.keycapMeshes.set(letter, mesh);
        mesh.position.y = -0.05; // Below surface
      }
    }

    this.emerged = [];
    this.elapsedTime = 0;
    this.lastEmergeTime = 0;
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    this.elapsedTime += dt;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Scale parameters with tension
    const scaledDuration = this.emergeDurationMs / (1 + tension);
    const scaledInterval = this.emergeIntervalMs * (1 - tension * 0.5);
    const intervalSec = Math.max(0.1, scaledInterval / 1000);

    // Check for auto-retract timeouts
    const durationSec = scaledDuration / 1000;
    const toRetract: number[] = [];
    for (let i = 0; i < this.emerged.length; i++) {
      if (this.elapsedTime - this.emerged[i].emergedAt >= durationSec) {
        toRetract.push(i);
      }
    }

    // Retract expired keycaps (iterate in reverse to preserve indices)
    for (let i = toRetract.length - 1; i >= 0; i--) {
      const idx = toRetract[i];
      const keycap = this.emerged[idx];
      gsap.to(keycap.mesh.position, { y: -0.05, duration: 0.2, ease: 'power2.in' });
      this.emerged.splice(idx, 1);
    }

    // Check if it's time to emerge a new keycap
    if (
      this.elapsedTime - this.lastEmergeTime >= intervalSec &&
      this.emerged.length < this.maxSimultaneous
    ) {
      this.emergeRandomKeycap();
      this.lastEmergeTime = this.elapsedTime;
    }
  }

  private emergeRandomKeycap(): void {
    // Find letters not currently emerged
    const emergedLetters = new Set(this.emerged.map((e) => e.letter));
    const available = this.availableLetters.filter((l) => !emergedLetters.has(l));
    if (available.length === 0) return;

    const letter = available[Math.floor(Math.random() * available.length)];
    const mesh = this.keycapMeshes.get(letter);
    if (!mesh) return;

    const isDecoy = Math.random() < this.decoyRate;

    // Animate emerge
    gsap.to(mesh.position, { y: 0.03, duration: 0.3, ease: 'power2.out' });

    // Set glow color: red for decoy, blue for valid
    if (mesh.material && 'emissiveColor' in mesh.material) {
      // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
      const mat = mesh.material as any;
      if (isDecoy) {
        mat.emissiveColor = { r: 0.9, g: 0.1, b: 0.1 };
      } else {
        mat.emissiveColor = { r: 0.1, g: 0.3, b: 0.9 };
      }
    }

    this.emerged.push({
      mesh,
      letter,
      isDecoy,
      emergedAt: this.elapsedTime,
    });
  }

  /** Get currently emerged keycaps (for external input system to query) */
  getEmergedKeycaps(): ReadonlyArray<{ letter: string; isDecoy: boolean }> {
    return this.emerged.map((e) => ({ letter: e.letter, isDecoy: e.isDecoy }));
  }

  dispose(): void {
    // Kill all GSAP tweens on keycap meshes
    for (const mesh of this.keycapMeshes.values()) {
      gsap.killTweensOf(mesh.position);
      // Reset keycap positions to 0
      mesh.position.y = 0;
    }

    this.keycapMeshes.clear();
    this.emerged = [];
    this.entity = null;
    this.scene = null;
  }
}

// Self-register
registerHandler('WhackAMole', WhackAMoleHandler);
