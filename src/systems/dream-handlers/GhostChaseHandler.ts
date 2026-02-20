/**
 * GhostChase dream handler
 *
 * Mechanics:
 * - Records player's keycap presses into a buffer
 * - After echoDelayMs, replays the recorded presses as "ghost" echoes
 *   (keycaps glow green and depress)
 * - Up to echoCount echo layers at different delays
 * - harmonizeMode:
 *   - 'interleave': Ghost presses alternate keys between player presses
 *   - 'complement': Ghost presses the opposite keycap set
 *   - 'invert': Ghost timing is reversed
 * - Ghosts decay over time (echoDecayRate reduces ghost alpha)
 * - Player should play in harmony with echoes — pressing same key as echo decreases tension
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GhostChaseSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** A recorded key press event */
interface RecordedPress {
  letter: string;
  timestamp: number; // elapsed time when pressed
}

/** An echo playback layer */
interface EchoLayer {
  delayMs: number;
  alpha: number; // current opacity (decays over time)
  playbackIndex: number; // current position in recording buffer
}

export class GhostChaseHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private echoDelayMs = 1500;
  private echoCount = 2;
  private harmonizeMode: 'interleave' | 'complement' | 'invert' = 'interleave';
  private echoDecayRate = 0.02;

  // Runtime state
  private keycapMeshes: Map<string, Mesh> = new Map();
  private availableLetters: string[] = [];
  private recordingBuffer: RecordedPress[] = [];
  private echoLayers: EchoLayer[] = [];
  private elapsedTime = 0;
  private lastPressedKeys: Set<string> = new Set();

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as GhostChaseSlots | undefined;
    this.echoDelayMs = slots?.echoDelayMs ?? 1500;
    this.echoCount = slots?.echoCount ?? 2;
    this.harmonizeMode = slots?.harmonizeMode ?? 'interleave';
    this.echoDecayRate = slots?.echoDecayRate ?? 0.02;

    // Determine active keycap subset
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'];
    this.availableLetters = [...keycapSubset];

    // Find keycap meshes
    for (const letter of this.availableLetters) {
      const mesh = scene.getMeshByName(`keycap-${letter}`) as Mesh;
      if (mesh) {
        this.keycapMeshes.set(letter, mesh);
      }
    }

    // Initialize echo layers with staggered delays
    this.echoLayers = [];
    for (let i = 0; i < this.echoCount; i++) {
      this.echoLayers.push({
        delayMs: this.echoDelayMs * (i + 1),
        alpha: 1.0,
        playbackIndex: 0,
      });
    }

    this.recordingBuffer = [];
    this.elapsedTime = 0;
    this.lastPressedKeys = new Set();
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    this.elapsedTime += dt;

    // Record new presses from scene metadata
    const pressedKeys: Set<string> = this.scene?.metadata?.pressedKeys ?? new Set();
    for (const key of pressedKeys) {
      if (this.availableLetters.includes(key) && !this.lastPressedKeys.has(key)) {
        this.recordingBuffer.push({
          letter: key,
          timestamp: this.elapsedTime,
        });
      }
    }
    this.lastPressedKeys = new Set(pressedKeys);

    // Process echo playback for each layer
    for (const layer of this.echoLayers) {
      // Decay echo alpha
      layer.alpha = Math.max(0, layer.alpha - this.echoDecayRate * dt);

      const delaySec = layer.delayMs / 1000;
      const echoTime = this.elapsedTime - delaySec;

      if (echoTime < 0) continue; // Echo hasn't started yet

      // Find recorded presses that should be echoed now
      while (
        layer.playbackIndex < this.recordingBuffer.length &&
        this.recordingBuffer[layer.playbackIndex].timestamp <= echoTime
      ) {
        const press = this.recordingBuffer[layer.playbackIndex];
        const echoLetter = this.transformForMode(press.letter);
        this.playEchoPress(echoLetter, layer.alpha);

        // Check if player is pressing the same key as echo (harmonization)
        if (pressedKeys.has(echoLetter)) {
          // Decrease tension for harmony
          if (this.scene?.metadata) {
            const currentTension = this.scene.metadata.currentTension ?? 0;
            this.scene.metadata.currentTension = Math.max(0, currentTension - 0.01);
          }
        }

        layer.playbackIndex++;
      }
    }
  }

  /**
   * Transform a letter based on harmonize mode.
   */
  private transformForMode(letter: string): string {
    const idx = this.availableLetters.indexOf(letter);
    if (idx === -1) return letter;

    switch (this.harmonizeMode) {
      case 'interleave':
        // Alternate: shift by 1 position
        return this.availableLetters[(idx + 1) % this.availableLetters.length];

      case 'complement':
        // Opposite keycap: mirror index
        return this.availableLetters[this.availableLetters.length - 1 - idx];

      case 'invert':
        // Same key (invert is about timing, not mapping)
        return letter;

      default:
        return letter;
    }
  }

  /**
   * Play a ghost echo press — glow green and depress the keycap briefly.
   */
  private playEchoPress(letter: string, alpha: number): void {
    const mesh = this.keycapMeshes.get(letter);
    if (!mesh) return;

    // Green glow for ghost echo
    if (mesh.material && 'emissiveColor' in mesh.material) {
      // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
      const mat = mesh.material as any;
      mat.emissiveColor = { r: 0.1, g: 0.8 * alpha, b: 0.2 * alpha };
    }

    // Brief depress animation
    gsap.to(mesh.position, {
      y: -0.02,
      duration: 0.1,
      ease: 'power2.in',
      onComplete: () => {
        gsap.to(mesh.position, { y: 0, duration: 0.15, ease: 'power2.out' });
      },
    });
  }

  /** Get the recording buffer length (for testing/UI) */
  getRecordingLength(): number {
    return this.recordingBuffer.length;
  }

  /** Get echo layer count */
  getEchoLayerCount(): number {
    return this.echoLayers.length;
  }

  dispose(): void {
    // Kill all GSAP tweens and clear echo visuals
    for (const mesh of this.keycapMeshes.values()) {
      gsap.killTweensOf(mesh.position);
      if (mesh.material && 'emissiveColor' in mesh.material) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
        (mesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
      }
    }

    this.keycapMeshes.clear();
    this.recordingBuffer = [];
    this.echoLayers = [];
    this.lastPressedKeys = new Set();
    this.entity = null;
    this.scene = null;
  }
}

// Self-register
registerHandler('GhostChase', GhostChaseHandler);
