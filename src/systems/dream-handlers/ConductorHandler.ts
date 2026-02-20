/**
 * Conductor dream handler
 *
 * Mechanics:
 * - Player is an orchestra conductor controlling tempo and dynamics
 * - LEVER position maps to current BPM (0.0 -> 60 BPM, 1.0 -> 180 BPM)
 * - Target BPM changes per section (advancing through sectionCount sections)
 * - Player must keep lever within toleranceBpm of target
 * - dynamicCurve controls how target BPM evolves across sections:
 *   - crescendo: target BPM increases through sections
 *   - decrescendo: target BPM decreases through sections
 *   - sforzando: sudden BPM jumps between sections
 * - Keycaps represent "instruments" — pressing keycap activates that instrument (visual glow)
 * - More instruments active = faster tension decrease when on-tempo
 * - Being off-tempo increases tension proportional to BPM difference
 * - Platter rotates at current BPM-derived speed (visual metronome)
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { ConductorSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

export class ConductorHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private targetBpm = 120;
  private dynamicCurve: 'crescendo' | 'decrescendo' | 'sforzando' = 'crescendo';
  private sectionCount = 3;
  private toleranceBpm = 10;

  // Runtime state
  private leverMesh: Mesh | null = null;
  private platterMesh: Mesh | null = null;
  private keycapMeshes: Map<string, Mesh> = new Map();
  private sectionBpmTargets: number[] = [];
  private currentSection = 0;
  private sectionElapsed = 0;
  private sectionDuration = 8; // seconds per section
  private activeInstruments: Set<string> = new Set();
  private currentBpm = 0;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as ConductorSlots | undefined;
    this.targetBpm = slots?.targetBpm ?? 120;
    this.dynamicCurve = slots?.dynamicCurve ?? 'crescendo';
    this.sectionCount = slots?.sectionCount ?? 3;
    this.toleranceBpm = slots?.toleranceBpm ?? 10;

    // Calculate section BPM targets based on dynamic curve
    this.sectionBpmTargets = this.calculateSectionTargets();
    this.currentSection = 0;
    this.sectionElapsed = 0;
    this.activeInstruments.clear();
    this.currentBpm = this.sectionBpmTargets[0] ?? this.targetBpm;

    // Find lever mesh
    this.leverMesh = scene.getMeshByName('lever') as Mesh;
    if (!this.leverMesh) {
      console.warn('[ConductorHandler] Lever mesh not found in scene');
    }

    // Find platter mesh and start rotation
    this.platterMesh = scene.getMeshByName('platter') as Mesh;
    if (!this.platterMesh) {
      console.warn('[ConductorHandler] Platter mesh not found in scene');
    }

    // Find keycap meshes
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T'];
    for (const letter of keycapSubset) {
      const mesh = scene.getMeshByName(`keycap-${letter}`) as Mesh;
      if (mesh) {
        this.keycapMeshes.set(letter, mesh);
      }
    }
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Advance section timer
    this.sectionElapsed += dt;
    if (this.sectionElapsed >= this.sectionDuration && this.currentSection < this.sectionCount - 1) {
      this.currentSection++;
      this.sectionElapsed = 0;
    }

    // Read lever position (0.0-1.0)
    const leverPosition = this.entity.lever?.position ?? this.entity.modeLeverPosition ?? 0.5;

    // Map lever position to BPM (0.0 -> 60, 1.0 -> 180)
    this.currentBpm = 60 + leverPosition * 120;

    // Get target BPM for current section
    const targetBpm = this.sectionBpmTargets[this.currentSection] ?? this.targetBpm;
    const bpmDifference = Math.abs(this.currentBpm - targetBpm);

    // Update platter rotation speed based on current BPM
    if (this.platterMesh) {
      const radiansPerSecond = (this.currentBpm / 60) * Math.PI * 2 / 4; // quarter-time visual
      this.platterMesh.rotation.y += radiansPerSecond * dt;
    }

    // Tension adjustment based on BPM accuracy
    if (this.scene.metadata) {
      if (bpmDifference <= this.toleranceBpm) {
        // On-tempo: decrease tension, scaled by active instruments
        const instrumentBonus = 1 + this.activeInstruments.size * 0.25;
        const decrease = 0.01 * instrumentBonus * dt;
        this.scene.metadata.currentTension = Math.max(0, tension - decrease);
      } else {
        // Off-tempo: increase tension proportional to difference
        const increase = (bpmDifference / 120) * 0.03 * dt;
        this.scene.metadata.currentTension = Math.min(1, tension + increase);
      }
    }
  }

  private calculateSectionTargets(): number[] {
    const targets: number[] = [];
    const minBpm = 60;
    const maxBpm = 180;

    for (let i = 0; i < this.sectionCount; i++) {
      const t = this.sectionCount > 1 ? i / (this.sectionCount - 1) : 0.5;

      switch (this.dynamicCurve) {
        case 'crescendo':
          // Linearly increasing BPM
          targets.push(minBpm + t * (maxBpm - minBpm));
          break;
        case 'decrescendo':
          // Linearly decreasing BPM
          targets.push(maxBpm - t * (maxBpm - minBpm));
          break;
        case 'sforzando':
          // Sudden jumps: alternate between low and high
          targets.push(i % 2 === 0 ? minBpm + Math.random() * 40 : maxBpm - Math.random() * 40);
          break;
      }
    }

    return targets;
  }

  /** Activate an instrument (keycap press) */
  activateInstrument(letter: string): void {
    this.activeInstruments.add(letter);
    const mesh = this.keycapMeshes.get(letter);
    if (mesh?.material && 'emissiveColor' in mesh.material) {
      // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
      (mesh.material as any).emissiveColor = { r: 0.3, g: 0.8, b: 0.3 };
    }
  }

  /** Deactivate an instrument (keycap release) */
  deactivateInstrument(letter: string): void {
    this.activeInstruments.delete(letter);
    const mesh = this.keycapMeshes.get(letter);
    if (mesh?.material && 'emissiveColor' in mesh.material) {
      // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
      (mesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
    }
  }

  /** Get current section progress */
  getProgress(): { section: number; total: number; targetBpm: number; currentBpm: number } {
    return {
      section: this.currentSection,
      total: this.sectionCount,
      targetBpm: this.sectionBpmTargets[this.currentSection] ?? this.targetBpm,
      currentBpm: this.currentBpm,
    };
  }

  /** Get the section BPM targets (for testing) */
  getSectionBpmTargets(): number[] {
    return [...this.sectionBpmTargets];
  }

  dispose(): void {
    // Stop platter rotation
    if (this.platterMesh) {
      gsap.killTweensOf(this.platterMesh.rotation);
    }

    // Reset lever state
    if (this.leverMesh) {
      gsap.killTweensOf(this.leverMesh.position);
    }

    // Clear keycap highlights
    for (const mesh of this.keycapMeshes.values()) {
      if (mesh.material && 'emissiveColor' in mesh.material) {
        // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
        (mesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
      }
    }

    this.keycapMeshes.clear();
    this.activeInstruments.clear();
    this.sectionBpmTargets = [];
    this.entity = null;
    this.scene = null;
    this.leverMesh = null;
    this.platterMesh = null;
  }
}

// Self-register
registerHandler('Conductor', ConductorHandler);
