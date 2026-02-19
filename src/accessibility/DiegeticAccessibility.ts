import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * DiegeticAccessibility — Voice commands and adaptive haptics
 *
 * Voice command recognition via expo-speech
 * Spoken keycap letter → holdKey mapping (1200ms, grip 1.0)
 * Adaptive haptics: error above 0.7, medium 0.4–0.7
 *
 * Source: ARCH v3.8 DiegeticAccessibility
 * Validates: Requirement 22
 */
export class DiegeticAccessibility {
  private static instance: DiegeticAccessibility | null = null;

  private isListening = false;
  private currentTension = 0.0;
  private holdKeyCallback: ((key: string, duration: number, grip: number) => void) | null = null;

  // Valid keycap letters (from MechanicalPlatter)
  private readonly validKeys = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];

  private constructor() {}

  static getInstance(): DiegeticAccessibility {
    if (!DiegeticAccessibility.instance) {
      DiegeticAccessibility.instance = new DiegeticAccessibility();
    }
    return DiegeticAccessibility.instance;
  }

  /**
   * Register callback for holdKey integration with PatternStabilizationSystem
   */
  setHoldKeyCallback(callback: (key: string, duration: number, grip: number) => void): void {
    this.holdKeyCallback = callback;
  }

  /**
   * Start voice command recognition
   * Note: expo-speech doesn't have built-in speech recognition — this is a placeholder
   * for future integration with expo-speech-recognition or Web Speech API
   */
  startListening(): void {
    if (this.isListening) return;
    this.isListening = true;
    console.log('DiegeticAccessibility: Voice command recognition started (placeholder)');
    // TODO: Integrate with expo-speech-recognition or Web Speech API when available
  }

  /**
   * Stop voice command recognition
   */
  stopListening(): void {
    if (!this.isListening) return;
    this.isListening = false;
    console.log('DiegeticAccessibility: Voice command recognition stopped');
  }

  /**
   * Process recognized voice command
   * Called by speech recognition integration (placeholder for now)
   */
  onVoiceCommand(command: string): void {
    const upperCommand = command.toUpperCase().trim();

    // Check if command is a valid keycap letter
    if (this.validKeys.includes(upperCommand)) {
      this.stabilizeKey(upperCommand);
    } else {
      console.log(`DiegeticAccessibility: Unrecognized command "${command}"`);
    }
  }

  /**
   * Stabilize pattern via voice command
   * Validates: Requirement 22.1
   */
  private stabilizeKey(key: string): void {
    if (!this.holdKeyCallback) {
      console.warn('DiegeticAccessibility: holdKeyCallback not set');
      return;
    }

    // Call PatternStabilizationSystem.holdKey with 1200ms duration and grip 1.0
    this.holdKeyCallback(key, 1200, 1.0);

    // Spoken feedback: "Stabilizing [key]" at rate 0.9
    // Validates: Requirement 22.2
    this.speak(`Stabilizing ${key}`, 0.9);
  }

  /**
   * Spoken feedback via expo-speech
   * Validates: Requirement 22.2
   */
  private speak(text: string, rate = 1.0): void {
    Speech.speak(text, {
      rate,
      language: 'en-US',
    });
  }

  /**
   * Update tension state for adaptive haptics
   * Called by TensionSystem listener
   */
  setTension(tension: number): void {
    const previousTension = this.currentTension;
    this.currentTension = tension;

    // Trigger adaptive haptics based on tension thresholds
    // Validates: Requirement 22.3, 22.4
    if (tension > 0.7 && previousTension <= 0.7) {
      // Crossed into error zone
      this.triggerErrorHaptic();
    } else if (tension >= 0.4 && tension <= 0.7 && (previousTension < 0.4 || previousTension > 0.7)) {
      // Entered medium zone
      this.triggerMediumHaptic();
    }
  }

  /**
   * Trigger error-level haptic notification (tension > 0.7)
   * Validates: Requirement 22.3
   */
  private triggerErrorHaptic(): void {
    if (Platform.OS === 'web') {
      // Web: long vibration pattern
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
    } else {
      // Native: Heavy impact style
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }

  /**
   * Trigger medium-impact haptic feedback (tension 0.4–0.7)
   * Validates: Requirement 22.4
   */
  private triggerMediumHaptic(): void {
    if (Platform.OS === 'web') {
      // Web: medium vibration
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } else {
      // Native: Medium impact style
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    this.stopListening();
    this.currentTension = 0.0;
  }

  /**
   * Dispose system
   */
  dispose(): void {
    this.stopListening();
    this.holdKeyCallback = null;
    DiegeticAccessibility.instance = null;
  }
}
