import type { TensionCurveConfig } from '../types';

/**
 * TensionSystem — Singleton managing the AI mind's corruption level
 *
 * Tension is a float clamped between 0.0 and 0.999:
 * - 0.0 = calm blue nebula, minimal corruption
 * - 0.999 = violent red nebula, sphere shatters
 *
 * Over-stabilization rebound: 2% chance of +0.12 spike when tension < 0.05
 *
 * Propagates to:
 * - ImmersionAudioBridge (reverb wet 0.3→0.9)
 * - MechanicalDegradationSystem (crack intensity, jitter)
 * - ProceduralMorphSystem (morphProgress scaling)
 * - SphereNebulaMaterial (color interpolation, pulse, jitter)
 * - PostProcessCorruption (bloom/vignette/chromatic weights)
 * - DifficultyScalingSystem (tension-driven difficulty computation)
 */
export class TensionSystem {
  private static instance: TensionSystem | null = null;

  private _currentTension: number = 0.0;
  private _tensionCurve: TensionCurveConfig | null = null;
  private _frozen: boolean = false;
  private _listeners: Array<(tension: number) => void> = [];

  private constructor() {}

  static getInstance(): TensionSystem {
    if (!TensionSystem.instance) {
      TensionSystem.instance = new TensionSystem();
    }
    return TensionSystem.instance;
  }

  /**
   * Initialize with a tension curve from the active Level_Archetype entity
   */
  init(tensionCurve: TensionCurveConfig): void {
    this._tensionCurve = tensionCurve;
    this._currentTension = 0.0;
    this._frozen = false;
    console.log('[TensionSystem] Initialized with curve:', tensionCurve);
  }

  /**
   * Current tension value (0.0–0.999)
   */
  get currentTension(): number {
    return this._currentTension;
  }

  /**
   * Increase tension by a scaled amount
   * @param amount Base increase amount (will be scaled by tensionCurve.increaseRate)
   */
  increase(amount: number): void {
    if (this._frozen || !this._tensionCurve) return;

    const scaledAmount = amount * this._tensionCurve.increaseRate;
    this._currentTension = Math.min(0.999, this._currentTension + scaledAmount);
    this._notifyListeners();

    // Check for sphere shatter trigger
    if (this._currentTension >= 0.999) {
      this._triggerShatter();
    }
  }

  /**
   * Decrease tension by a scaled amount with over-stabilization risk
   * @param amount Base decrease amount (will be scaled by tensionCurve.decreaseRate)
   * @param handGrip Optional hand grip strength (0.0–1.0, default 1.0 for keyboard)
   */
  decrease(amount: number, handGrip: number = 1.0): void {
    if (this._frozen || !this._tensionCurve) return;

    const scaledAmount = amount * this._tensionCurve.decreaseRate * handGrip;
    this._currentTension = Math.max(0.0, this._currentTension - scaledAmount);
    this._notifyListeners();

    // Check for over-stabilization rebound
    this._checkOverStabilization();
  }

  /**
   * Set tension to a specific value (clamped 0.0–0.999)
   */
  setTension(value: number): void {
    if (this._frozen) return;

    this._currentTension = Math.max(0.0, Math.min(0.999, value));
    this._notifyListeners();

    if (this._currentTension >= 0.999) {
      this._triggerShatter();
    }
  }

  /**
   * Freeze tension updates (used during sphere shatter sequence)
   */
  freeze(): void {
    this._frozen = true;
    console.log('[TensionSystem] Frozen at tension:', this._currentTension);
  }

  /**
   * Unfreeze tension updates
   */
  unfreeze(): void {
    this._frozen = false;
    console.log('[TensionSystem] Unfrozen');
  }

  /**
   * Register a listener for tension changes
   */
  addListener(callback: (tension: number) => void): void {
    this._listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback: (tension: number) => void): void {
    this._listeners = this._listeners.filter((cb) => cb !== callback);
  }

  /**
   * Reset tension to 0.0 (used when starting a new Dream)
   */
  reset(): void {
    this._currentTension = 0.0;
    this._frozen = false;
    this._notifyListeners();
    console.log('[TensionSystem] Reset to 0.0');
  }

  /**
   * Dispose the system
   */
  dispose(): void {
    this._listeners = [];
    this._tensionCurve = null;
    this._frozen = false;
    console.log('[TensionSystem] Disposed');
  }

  /**
   * Over-stabilization rebound check
   * When tension < threshold, apply rebound with probability
   */
  private _checkOverStabilization(): void {
    if (!this._tensionCurve) return;

    if (this._currentTension < this._tensionCurve.overStabilizationThreshold) {
      const roll = Math.random();
      if (roll < this._tensionCurve.reboundProbability) {
        console.log('[TensionSystem] Over-stabilization rebound triggered!');
        this._currentTension = Math.min(0.999, this._currentTension + this._tensionCurve.reboundAmount);
        this._notifyListeners();
      }
    }
  }

  /**
   * Notify all listeners of tension change
   */
  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      listener(this._currentTension);
    }
  }

  /**
   * Trigger sphere shatter sequence
   * This will be wired to the ShatterSequence system in Phase 15
   */
  private _triggerShatter(): void {
    console.log('[TensionSystem] Sphere shatter triggered at tension 0.999');
    this.freeze();
    // TODO: Wire to ShatterSequence system when implemented
  }
}
