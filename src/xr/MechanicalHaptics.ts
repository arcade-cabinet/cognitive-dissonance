import { Platform } from 'react-native';
import * as Tone from 'tone';

/**
 * MechanicalHaptics — Cross-platform haptic feedback
 *
 * Native: expo-haptics (ImpactFeedbackStyle.Heavy/Medium/Light)
 * Web: navigator.vibrate([duration])
 * Audio: Tone.js brown noise rumble synced to tension (volume = tension × -18 dB)
 *
 * Source: ARCH v3.2 MechanicalHaptics
 * Validates: Requirement 14.3
 */
export class MechanicalHaptics {
  private static instance: MechanicalHaptics | null = null;

  private brownNoise: Tone.Noise | null = null;
  private noiseGain: Tone.Gain | null = null;
  private isInitialized = false;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Cached tension value for future haptic intensity scaling
  private currentTension = 0.0;

  private constructor() {}

  static getInstance(): MechanicalHaptics {
    if (!MechanicalHaptics.instance) {
      MechanicalHaptics.instance = new MechanicalHaptics();
    }
    return MechanicalHaptics.instance;
  }

  /**
   * Initialize Tone.js brown noise rumble
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create brown noise source (low-frequency rumble)
      this.brownNoise = new Tone.Noise('brown');
      this.noiseGain = new Tone.Gain(0); // Start silent
      this.brownNoise.connect(this.noiseGain);
      this.noiseGain.toDestination();

      // Start noise (will be silent until gain is increased)
      await Tone.start();
      this.brownNoise.start();

      this.isInitialized = true;
      console.log('MechanicalHaptics: Initialized with Tone.js brown noise');
    } catch (error) {
      console.warn('MechanicalHaptics: Failed to initialize Tone.js:', error);
    }
  }

  /**
   * Trigger haptic feedback for mechanical contact
   *
   * @param intensity - Haptic intensity (0.0–1.0)
   * @param type - Contact type: 'keycapHold', 'leverPull', 'sphereTouch'
   */
  triggerContact(intensity: number, type: 'keycapHold' | 'leverPull' | 'sphereTouch'): void {
    // Clamp intensity
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    if (Platform.OS === 'web') {
      this.triggerWebVibrate(clampedIntensity, type);
    } else {
      this.triggerNativeHaptic(clampedIntensity, type);
    }
  }

  /**
   * Web haptic feedback via navigator.vibrate
   */
  private triggerWebVibrate(intensity: number, type: 'keycapHold' | 'leverPull' | 'sphereTouch'): void {
    if (!navigator.vibrate) {
      return; // Vibration API not supported
    }

    // Pattern: [vibrate, pause, vibrate]
    // Duration scales with intensity
    const baseDuration = type === 'leverPull' ? 50 : type === 'keycapHold' ? 30 : 20;
    const duration = Math.floor(baseDuration * intensity);

    if (type === 'leverPull') {
      // Heavy double pulse
      navigator.vibrate([duration, 10, duration]);
    } else if (type === 'keycapHold') {
      // Medium single pulse
      navigator.vibrate([duration]);
    } else {
      // Light single pulse
      navigator.vibrate([duration]);
    }
  }

  /**
   * Native haptic feedback via expo-haptics
   */
  private async triggerNativeHaptic(
    _intensity: number,
    type: 'keycapHold' | 'leverPull' | 'sphereTouch',
  ): Promise<void> {
    try {
      // Dynamically import expo-haptics (only available on native)
      const Haptics = await import('expo-haptics');

      if (type === 'leverPull') {
        // Heavy impact
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (type === 'keycapHold') {
        // Medium impact
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Light impact
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('MechanicalHaptics: expo-haptics not available:', error);
    }
  }

  /**
   * Update tension-driven brown noise rumble
   * Called by TensionSystem listener
   *
   * @param tension - Current tension (0.0–0.999)
   */
  setTension(tension: number): void {
    this.currentTension = tension;

    if (!this.isInitialized || !this.noiseGain) return;

    // Volume scales with tension: 0.0 → -60 dB (silent), 0.999 → -18 dB (audible rumble)
    const minDb = -60;
    const maxDb = -18;
    const volumeDb = minDb + tension * (maxDb - minDb);

    // Smooth gain transition
    this.noiseGain.gain.rampTo(Tone.dbToGain(volumeDb), 0.5);
  }

  /**
   * Dispose haptics system
   */
  dispose(): void {
    if (this.brownNoise) {
      this.brownNoise.stop();
      this.brownNoise.dispose();
      this.brownNoise = null;
    }

    if (this.noiseGain) {
      this.noiseGain.dispose();
      this.noiseGain = null;
    }

    this.isInitialized = false;
    this.currentTension = 0.0;
  }
}
