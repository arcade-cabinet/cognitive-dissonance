/**
 * KeySequenceDream handler
 *
 * Mechanics:
 * - Patterns require ordered multi-key sequences (2-5 keys) instead of single holds
 * - Sequence length scales with tension: 2 + floor(tension * 3), capped at 5
 * - Ghost keycap highlights show required sequence order
 * - Per-key time window: seed-derived base (800-2000ms), scales down with difficulty
 * - Wrong key in sequence resets progress and spawns Echo
 * - Full sequence completion grants double coherence bonus (0.18 tension decrease)
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

export class KeySequenceHandler implements DreamHandler {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future entity access and disposed in dispose()
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private currentSequence: string[] = [];
  private sequenceProgress = 0;
  private baseTimeWindow = 1200; // ms per key
  private ghostMeshes: Mesh[] = [];

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;
    this.baseTimeWindow = entity.stabilizationHoldTime ?? 1200;
    this.currentSequence = [];
    this.sequenceProgress = 0;
  }

  update(_dt: number): void {
    // Sequence logic is event-driven (handled by KeyboardInputSystem / HandInteractionSystem)
    // This update loop is a no-op for KeySequenceDream
  }

  /**
   * Start a new sequence with given keys
   */
  startSequence(keys: string[]): void {
    this.currentSequence = keys;
    this.sequenceProgress = 0;
    this.showGhostHighlights(keys);
  }

  /**
   * Process a key press in the sequence
   * Returns true if sequence is complete, false otherwise
   */
  processKey(key: string): boolean {
    if (this.sequenceProgress >= this.currentSequence.length) {
      return false; // Sequence already complete
    }

    const expectedKey = this.currentSequence[this.sequenceProgress];
    if (key === expectedKey) {
      this.sequenceProgress++;
      this.updateGhostHighlights();

      // Sequence complete?
      if (this.sequenceProgress >= this.currentSequence.length) {
        this.clearGhostHighlights();
        return true;
      }
    } else {
      // Wrong key — reset progress
      this.sequenceProgress = 0;
      this.updateGhostHighlights();
      // Caller should spawn Echo
    }

    return false;
  }

  /**
   * Get current sequence length based on tension
   */
  getSequenceLength(tension: number): number {
    return Math.min(5, 2 + Math.floor(tension * 3));
  }

  /**
   * Get per-key time window based on difficulty
   */
  getTimeWindow(difficulty: number): number {
    // Scales from baseTimeWindow down to 400ms
    return Math.max(400, this.baseTimeWindow / (1 + difficulty));
  }

  private showGhostHighlights(keys: string[]): void {
    if (!this.scene) return;

    // Create ghost keycap meshes for each key in sequence
    // (Simplified — full implementation would position at actual keycap locations)
    this.clearGhostHighlights();

    for (let i = 0; i < keys.length; i++) {
      const keycapMesh = this.scene.getMeshByName(`keycap-${keys[i]}`) as Mesh;
      if (keycapMesh) {
        const ghost = keycapMesh.clone(`ghost-${keys[i]}-${i}`);
        if (ghost) {
          ghost.position.y += 0.05; // Slightly above real keycap
          // biome-ignore lint/suspicious/noExplicitAny: Material type varies
          (ghost.material as any).alpha = 0.4;
          this.ghostMeshes.push(ghost);
        }
      }
    }
  }

  private updateGhostHighlights(): void {
    // Fade completed keys, highlight current key
    for (let i = 0; i < this.ghostMeshes.length; i++) {
      const ghost = this.ghostMeshes[i];
      if (i < this.sequenceProgress) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies
        (ghost.material as any).alpha = 0.1; // Faded
      } else if (i === this.sequenceProgress) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies
        (ghost.material as any).alpha = 0.6; // Highlighted
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies
        (ghost.material as any).alpha = 0.4; // Normal
      }
    }
  }

  private clearGhostHighlights(): void {
    for (const ghost of this.ghostMeshes) {
      ghost.dispose();
    }
    this.ghostMeshes = [];
  }

  dispose(): void {
    this.clearGhostHighlights();
    this.entity = null;
    this.scene = null;
    this.currentSequence = [];
    this.sequenceProgress = 0;
  }
}

// Self-register
registerHandler('KeySequence', KeySequenceHandler);
