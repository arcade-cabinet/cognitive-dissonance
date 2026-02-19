/**
 * SpatialAudioManager — Cognitive Dissonance v3.0
 *
 * Event-driven procedural SFX positioned at contact points.
 * Uses Buried_Seed-derived BPM, swing, and sequence patterns for deterministic audio evolution.
 *
 * Source: ARCH v3.0 (event-driven procedural SFX, seed-derived BPM/swing)
 * Requirement: 17.4, 17.5
 */

import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import * as Tone from 'tone';
import { ImmersionAudioBridge } from './ImmersionAudioBridge';

interface AudioParams {
  bpm: number; // 60–139
  swing: number; // 0.00–0.29
  rootNote: number; // 0–11 semitones
}

interface SFXEvent {
  type: 'keycap' | 'lever' | 'platter' | 'tendril' | 'enemy' | 'boss' | 'shatter';
  position: Vector3;
  intensity: number; // 0.0–1.0
}

export class SpatialAudioManager {
  private static instance: SpatialAudioManager | null = null;
  private audioParams: AudioParams = { bpm: 90, swing: 0.15, rootNote: 0 };
  private isInitialized = false;

  // Tone.js synths for procedural SFX
  private keycapSynth: Tone.MonoSynth | null = null;
  private leverSynth: Tone.FMSynth | null = null;
  private platterSynth: Tone.MetalSynth | null = null;
  private tendrilSynth: Tone.NoiseSynth | null = null;
  private enemySynth: Tone.AMSynth | null = null;
  private bossSynth: Tone.DuoSynth | null = null;
  private shatterSynth: Tone.NoiseSynth | null = null;

  private constructor() {}

  static getInstance(): SpatialAudioManager {
    if (!SpatialAudioManager.instance) {
      SpatialAudioManager.instance = new SpatialAudioManager();
    }
    return SpatialAudioManager.instance;
  }

  /**
   * Initialize spatial audio with scene and seed-derived audio parameters.
   * Requirement: 17.5
   */
  initialize(_scene: Scene, audioParams: AudioParams): void {
    if (this.isInitialized) return;

    this.audioParams = audioParams;

    const bridge = ImmersionAudioBridge.getInstance();
    const reverb = bridge.getReverb();

    if (!reverb) {
      console.warn('[SpatialAudioManager] ImmersionAudioBridge not initialized — skipping synth creation');
      return;
    }

    // Create procedural synths for each SFX type
    // All synths connect to reverb for spatial immersion

    // Keycap: short metallic click
    this.keycapSynth = new Tone.MonoSynth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
      volume: -12,
    }).connect(reverb);

    // Lever: FM synthesis for gear-grind texture
    this.leverSynth = new Tone.FMSynth({
      harmonicity: 2.5,
      modulationIndex: 10,
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
      volume: -18,
    }).connect(reverb);

    // Platter: metallic resonance
    this.platterSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -24,
    }).connect(reverb);

    // Tendril: filtered noise burst
    this.tendrilSynth = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.01 },
      volume: -18,
    }).connect(reverb);

    // Enemy: AM synthesis for morph texture
    this.enemySynth = new Tone.AMSynth({
      harmonicity: 3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
      volume: -15,
    }).connect(reverb);

    // Boss: dual oscillator for crystalline impact
    this.bossSynth = new Tone.DuoSynth({
      vibratoAmount: 0.5,
      vibratoRate: 5,
      harmonicity: 1.5,
      voice0: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.8 },
      },
      voice1: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.8 },
      },
      volume: -12,
    }).connect(reverb);

    // Shatter: white noise burst with high-pass filter
    this.shatterSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.01 },
      volume: -6,
    }).connect(reverb);

    this.isInitialized = true;
    console.log('[SpatialAudioManager] Initialized with BPM:', audioParams.bpm, 'swing:', audioParams.swing);
  }

  /**
   * Trigger event-driven procedural SFX at contact point.
   * Requirement: 17.4
   */
  triggerSFX(event: SFXEvent): void {
    if (!this.isInitialized) return;

    // Calculate note frequency from root note + position-derived offset
    const noteOffset = Math.floor((event.position.x + event.position.z) * 2) % 12;
    const midiNote = 60 + this.audioParams.rootNote + noteOffset;
    const frequency = Tone.Frequency(midiNote, 'midi').toFrequency();

    // Trigger appropriate synth based on event type
    const now = Tone.now();
    const duration = 0.1 + event.intensity * 0.3; // 0.1–0.4s based on intensity

    switch (event.type) {
      case 'keycap':
        this.keycapSynth?.triggerAttackRelease(frequency, duration, now, event.intensity);
        break;
      case 'lever':
        this.leverSynth?.triggerAttackRelease(frequency * 0.5, duration * 2, now, event.intensity);
        break;
      case 'platter':
        this.platterSynth?.triggerAttackRelease(now, event.intensity);
        break;
      case 'tendril':
        this.tendrilSynth?.triggerAttackRelease(duration, now, event.intensity);
        break;
      case 'enemy':
        this.enemySynth?.triggerAttackRelease(frequency * 1.5, duration * 1.5, now, event.intensity);
        break;
      case 'boss':
        // DuoSynth.triggerAttackRelease(note0, note1, duration, time, velocity)
        this.bossSynth?.triggerAttackRelease(frequency * 0.25, frequency * 0.5, duration * 3, now);
        break;
      case 'shatter':
        this.shatterSynth?.triggerAttackRelease(duration * 4, now, 1.0);
        break;
    }
  }

  /**
   * Update audio parameters for new Dream.
   */
  setAudioParams(audioParams: AudioParams): void {
    this.audioParams = audioParams;
    console.log('[SpatialAudioManager] Updated audio params — BPM:', audioParams.bpm, 'swing:', audioParams.swing);
  }

  /**
   * Dispose audio resources.
   */
  dispose(): void {
    this.keycapSynth?.dispose();
    this.leverSynth?.dispose();
    this.platterSynth?.dispose();
    this.tendrilSynth?.dispose();
    this.enemySynth?.dispose();
    this.bossSynth?.dispose();
    this.shatterSynth?.dispose();

    this.keycapSynth = null;
    this.leverSynth = null;
    this.platterSynth = null;
    this.tendrilSynth = null;
    this.enemySynth = null;
    this.bossSynth = null;
    this.shatterSynth = null;

    this.isInitialized = false;
  }

  /**
   * Reset for new Dream.
   */
  reset(): void {
    // Audio params will be updated via setAudioParams when new Dream spawns
  }
}
