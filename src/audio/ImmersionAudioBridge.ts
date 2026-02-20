/**
 * ImmersionAudioBridge — Cognitive Dissonance v3.0
 *
 * Bridges Tone.js (web) with expo-audio (native) for cross-platform adaptive spatial audio.
 * Tension-driven reverb evolution: calm drone (0.3 wet) → frantic glitch (0.9 wet).
 *
 * Source: ARCH v3.0 + v3.1 (Tone.js core + expo-audio native bridge + tension-driven reverb)
 * Requirement: 17.1, 17.2, 17.3
 */

import { Platform } from 'react-native';
import * as Tone from 'tone';

export class ImmersionAudioBridge {
  private static instance: ImmersionAudioBridge | null = null;

  private reverb: Tone.Reverb | null = null;
  private clickSynth: Tone.MetalSynth | null = null;
  private corruptionNoise: Tone.Noise | null = null;
  private noiseFilter: Tone.Filter | null = null;
  private currentTension = 0.0;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ImmersionAudioBridge {
    if (!ImmersionAudioBridge.instance) {
      ImmersionAudioBridge.instance = new ImmersionAudioBridge();
    }
    return ImmersionAudioBridge.instance;
  }

  /**
   * Initialize Tone.js reverb and audio graph (does NOT start AudioContext).
   * AudioContext requires a user gesture on web — call resumeOnUserGesture()
   * from the first keyboard/touch interaction.
   *
   * On native, expo-audio provides AudioContext bridging automatically.
   * Requirement: 17.1, 17.3
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // On native, configure expo-audio for background/silent mode playback.
    // expo-audio types may not be available at compile time (installed on native only).
    if (Platform.OS !== 'web') {
      try {
        const moduleName = 'expo-audio';
        // biome-ignore lint/suspicious/noExplicitAny: expo-audio types only available on native
        const Audio: any = await import(/* @vite-ignore */ moduleName);
        if (Audio?.setAudioModeAsync) {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
          });
          console.log('[ImmersionAudioBridge] expo-audio native mode configured');
        }
      } catch {
        console.warn('[ImmersionAudioBridge] expo-audio not available — using Tone.js only');
      }
    }

    // Create reverb (decay 4s, wet 0.6 initial)
    this.reverb = new Tone.Reverb({
      decay: 4,
      wet: 0.6,
    });

    // Connect reverb to destination
    this.reverb.toDestination();

    // Generate reverb impulse response (works even while context is suspended)
    await this.reverb.generate();

    // Create MetalSynth for mechanical click sounds (keycap depress, lever snap)
    this.clickSynth = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.08,
        release: 0.01,
      },
      harmonicity: 5.1,
      modulationIndex: 16,
      resonance: 4000,
      octaves: 0.5,
      volume: -12,
    });
    this.clickSynth.connect(this.reverb);

    // Create brown noise for corruption static (tension-driven volume)
    this.corruptionNoise = new Tone.Noise('brown');
    this.noiseFilter = new Tone.Filter(800, 'lowpass');
    this.corruptionNoise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.reverb);
    this.corruptionNoise.volume.value = -60; // Start silent

    this.isInitialized = true;
    console.log('[ImmersionAudioBridge] Audio graph initialized (context suspended until user gesture)');
  }

  /**
   * Resume AudioContext on first user gesture (click/tap/keypress).
   * Must be called from a user-initiated event handler.
   * Starts corruption noise (silent until tension rises).
   * Requirement: 17.1
   */
  async resumeOnUserGesture(): Promise<void> {
    if (Tone.getContext().state === 'running') return;

    try {
      await Tone.start();
      // Start corruption noise (will be silent until tension drives volume up)
      if (this.corruptionNoise) {
        this.corruptionNoise.start();
      }
      console.log('[ImmersionAudioBridge] AudioContext resumed via user gesture');
    } catch (error) {
      console.error('[ImmersionAudioBridge] Failed to resume AudioContext:', error);
    }
  }

  /**
   * Play a satisfying mechanical click sound (for keycap depress / lever snap).
   * Must be called after AudioContext is resumed.
   */
  playMechanicalClick(): void {
    if (!this.clickSynth || !this.isInitialized) return;
    if (Tone.getContext().state !== 'running') return;

    this.clickSynth.triggerAttackRelease('C2', '32n');
  }

  /**
   * Update tension value and adjust reverb wet proportionally.
   * Tension 0.0 → wet 0.3 (calm)
   * Tension 1.0 → wet 0.9 (frantic)
   * Requirement: 17.2
   */
  setTension(tension: number): void {
    this.currentTension = Math.max(0.0, Math.min(0.999, tension));

    if (this.reverb && this.isInitialized) {
      // Linear interpolation: 0.3 + (tension × 0.6)
      const wet = 0.3 + this.currentTension * 0.6;
      this.reverb.wet.value = wet;
    }

    // Update corruption noise volume (silent at 0.0, audible static at high tension)
    if (this.corruptionNoise && this.isInitialized) {
      // Volume: -60 dB (silent) at tension 0.0 → -12 dB (audible) at tension 0.999
      const noiseVolume = -60 + this.currentTension * 48;
      this.corruptionNoise.volume.rampTo(noiseVolume, 0.3);
    }
  }

  /**
   * Get the reverb node for connecting audio sources.
   * Returns null if not initialized.
   */
  getReverb(): Tone.Reverb | null {
    return this.reverb;
  }

  /**
   * Check if audio system is initialized.
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose audio resources.
   */
  dispose(): void {
    if (this.corruptionNoise) {
      this.corruptionNoise.stop();
      this.corruptionNoise.dispose();
      this.corruptionNoise = null;
    }
    if (this.noiseFilter) {
      this.noiseFilter.dispose();
      this.noiseFilter = null;
    }
    if (this.clickSynth) {
      this.clickSynth.dispose();
      this.clickSynth = null;
    }
    if (this.reverb) {
      this.reverb.dispose();
      this.reverb = null;
    }
    this.isInitialized = false;
    this.currentTension = 0.0;
    ImmersionAudioBridge.instance = null;
  }

  /**
   * Reset for new Dream.
   */
  reset(): void {
    this.setTension(0.0);
  }
}
