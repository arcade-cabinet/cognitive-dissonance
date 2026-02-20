import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import { type GamePhase, useGameStore } from '../store/game-store';
import { useSeedStore } from '../store/seed-store';

/**
 * GamePhaseManager
 *
 * Orchestrates game phase transitions and visual states per Requirement 33.
 *
 * Phases:
 * - Loading: Diegetic platter rim glow pulsing (0.2–0.8 at 1.5 Hz)
 * - Title: Calm sphere, "COGNITIVE DISSONANCE" engraving, slit closed, keycaps retracted
 * - Playing: Slit opens, keycaps emerge, Dream spawns
 * - Shattered: 64-shard fracture, enemy fade, platter stop, "COGNITION SHATTERED" text
 * - Error: Static HTML fallback
 *
 * Singleton pattern.
 */
export class GamePhaseManager {
  private static instance: GamePhaseManager | null = null;

  private scene: Scene | null = null;
  private platterMesh: Mesh | null = null;
  private sphereMesh: Mesh | null = null;
  private originalPlatterMaterial: import('@babylonjs/core/Materials/material').Material | null = null;
  private rimGlowMaterial: StandardMaterial | null = null;
  private loadingPulseTimeline: gsap.core.Timeline | null = null;
  private restartEnabled = false;
  private restartTimeout: number | null = null;

  // Callbacks for external system integration
  private onPlayingPhaseStartCallback: (() => void) | null = null;
  private onShatteredPhaseStartCallback: (() => void) | null = null;
  private onTitlePhaseStartCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): GamePhaseManager {
    if (!GamePhaseManager.instance) {
      GamePhaseManager.instance = new GamePhaseManager();
    }
    return GamePhaseManager.instance;
  }

  /**
   * Initialize with scene and platter/sphere meshes.
   * Creates rim glow material for loading phase.
   */
  initialize(scene: Scene, platterMesh: Mesh, sphereMesh: Mesh): void {
    this.scene = scene;
    this.platterMesh = platterMesh;
    this.sphereMesh = sphereMesh;

    // Cache the original platter material so we can restore it after loading phase
    this.originalPlatterMaterial = platterMesh.material;

    // Create rim glow material for loading phase (Req 33.1)
    this.rimGlowMaterial = new StandardMaterial('rimGlow', scene);
    this.rimGlowMaterial.emissiveColor = new Color3(0.2, 0.6, 1.0); // Blue glow
    this.rimGlowMaterial.disableLighting = true;

    // Subscribe to game phase changes
    useGameStore.subscribe((state) => {
      this.onPhaseChange(state.phase);
    });

    // Sync to current phase (may already be 'title' by the time we initialize)
    const currentPhase = useGameStore.getState().phase;
    this.onPhaseChange(currentPhase);
  }

  /**
   * Set callback for playing phase start (triggers slit open, keycap emerge, Dream spawn).
   */
  setOnPlayingPhaseStart(callback: () => void): void {
    this.onPlayingPhaseStartCallback = callback;
  }

  /**
   * Set callback for shattered phase start (triggers enemy freeze, platter stop).
   */
  setOnShatteredPhaseStart(callback: () => void): void {
    this.onShatteredPhaseStartCallback = callback;
  }

  /**
   * Set callback for title phase start (triggers full state reset on restart).
   */
  setOnTitlePhaseStart(callback: () => void): void {
    this.onTitlePhaseStartCallback = callback;
  }

  /**
   * Phase change handler.
   */
  private onPhaseChange(phase: GamePhase): void {
    switch (phase) {
      case 'loading':
        this.startLoadingPhase();
        break;
      case 'title':
        this.startTitlePhase();
        break;
      case 'playing':
        this.startPlayingPhase();
        break;
      case 'shattered':
        this.startShatteredPhase();
        break;
      case 'error':
        this.startErrorPhase();
        break;
    }
  }

  /**
   * Loading Phase (Req 33.1)
   * Diegetic platter rim glow pulsing (emissive intensity 0.2–0.8 at 1.5 Hz).
   */
  private startLoadingPhase(): void {
    if (!this.platterMesh || !this.rimGlowMaterial) return;

    // Apply rim glow material to platter
    this.platterMesh.material = this.rimGlowMaterial;

    // Pulse emissive intensity 0.2 → 0.8 at 1.5 Hz (0.667s period)
    this.loadingPulseTimeline = gsap.timeline({ repeat: -1, yoyo: true });
    this.loadingPulseTimeline.to(this.rimGlowMaterial.emissiveColor, {
      r: 0.8,
      g: 0.8,
      b: 1.0,
      duration: 0.333, // Half period
      ease: 'sine.inOut',
    });
  }

  /**
   * Title Phase (Req 33.2)
   * Platter visible, sphere with calm blue nebula, "COGNITIVE DISSONANCE" engraving,
   * garage-door slit closed, keycaps retracted.
   */
  private startTitlePhase(): void {
    // Stop loading pulse
    if (this.loadingPulseTimeline) {
      this.loadingPulseTimeline.kill();
      this.loadingPulseTimeline = null;
    }

    // Restore original platter material (loading phase overrides it with rimGlowMaterial)
    if (this.platterMesh && this.originalPlatterMaterial) {
      this.platterMesh.material = this.originalPlatterMaterial;
    }

    // Trigger external reset callback (H1 fix: full state reset on restart)
    if (this.onTitlePhaseStartCallback) {
      this.onTitlePhaseStartCallback();
    }
  }

  /**
   * Playing Phase (Req 33.3, 33.4)
   * Slit opens, keycaps emerge, Dream spawns.
   */
  private startPlayingPhase(): void {
    // Trigger external systems via callback
    if (this.onPlayingPhaseStartCallback) {
      this.onPlayingPhaseStartCallback();
    }
  }

  /**
   * Shattered Phase (Req 33.5)
   * Sphere fractures into 64 glass-shard particles, enemies freeze and fade,
   * platter stops rotating, "COGNITION SHATTERED" text appears.
   * After 4s, enable restart.
   */
  private startShatteredPhase(): void {
    if (!this.scene || !this.sphereMesh) return;

    // Trigger external systems via callback (enemy freeze, platter stop, ShatterSequence.trigger())
    if (this.onShatteredPhaseStartCallback) {
      this.onShatteredPhaseStartCallback();
    }

    // Shatter effect is handled exclusively by ShatterSequence (triggered from GameBootstrap's shattered callback)

    // "COGNITION SHATTERED" text already displayed by TitleAndGameOverSystem

    // Enable restart after 4s (Req 33.6)
    this.restartEnabled = false;
    this.restartTimeout = window.setTimeout(() => {
      this.restartEnabled = true;
    }, 4000);
  }

  /**
   * Error Phase (Req 33.7)
   * Static HTML fallback for no WebGL2/WebGPU support.
   */
  private startErrorPhase(): void {
    // Error message displayed via game-store.errorMessage
    // HTML fallback handled by App.tsx (no Babylon.js rendering)
  }

  /**
   * Check if restart is enabled (called by input systems).
   */
  isRestartEnabled(): boolean {
    return this.restartEnabled;
  }

  /**
   * Trigger restart: generate new seed, transition to title phase.
   */
  restart(): void {
    if (!this.restartEnabled) return;

    // Generate new seed
    useSeedStore.getState().generateNewSeed();

    // Reset game phase
    useGameStore.getState().setPhase('title');

    // Re-enable sphere
    if (this.sphereMesh) {
      this.sphereMesh.setEnabled(true);
    }

    // Reset restart state
    this.restartEnabled = false;
    if (this.restartTimeout !== null) {
      window.clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    if (this.loadingPulseTimeline) {
      this.loadingPulseTimeline.kill();
      this.loadingPulseTimeline = null;
    }

    if (this.restartTimeout !== null) {
      window.clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.rimGlowMaterial?.dispose();
    this.rimGlowMaterial = null;

    this.scene = null;
    this.platterMesh = null;
    this.sphereMesh = null;
    this.originalPlatterMaterial = null;
    this.onPlayingPhaseStartCallback = null;
    this.onShatteredPhaseStartCallback = null;
    this.onTitlePhaseStartCallback = null;
  }
}
