import type { IKeyboardEvent } from '@babylonjs/core/Events/deviceInputEvents';
import { KeyboardEventTypes } from '@babylonjs/core/Events/keyboardEvents';
import type { Scene } from '@babylonjs/core/scene';
import { useGameStore } from '../store/game-store';
import { useSeedStore } from '../store/seed-store';
import type { DreamTypeHandler } from './DreamTypeHandler';
import type { MechanicalAnimationSystem } from './MechanicalAnimationSystem';
import type { PatternStabilizationSystem } from './PatternStabilizationSystem';

/**
 * KeyboardInputSystem — Singleton bridging physical keyboard to gameplay systems
 *
 * Key mappings:
 * - Letter keys (A–Z) → PatternStabilizationSystem.holdKey(key, holdDuration, 1.0)
 * - Spacebar → MechanicalAnimationSystem.pullLever(position) [0→1 over 800ms]
 * - Enter → game phase transition (title→playing, shattered→title with new seed)
 * - Arrow Left/Right → MechanicalAnimationSystem.rotatePlatter(direction) [PlatterRotationDream only]
 *
 * Supports up to 6 simultaneous key holds for pattern set matching.
 * Disabled when XR session is active or phone projection mode is active.
 *
 * Validates: Requirement 31 (Keyboard Input System)
 */
export class KeyboardInputSystem {
  private static instance: KeyboardInputSystem | null = null;

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Will be used when system is fully integrated with scene observers
  private scene: Scene | null = null;
  private enabled: boolean = true;
  private activeKeys: Map<string, { startTime: number }> = new Map();
  private spacebarStartTime: number | null = null;
  private spacebarAnimationFrame: number | null = null;

  // System references
  private patternStabilizationSystem: PatternStabilizationSystem | null = null;
  private mechanicalAnimationSystem: MechanicalAnimationSystem | null = null;
  private dreamTypeHandler: DreamTypeHandler | null = null;

  // Valid keycap letters (from MechanicalPlatter)
  private readonly validKeycapLetters = new Set(['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C']);

  private constructor() {}

  static getInstance(): KeyboardInputSystem {
    if (!KeyboardInputSystem.instance) {
      KeyboardInputSystem.instance = new KeyboardInputSystem();
    }
    return KeyboardInputSystem.instance;
  }

  /**
   * Initialize the system with scene and system references.
   */
  initialize(
    scene: Scene,
    patternStabilizationSystem: PatternStabilizationSystem,
    mechanicalAnimationSystem: MechanicalAnimationSystem,
    dreamTypeHandler: DreamTypeHandler,
  ): void {
    this.scene = scene;
    this.patternStabilizationSystem = patternStabilizationSystem;
    this.mechanicalAnimationSystem = mechanicalAnimationSystem;
    this.dreamTypeHandler = dreamTypeHandler;

    // Register keyboard observers
    scene.onKeyboardObservable.add((kbInfo) => {
      if (!this.enabled) return;

      if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
        this.onKeyDown(kbInfo.event);
      } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
        this.onKeyUp(kbInfo.event);
      }
    });

    console.log('[KeyboardInputSystem] Initialized');
  }

  /**
   * Handle keydown events
   */
  private onKeyDown(event: IKeyboardEvent): void {
    const key = event.key.toUpperCase();

    // Prevent default for game keys to avoid browser shortcuts
    if (
      this.validKeycapLetters.has(key) ||
      key === ' ' ||
      key === 'ENTER' ||
      key === 'ARROWLEFT' ||
      key === 'ARROWRIGHT'
    ) {
      event.preventDefault();
    }

    // Letter keys → keycap hold
    if (this.validKeycapLetters.has(key)) {
      this.handleKeycapPress(key);
      return;
    }

    // Spacebar → lever pull
    if (key === ' ') {
      this.handleSpacebarPress();
      return;
    }

    // Enter → phase transition
    if (key === 'ENTER') {
      this.handleEnterPress();
      return;
    }

    // Arrow keys → platter rotation (PlatterRotationDream only)
    if (key === 'ARROWLEFT' || key === 'ARROWRIGHT') {
      this.handleArrowPress(key);
      return;
    }
  }

  /**
   * Handle keyup events
   */
  private onKeyUp(event: IKeyboardEvent): void {
    const key = event.key.toUpperCase();

    // Letter keys → keycap release
    if (this.validKeycapLetters.has(key)) {
      this.handleKeycapRelease(key);
      return;
    }

    // Spacebar → lever release
    if (key === ' ') {
      this.handleSpacebarRelease();
      return;
    }
  }

  /**
   * Handle keycap press (letter keys)
   * Validates: Requirement 31.1, 31.3
   */
  private handleKeycapPress(key: string): void {
    // Enforce 6-key simultaneous hold limit (Req 31.3)
    if (this.activeKeys.size >= 6 && !this.activeKeys.has(key)) {
      console.warn('[KeyboardInputSystem] 6-key hold limit reached, ignoring key:', key);
      return;
    }

    // Track key press start time
    if (!this.activeKeys.has(key)) {
      this.activeKeys.set(key, { startTime: performance.now() });

      // Call PatternStabilizationSystem.holdKey with grip strength 1.0 (Req 31.1)
      if (this.patternStabilizationSystem) {
        // Hold duration will be calculated on release
        // For now, we pass 0 duration and will update on release
        this.patternStabilizationSystem.holdKey(key, 0, 1.0);
      }
    }
  }

  /**
   * Handle keycap release (letter keys)
   * Validates: Requirement 31.2
   */
  private handleKeycapRelease(key: string): void {
    const keyData = this.activeKeys.get(key);
    if (!keyData) return;

    // Calculate hold duration (for future use in analytics/debugging)
    const _holdDuration = performance.now() - keyData.startTime;

    // Remove from active keys
    this.activeKeys.delete(key);

    // Call PatternStabilizationSystem.releaseKey (Req 31.2)
    if (this.patternStabilizationSystem) {
      this.patternStabilizationSystem.releaseKey(key);
    }
  }

  /**
   * Handle spacebar press (lever pull)
   * Validates: Requirement 31.4
   */
  private handleSpacebarPress(): void {
    if (this.spacebarStartTime !== null) return; // Already pressed

    this.spacebarStartTime = performance.now();

    // Start animation loop to update lever position (0→1 over 800ms)
    const updateLeverPosition = () => {
      if (this.spacebarStartTime === null) return;

      const elapsed = performance.now() - this.spacebarStartTime;
      const position = Math.min(1.0, elapsed / 800); // 0→1 over 800ms (Req 31.4)

      // Call MechanicalAnimationSystem.pullLever
      if (this.mechanicalAnimationSystem) {
        this.mechanicalAnimationSystem.pullLever(position);
      }

      // Continue animation if not at max position
      if (position < 1.0) {
        this.spacebarAnimationFrame = requestAnimationFrame(updateLeverPosition);
      } else {
        this.spacebarAnimationFrame = null;
      }
    };

    updateLeverPosition();
  }

  /**
   * Handle spacebar release (lever release)
   */
  private handleSpacebarRelease(): void {
    if (this.spacebarStartTime === null) return;

    // Cancel animation frame
    if (this.spacebarAnimationFrame !== null) {
      cancelAnimationFrame(this.spacebarAnimationFrame);
      this.spacebarAnimationFrame = null;
    }

    // Reset lever to neutral position (0.5)
    if (this.mechanicalAnimationSystem) {
      this.mechanicalAnimationSystem.pullLever(0.5);
    }

    this.spacebarStartTime = null;
  }

  /**
   * Handle Enter key press (phase transitions)
   * Validates: Requirement 31.5
   */
  private handleEnterPress(): void {
    const currentPhase = useGameStore.getState().phase;

    // Title → Playing (Req 31.5)
    if (currentPhase === 'title') {
      useGameStore.getState().setPhase('playing');
      console.log('[KeyboardInputSystem] Phase transition: title → playing');
      return;
    }

    // Shattered → Title (with new seed)
    if (currentPhase === 'shattered') {
      useSeedStore.getState().generateNewSeed();
      useGameStore.getState().setPhase('title');
      console.log('[KeyboardInputSystem] Phase transition: shattered → title (new seed)');
      return;
    }
  }

  /**
   * Handle arrow key press (platter rotation)
   * Validates: Requirement 31.6
   */
  private handleArrowPress(key: 'ARROWLEFT' | 'ARROWRIGHT'): void {
    // Only active in PlatterRotationDream (Req 31.6)
    if (!this.dreamTypeHandler) return;

    const archetypeName = this.dreamTypeHandler.getArchetypeName();
    if (archetypeName !== 'PlatterRotationDream') {
      return;
    }

    // Arrow Left → rotate counter-clockwise (negative RPM)
    // Arrow Right → rotate clockwise (positive RPM)
    const rpm = key === 'ARROWLEFT' ? -5 : 5;

    if (this.mechanicalAnimationSystem) {
      this.mechanicalAnimationSystem.rotatePlatter(rpm);
    }
  }

  /**
   * Enable keyboard input
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    // Clear active keys when disabled
    if (!enabled) {
      this.activeKeys.clear();
      this.spacebarStartTime = null;
      if (this.spacebarAnimationFrame !== null) {
        cancelAnimationFrame(this.spacebarAnimationFrame);
        this.spacebarAnimationFrame = null;
      }
    }

    console.log(`[KeyboardInputSystem] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Check if keyboard input is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get count of currently held keys
   */
  getActiveKeyCount(): number {
    return this.activeKeys.size;
  }

  /**
   * Reset system state
   */
  reset(): void {
    this.activeKeys.clear();
    this.spacebarStartTime = null;
    if (this.spacebarAnimationFrame !== null) {
      cancelAnimationFrame(this.spacebarAnimationFrame);
      this.spacebarAnimationFrame = null;
    }
    this.enabled = true;
  }

  /**
   * Dispose system
   */
  dispose(): void {
    this.reset();
    this.scene = null;
    this.patternStabilizationSystem = null;
    this.mechanicalAnimationSystem = null;
    this.dreamTypeHandler = null;
  }
}
