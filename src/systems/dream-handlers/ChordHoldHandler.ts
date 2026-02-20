/**
 * ChordHold dream handler
 *
 * Mechanics:
 * - Display a "chord" — multiple keycaps that must be held simultaneously
 * - Player must hold ALL chord keys for holdDurationMs to clear
 * - After clearing, transitionWindowMs grace period before next chord
 * - sequenceLength chords in total per sequence
 * - Tension scales holdDurationMs up: holdDurationMs * (1 + tension * 0.5)
 * - Wrong key pressed during chord resets the hold timer
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { ChordHoldSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** A single chord in the sequence */
interface Chord {
  keys: string[];
}

export class ChordHoldHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private chordSize = 2;
  private holdDurationMs = 1000;
  private sequenceLength = 5;
  private transitionWindowMs = 500;

  // Runtime state
  private keycapMeshes: Map<string, Mesh> = new Map();
  private availableLetters: string[] = [];
  private chordSequence: Chord[] = [];
  private currentChordIndex = 0;
  private holdTimer = 0;
  private inTransition = false;
  private transitionTimer = 0;
  private sequenceComplete = false;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as ChordHoldSlots | undefined;
    this.chordSize = slots?.chordSize ?? 2;
    this.holdDurationMs = slots?.holdDurationMs ?? 1000;
    this.sequenceLength = slots?.sequenceLength ?? 5;
    this.transitionWindowMs = slots?.transitionWindowMs ?? 500;

    // Determine active keycap subset
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G'];
    this.availableLetters = [...keycapSubset];

    // Find keycap meshes
    for (const letter of this.availableLetters) {
      const mesh = scene.getMeshByName(`keycap-${letter}`) as Mesh;
      if (mesh) {
        this.keycapMeshes.set(letter, mesh);
      }
    }

    // Generate chord sequence
    this.chordSequence = this.generateChordSequence();
    this.currentChordIndex = 0;
    this.holdTimer = 0;
    this.inTransition = false;
    this.transitionTimer = 0;
    this.sequenceComplete = false;

    // Highlight first chord
    this.highlightCurrentChord();
  }

  update(dt: number): void {
    if (!this.scene || !this.entity || this.sequenceComplete) return;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Handle transition window between chords
    if (this.inTransition) {
      this.transitionTimer += dt * 1000;
      if (this.transitionTimer >= this.transitionWindowMs) {
        this.inTransition = false;
        this.transitionTimer = 0;
        this.highlightCurrentChord();
      }
      return;
    }

    // Scale hold duration with tension
    const scaledHoldDuration = this.holdDurationMs * (1 + tension * 0.5);

    // Check if all chord keys are currently held
    const currentChord = this.chordSequence[this.currentChordIndex];
    if (!currentChord) return;

    const pressedKeys: Set<string> = this.scene?.metadata?.pressedKeys ?? new Set();
    const allHeld = currentChord.keys.every((key) => pressedKeys.has(key));

    // Check for wrong keys
    const hasWrongKey = [...pressedKeys].some(
      (key) => this.availableLetters.includes(key) && !currentChord.keys.includes(key),
    );

    if (hasWrongKey) {
      // Wrong key resets hold timer
      this.holdTimer = 0;
      return;
    }

    if (allHeld) {
      this.holdTimer += dt * 1000;
      if (this.holdTimer >= scaledHoldDuration) {
        // Chord cleared
        this.clearCurrentChordHighlight();
        this.currentChordIndex++;
        this.holdTimer = 0;

        if (this.currentChordIndex >= this.chordSequence.length) {
          // Sequence complete
          this.sequenceComplete = true;
          return;
        }

        // Start transition window
        this.inTransition = true;
        this.transitionTimer = 0;
      }
    } else {
      // Not all keys held — reset hold timer (but don't penalize for partial hold)
      this.holdTimer = 0;
    }
  }

  private generateChordSequence(): Chord[] {
    const chords: Chord[] = [];
    for (let i = 0; i < this.sequenceLength; i++) {
      const shuffled = [...this.availableLetters].sort(() => Math.random() - 0.5);
      chords.push({ keys: shuffled.slice(0, this.chordSize) });
    }
    return chords;
  }

  private highlightCurrentChord(): void {
    if (this.currentChordIndex >= this.chordSequence.length) return;

    const chord = this.chordSequence[this.currentChordIndex];
    for (const key of chord.keys) {
      const mesh = this.keycapMeshes.get(key);
      if (mesh?.material && 'emissiveColor' in mesh.material) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
        (mesh.material as any).emissiveColor = { r: 0.2, g: 0.6, b: 1.0 };
      }
    }
  }

  private clearCurrentChordHighlight(): void {
    if (this.currentChordIndex >= this.chordSequence.length) return;

    const chord = this.chordSequence[this.currentChordIndex];
    for (const key of chord.keys) {
      const mesh = this.keycapMeshes.get(key);
      if (mesh?.material && 'emissiveColor' in mesh.material) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
        (mesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
      }
    }
  }

  /** Get current chord index and total for UI display */
  getProgress(): { current: number; total: number; complete: boolean } {
    return {
      current: this.currentChordIndex,
      total: this.chordSequence.length,
      complete: this.sequenceComplete,
    };
  }

  /** Get the current chord's required keys */
  getCurrentChordKeys(): string[] {
    if (this.currentChordIndex >= this.chordSequence.length) return [];
    return [...this.chordSequence[this.currentChordIndex].keys];
  }

  dispose(): void {
    // Clear all highlights
    for (const mesh of this.keycapMeshes.values()) {
      gsap.killTweensOf(mesh.position);
      if (mesh.material && 'emissiveColor' in mesh.material) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
        (mesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
      }
    }

    this.keycapMeshes.clear();
    this.chordSequence = [];
    this.entity = null;
    this.scene = null;
  }
}

// Self-register
registerHandler('ChordHold', ChordHoldHandler);
