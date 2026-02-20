/**
 * RhythmGate dream handler
 *
 * Mechanics:
 * - Keycaps have "gates" that open and close on the beat
 * - Player can only press keycaps while their gate is open
 * - Gates open for openRatio fraction of the beat period
 * - gatePattern determines which beats have open gates
 * - If leverRequired, lever must be in the right half (>0.5) for gates to respond
 * - Pressing while gate is closed increases tension by 0.02
 * - Visual: keycaps glow blue when gate is open, dim when closed
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { RhythmGateSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** Gate state for a single keycap */
interface GateState {
  mesh: Mesh;
  letter: string;
  isOpen: boolean;
}

export class RhythmGateHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private bpm = 120;
  private gatePattern: 'quarter' | 'eighth' | 'syncopated' = 'quarter';
  private openRatio = 0.4;
  private leverRequired = false;

  // Derived
  private beatPeriod = 0.5; // seconds per beat

  // Runtime state
  private gates: GateState[] = [];
  private beatClock = 0;
  private currentBeat = 0;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as RhythmGateSlots | undefined;
    this.bpm = slots?.bpm ?? 120;
    this.gatePattern = slots?.gatePattern ?? 'quarter';
    this.openRatio = slots?.openRatio ?? 0.4;
    this.leverRequired = slots?.leverRequired ?? false;

    // Calculate beat period
    this.beatPeriod = 60 / this.bpm;

    // Determine active keycap subset
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T'];
    this.gates = [];

    // Find keycap meshes and set up gate state
    for (const letter of keycapSubset) {
      const mesh = scene.getMeshByName(`keycap-${letter}`) as Mesh;
      if (mesh) {
        this.gates.push({ mesh, letter, isOpen: false });
      }
    }

    this.beatClock = 0;
    this.currentBeat = 0;

    // Start with all gates closed (dim)
    this.updateGateVisuals();
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    this.beatClock += dt;

    // Calculate position within current beat (0.0 to 1.0)
    const beatPosition = (this.beatClock % this.beatPeriod) / this.beatPeriod;

    // Advance beat counter when wrapping
    const newBeat = Math.floor(this.beatClock / this.beatPeriod);
    if (newBeat !== this.currentBeat) {
      this.currentBeat = newBeat;
    }

    // Check lever requirement
    let leverSatisfied = true;
    if (this.leverRequired) {
      const leverPosition: number = this.scene?.metadata?.leverPosition ?? 0;
      leverSatisfied = leverPosition > 0.5;
    }

    // Determine gate open/closed state per pattern
    const shouldBeOpen = leverSatisfied && this.isGateOpenForBeat(beatPosition);

    // Update each gate
    for (const gate of this.gates) {
      const wasOpen = gate.isOpen;
      gate.isOpen = shouldBeOpen;

      // Only animate on state change
      if (wasOpen !== shouldBeOpen) {
        this.animateGate(gate);
      }
    }
  }

  /**
   * Determine if gates should be open based on beat position and pattern.
   * Returns true during the open portion of the beat.
   */
  private isGateOpenForBeat(beatPosition: number): boolean {
    switch (this.gatePattern) {
      case 'quarter':
        // Open at the start of each beat for openRatio fraction
        return beatPosition < this.openRatio;

      case 'eighth':
        // Two gates per beat: at 0 and 0.5
        {
          const halfBeatPos = beatPosition % 0.5;
          const halfBeatRatio = this.openRatio * 0.5; // Half the open time for each eighth
          return halfBeatPos < halfBeatRatio;
        }

      case 'syncopated':
        // Open on the "and" (offbeat): gate opens at 0.5 of the beat
        {
          const syncopatedPos = (beatPosition + 0.5) % 1.0;
          return syncopatedPos < this.openRatio;
        }

      default:
        return beatPosition < this.openRatio;
    }
  }

  private animateGate(gate: GateState): void {
    if (!gate.mesh.material || !('emissiveColor' in gate.mesh.material)) return;

    // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
    const mat = gate.mesh.material as any;
    if (gate.isOpen) {
      // Blue glow when open
      gsap.to(mat, {
        duration: 0.1,
        onUpdate: () => {
          mat.emissiveColor = { r: 0.1, g: 0.4, b: 0.9 };
        },
      });
    } else {
      // Dim when closed
      gsap.to(mat, {
        duration: 0.1,
        onUpdate: () => {
          mat.emissiveColor = { r: 0.05, g: 0.05, b: 0.1 };
        },
      });
    }
  }

  private updateGateVisuals(): void {
    for (const gate of this.gates) {
      this.animateGate(gate);
    }
  }

  /** Check if a specific keycap's gate is currently open */
  isGateOpen(letter: string): boolean {
    const gate = this.gates.find((g) => g.letter === letter);
    return gate?.isOpen ?? false;
  }

  /** Get the current beat number */
  getCurrentBeat(): number {
    return this.currentBeat;
  }

  /** Get the BPM */
  getBpm(): number {
    return this.bpm;
  }

  dispose(): void {
    // Reset keycap glows and kill GSAP tweens (position + material)
    for (const gate of this.gates) {
      gsap.killTweensOf(gate.mesh.position);
      if (gate.mesh.material) {
        gsap.killTweensOf(gate.mesh.material);
        if ('emissiveColor' in gate.mesh.material) {
          // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
          (gate.mesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
        }
      }
    }

    this.gates = [];
    this.entity = null;
    this.scene = null;
  }
}

// Self-register
registerHandler('RhythmGate', RhythmGateHandler);
