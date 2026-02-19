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
   * Initialize Tone.js audio context and reverb.
   * On native, expo-audio is used for AudioContext bridging.
   * Requirement: 17.1, 17.3
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // On native, expo-audio provides AudioContext bridging
      if (Platform.OS !== 'web') {
        // expo-audio configuration for native
        // playsInSilentModeIOS: true, staysActiveInBackground: true
        // Note: expo-audio v14+ (Expo SDK 55) handles this automatically
        // No explicit configuration needed — AudioContext is bridged by default
      }

      // Start Tone.js audio context
      await Tone.start();

      // Create reverb (decay 4s, wet 0.6 initial)
      this.reverb = new Tone.Reverb({
        decay: 4,
        wet: 0.6,
      });

      // Connect reverb to destination
      this.reverb.toDestination();

      // Generate reverb impulse response
      await this.reverb.generate();

      this.isInitialized = true;
      console.log('[ImmersionAudioBridge] Initialized successfully');
    } catch (error) {
      console.error('[ImmersionAudioBridge] Initialization failed:', error);
      throw error;
    }
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
    if (this.reverb) {
      this.reverb.dispose();
      this.reverb = null;
    }
    this.isInitialized = false;
    this.currentTension = 0.0;
  }

  /**
   * Reset for new Dream.
   */
  reset(): void {
    this.setTension(0.0);
  }
}
