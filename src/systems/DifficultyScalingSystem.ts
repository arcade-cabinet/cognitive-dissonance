import type { Scene } from '@babylonjs/core/scene';
import { world } from '../ecs/World';
import type { DifficultyConfig, DifficultySnapshot } from '../types';

/**
 * DifficultyScalingSystem — Logarithmic difficulty progression
 *
 * Computes all difficulty parameters from current tension, elapsed time, and seed-derived config.
 * Uses logarithmic scaling: baseValue * (1 + k * Math.log1p(tension * timeScale))
 *
 * Validates: Requirement 43 (Procedural Difficulty Scaling System)
 * Properties: P18 (formula correctness), P19 (bounds invariant), P20 (per-archetype bounds),
 *             P21 (feedback loop stability), P22 (asymptotic strict inequality), P23 (seed variance)
 */
export class DifficultyScalingSystem {
  private static instance: DifficultyScalingSystem | null = null;
  private config: DifficultyConfig | null = null;
  private startTime: number = 0;
  private scene: Scene | null = null;
  private updateCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): DifficultyScalingSystem {
    if (!DifficultyScalingSystem.instance) {
      DifficultyScalingSystem.instance = new DifficultyScalingSystem();
    }
    return DifficultyScalingSystem.instance;
  }

  /**
   * Initialize the system with scene and active Level_Archetype entity
   */
  init(scene: Scene): void {
    this.scene = scene;
    this.startTime = performance.now();

    // Find active Level_Archetype entity and extract difficultyConfig
    const levelEntities = world.with('level', 'difficultyConfig');
    const activeLevel = levelEntities.first;

    if (activeLevel?.difficultyConfig) {
      this.config = activeLevel.difficultyConfig;
    } else {
      console.warn('DifficultyScalingSystem: No active Level_Archetype with difficultyConfig found');
    }

    // Register per-frame update
    this.updateCallback = () => this.update();
    scene.registerBeforeRender(this.updateCallback);
  }

  /**
   * Per-frame update: compute DifficultySnapshot and write to active Level_Archetype entity.
   * Can be called with explicit elapsedMs (for testing) or without (uses wall-clock time).
   */
  update(elapsedMs?: number): void {
    if (!this.config || !this.scene) return;

    // Read tension from TensionSystem (via scene metadata for now — will be wired properly in SystemOrchestrator)
    const tension = (this.scene.metadata?.currentTension as number) ?? 0.0;
    const elapsed = elapsedMs ?? performance.now() - this.startTime;

    // Compute DifficultySnapshot
    const snapshot = this.computeSnapshot(tension, elapsed);

    // Write to active Level_Archetype entity
    const levelEntities = world.with('level', 'difficultyConfig');
    const activeLevel = levelEntities.first;

    if (activeLevel) {
      // Update ECS component values
      activeLevel.spawnRate = snapshot.spawnRate;
      activeLevel.maxEnemyCount = snapshot.maxEnemyCount;
      activeLevel.patternComplexity = snapshot.patternComplexity;
      activeLevel.morphSpeed = snapshot.morphSpeed;
      activeLevel.bossSpawnThreshold = snapshot.bossSpawnThreshold;
      activeLevel.tensionIncreaseModifier = snapshot.tensionIncreaseModifier;

      // Update per-archetype extensions
      if (activeLevel.platterCore && activeLevel.rotationAxis) {
        // PlatterRotationDream: scale RPM
        const baseRPM = activeLevel.rotationRPM ?? 5;
        activeLevel.rotationRPM = this.scaleValue(baseRPM, 18, tension, elapsed);
      }

      if (activeLevel.leverCore) {
        // LeverTensionDream: tighten frequency tolerance
        const baseTolerance = activeLevel.frequencyTolerance ?? 0.15;
        activeLevel.frequencyTolerance = this.scaleValue(baseTolerance, 0.04, tension, elapsed, true);
      }

      if (activeLevel.keycapPatterns) {
        // KeySequenceDream: scale sequence length and time window
        const baseLength = activeLevel.baseSequenceLength ?? 2;
        activeLevel.baseSequenceLength = Math.min(7, Math.floor(this.scaleValue(baseLength, 7, tension, elapsed)));

        const baseWindow = activeLevel.stabilizationHoldTime ?? 1200;
        activeLevel.stabilizationHoldTime = this.scaleValue(baseWindow, 400, tension, elapsed, true);
      }

      if (activeLevel.boss && activeLevel.cubeCrystalline) {
        // CrystallineCubeBossDream: scale slam cycles and counter window
        const baseCycles = activeLevel.slamCycles ?? 1;
        activeLevel.slamCycles = Math.min(5, Math.floor(this.scaleValue(baseCycles, 5, tension, elapsed)));

        const baseWindow = activeLevel.counterWindowBase ?? 4.0;
        activeLevel.counterWindowBase = this.scaleValue(baseWindow, 1.5, tension, elapsed, true);
      }
    }
  }

  /**
   * Compute DifficultySnapshot from tension and elapsed time
   *
   * Formula: scaledValue = baseValue * (1 + k * Math.log1p(tension * timeScale))
   *
   * @param tension Current tension (0.0–0.999)
   * @param elapsedMs Elapsed time since Dream start
   * @returns DifficultySnapshot with all scaled parameters
   */
  private computeSnapshot(tension: number, elapsedMs: number): DifficultySnapshot {
    if (!this.config) {
      throw new Error('DifficultyScalingSystem: config not initialized');
    }

    const t = Math.max(0.0, Math.min(0.999, tension)); // clamp tension
    const timeScale = this.config.timeScale * elapsedMs;
    const k = this.config.k;
    const scale = 1 + k * Math.log1p(t * timeScale);

    return {
      // Spawn rate: decreases (faster spawns) — base ~1.2s → floor 0.2s
      spawnRate: Math.max(this.config.spawnRateFloor, this.config.spawnRateBase / scale),

      // Max enemies: increases — base 3 → ceiling 24
      maxEnemyCount: Math.min(this.config.maxEnemyCeiling, Math.floor(this.config.maxEnemyBase * scale)),

      // Pattern complexity: stepped thresholds from log curve
      patternComplexity: Math.min(6, Math.floor(1 + scale)),

      // Morph speed: increases — base 1.0x → ceiling 3.0x
      morphSpeed: Math.min(this.config.morphSpeedCeiling, this.config.morphSpeedBase * scale),

      // Boss threshold: decreases (earlier bosses) — base 0.92 → floor 0.6
      bossSpawnThreshold: Math.max(this.config.bossThresholdFloor, this.config.bossThresholdBase / scale),

      // Tension increase rate modifier (feedback loop with damping)
      tensionIncreaseModifier: 1 + (scale - 1) * this.config.dampingCoeff,
    };
  }

  /**
   * Scale a single value using the logarithmic curve
   *
   * @param baseValue Starting value
   * @param targetValue Asymptotic ceiling (or floor if inverse=true)
   * @param tension Current tension
   * @param elapsedMs Elapsed time
   * @param inverse If true, scale downward toward floor (for tolerances, time windows)
   * @returns Scaled value strictly within bounds
   */
  private scaleValue(
    baseValue: number,
    targetValue: number,
    tension: number,
    elapsedMs: number,
    inverse: boolean = false,
  ): number {
    if (!this.config) return baseValue;

    const t = Math.max(0.0, Math.min(0.999, tension));
    const timeScale = this.config.timeScale * elapsedMs;
    const k = this.config.k;
    const scale = 1 + k * Math.log1p(t * timeScale);

    if (inverse) {
      // Scale downward: baseValue / scale, clamped above targetValue (floor)
      return Math.max(targetValue, baseValue / scale);
    } else {
      // Scale upward: baseValue * scale, clamped below targetValue (ceiling)
      return Math.min(targetValue, baseValue * scale);
    }
  }

  /**
   * Get current difficulty snapshot (for external systems)
   */
  getCurrentSnapshot(tension?: number): DifficultySnapshot | null {
    if (!this.config) return null;
    const t = tension ?? (this.scene?.metadata?.currentTension as number) ?? 0.0;
    const elapsedMs = performance.now() - this.startTime;
    return this.computeSnapshot(t, elapsedMs);
  }

  /**
   * Initialize with explicit config (for testing)
   */
  initialize(scene: Scene, config: DifficultyConfig): void {
    this.scene = scene;
    this.config = config;
    this.startTime = performance.now();
  }

  /**
   * Get scaled PlatterRotation RPM (for testing)
   */
  getPlatterRotationRPM(baseRPM: number): number {
    if (!this.config || !this.scene) return baseRPM;
    const tension = (this.scene.metadata?.currentTension as number) ?? 0.0;
    const elapsedMs = performance.now() - this.startTime;
    return Math.min(18, this.scaleValue(baseRPM, 18, tension, elapsedMs));
  }

  /**
   * Get scaled LeverTension tolerance (for testing)
   */
  getLeverTensionTolerance(baseTolerance: number): number {
    if (!this.config || !this.scene) return baseTolerance;
    const tension = (this.scene.metadata?.currentTension as number) ?? 0.0;
    const elapsedMs = performance.now() - this.startTime;
    return Math.max(0.04, this.scaleValue(baseTolerance, 0.04, tension, elapsedMs, true));
  }

  /**
   * Get scaled KeySequence length (for testing)
   */
  getKeySequenceLength(baseLength: number): number {
    if (!this.config || !this.scene) return baseLength;
    const tension = (this.scene.metadata?.currentTension as number) ?? 0.0;
    const elapsedMs = performance.now() - this.startTime;
    return Math.min(7, Math.floor(this.scaleValue(baseLength, 7, tension, elapsedMs)));
  }

  /**
   * Get scaled KeySequence time window (for testing)
   */
  getKeySequenceTimeWindow(baseWindow: number): number {
    if (!this.config || !this.scene) return baseWindow;
    const tension = (this.scene.metadata?.currentTension as number) ?? 0.0;
    const elapsedMs = performance.now() - this.startTime;
    return Math.max(400, this.scaleValue(baseWindow, 400, tension, elapsedMs, true));
  }

  /**
   * Get scaled CrystallineCubeBoss slam cycles (for testing)
   */
  getBossSlamCycles(baseCycles: number): number {
    if (!this.config || !this.scene) return baseCycles;
    const tension = (this.scene.metadata?.currentTension as number) ?? 0.0;
    const elapsedMs = performance.now() - this.startTime;
    return Math.min(5, Math.floor(this.scaleValue(baseCycles, 5, tension, elapsedMs)));
  }

  /**
   * Get scaled CrystallineCubeBoss counter window (for testing)
   */
  getBossCounterWindow(baseWindow: number): number {
    if (!this.config || !this.scene) return baseWindow;
    const tension = (this.scene.metadata?.currentTension as number) ?? 0.0;
    const elapsedMs = performance.now() - this.startTime;
    return Math.max(1.5, this.scaleValue(baseWindow, 1.5, tension, elapsedMs, true));
  }

  /**
   * Reset for new Dream
   */
  reset(newConfig: DifficultyConfig): void {
    this.config = newConfig;
    this.startTime = performance.now();
  }

  /**
   * Dispose system
   */
  dispose(): void {
    if (this.scene && this.updateCallback) {
      this.scene.unregisterBeforeRender(this.updateCallback);
    }
    this.scene = null;
    this.updateCallback = null;
    this.config = null;
  }
}
