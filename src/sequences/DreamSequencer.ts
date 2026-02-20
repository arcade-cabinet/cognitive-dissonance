/**
 * DreamSequencer — Session-Level Dream Pacing Orchestrator
 *
 * Manages the endless game session by selecting and sequencing archetypes
 * into a coherent emotional arc. Sits above GamePhaseManager and
 * ArchetypeActivationSystem to provide the 8-Dream pacing cycle:
 *
 *   Opening (1-2) → Development (3-5) → Climax (6-7) → Resolution (8)
 *
 * This kishōtenketsu-inspired structure creates a rhythmic emotional arc
 * that resets every ~8 minutes, preventing fatigue while maintaining engagement.
 *
 * Responsibilities:
 * - Track session progress (dreamIndex, used archetypes, total tension history)
 * - Select next archetype from pacing-aware pool (no repeats within a cycle)
 * - Manage tension carryover between Dreams (partial reset, momentum carry)
 * - Provide transition timing for visual/audio bridge between Dreams
 * - Track session statistics for scoring and replay value
 *
 * Design: LEVEL_ARCHETYPES.md §Pacing Guidelines
 */

import { ARCHETYPE_METADATA, type ArchetypeType, type CognitiveLoad, type PacingProfile } from '../ecs/components';
import { ARCHETYPE_TYPES, deriveArchetypeSlots, selectArchetypeFromSeed } from '../ecs/archetypeSlots';
import { hashSeed, mulberry32 } from '../utils/seed-helpers';
import type { TensionCurveConfig } from '../types';

// ── Transition Timing Constants ──

/** Duration of visual bridge between Dreams (seconds) */
const DREAM_TRANSITION_DURATION = 2.5;

/** Tension carryover ratio: how much tension persists into next Dream */
const TENSION_CARRYOVER_RATIO = 0.25;

/** Resolution Dream tension floor: max tension entering resolution phase */
const RESOLUTION_TENSION_CAP = 0.3;

/** Minimum tension entering a climax Dream (floor boost) */
const CLIMAX_TENSION_FLOOR = 0.4;

// ── Pacing Pools ──

/**
 * Archetype pools by pacing phase.
 * Each pool is ordered by ascending cognitive load within its phase.
 */
const OPENING_POOL: ArchetypeType[] = [
  'ZenDrift', 'Labyrinth', 'LeverTension', 'PlatterRotation', 'KeySequence',
];

const DEVELOPMENT_POOL: ArchetypeType[] = [
  'FacetAlign', 'RefractionAim', 'ChordHold', 'MorphMirror', 'RhythmGate',
  'WhackAMole', 'TurntableScratch', 'LockPick', 'Resonance', 'SphereSculpt',
  'Conductor', 'GhostChase',
];

const CLIMAX_POOL: ArchetypeType[] = [
  'CrystallineCubeBoss', 'OrbitalCatch', 'Survival', 'CubeJuggle',
  'TendrilDodge', 'Escalation', 'CubeStack', 'Pinball',
];

const RESOLUTION_POOL: ArchetypeType[] = [
  'ZenDrift', 'Labyrinth', 'Resonance',
];

// ── Session Statistics ──

export interface DreamResult {
  archetypeType: ArchetypeType;
  dreamIndex: number;
  peakTension: number;
  exitTension: number;
  durationMs: number;
  survived: boolean; // false = shattered during this Dream
}

export interface SessionStats {
  totalDreams: number;
  completedCycles: number;
  longestStreak: number; // Consecutive Dreams survived
  currentStreak: number;
  averageTension: number;
  archetypeHistory: DreamResult[];
  peakTension: number;
}

// ── Tension Curve Presets per Pacing Phase ──

function buildTensionCurveForPhase(
  phase: 'opening' | 'development' | 'climax' | 'resolution',
  seedHash: number,
): TensionCurveConfig {
  const rng = mulberry32(seedHash);
  const v = () => 0.85 + (rng() * 31) / 100; // ±15% variance

  switch (phase) {
    case 'opening':
      return {
        increaseRate: 0.015 * v(),  // Gentle tension buildup
        decreaseRate: 0.025 * v(),  // Quick recovery (forgiving)
        overStabilizationThreshold: 0.08,
        reboundProbability: 0.01,
        reboundAmount: 0.08,
      };
    case 'development':
      return {
        increaseRate: 0.025 * v(),
        decreaseRate: 0.018 * v(),
        overStabilizationThreshold: 0.05,
        reboundProbability: 0.02,
        reboundAmount: 0.12,
      };
    case 'climax':
      return {
        increaseRate: 0.04 * v(),   // Aggressive tension
        decreaseRate: 0.012 * v(),  // Slow recovery (punishing)
        overStabilizationThreshold: 0.03,
        reboundProbability: 0.04,
        reboundAmount: 0.18,
      };
    case 'resolution':
      return {
        increaseRate: 0.01 * v(),   // Almost no tension buildup
        decreaseRate: 0.035 * v(),  // Very fast recovery (calm)
        overStabilizationThreshold: 0.1,
        reboundProbability: 0.005,
        reboundAmount: 0.05,
      };
  }
}

/**
 * DreamSequencer — Singleton
 *
 * Manages session-level Dream pacing and archetype selection.
 */
export class DreamSequencer {
  private static instance: DreamSequencer | null = null;

  // Session state
  private dreamIndex = 0;
  private currentCycle = 0;
  private usedArchetypes: ArchetypeType[] = [];
  private sessionSeedHash = 0;
  private currentArchetype: ArchetypeType | null = null;
  private dreamStartTime = 0;
  private currentPeakTension = 0;

  // Statistics
  private stats: SessionStats = {
    totalDreams: 0,
    completedCycles: 0,
    longestStreak: 0,
    currentStreak: 0,
    averageTension: 0,
    archetypeHistory: [],
    peakTension: 0,
  };

  // Transition state
  private isTransitioning = false;

  private constructor() {}

  static getInstance(): DreamSequencer {
    if (!DreamSequencer.instance) {
      DreamSequencer.instance = new DreamSequencer();
    }
    return DreamSequencer.instance;
  }

  /**
   * Start a new session with a seed string.
   * Resets all session state.
   */
  startSession(seedString: string): void {
    this.sessionSeedHash = hashSeed(seedString);
    this.dreamIndex = 0;
    this.currentCycle = 0;
    this.usedArchetypes = [];
    this.currentArchetype = null;
    this.dreamStartTime = 0;
    this.currentPeakTension = 0;
    this.isTransitioning = false;
    this.stats = {
      totalDreams: 0,
      completedCycles: 0,
      longestStreak: 0,
      currentStreak: 0,
      averageTension: 0,
      archetypeHistory: [],
      peakTension: 0,
    };
  }

  /**
   * Select the next Dream archetype based on pacing arc position.
   *
   * @returns Object with archetype type, slots, tension curve, and carryover tension
   */
  selectNextDream(): {
    archetypeType: ArchetypeType;
    seedHash: number;
    tensionCurve: TensionCurveConfig;
    carryoverTension: number;
    pacingPhase: 'opening' | 'development' | 'climax' | 'resolution';
    transitionDurationMs: number;
  } {
    // Determine pacing phase from cycle position
    const cyclePosition = this.dreamIndex % 8;
    const pacingPhase = this.getPacingPhase(cyclePosition);

    // Generate per-Dream seed (deterministic from session seed + dream index)
    const dreamSeedHash = this.sessionSeedHash + this.dreamIndex * 7919;

    // Select archetype from pacing-appropriate pool
    const archetypeType = this.selectFromPool(pacingPhase, dreamSeedHash);

    // Build tension curve appropriate for pacing phase
    const tensionCurve = buildTensionCurveForPhase(pacingPhase, dreamSeedHash);

    // Calculate tension carryover from previous Dream
    const carryoverTension = this.calculateCarryoverTension(pacingPhase);

    // Track state
    this.currentArchetype = archetypeType;
    this.usedArchetypes.push(archetypeType);
    this.dreamStartTime = performance.now();
    this.currentPeakTension = carryoverTension;
    this.stats.totalDreams++;

    // Check for cycle completion
    if (cyclePosition === 0 && this.dreamIndex > 0) {
      this.currentCycle++;
      this.stats.completedCycles = this.currentCycle;
    }

    return {
      archetypeType,
      seedHash: dreamSeedHash,
      tensionCurve,
      carryoverTension,
      pacingPhase,
      transitionDurationMs: this.dreamIndex === 0 ? 0 : DREAM_TRANSITION_DURATION * 1000,
    };
  }

  /**
   * Record Dream completion (survived to next Dream).
   * Called when Dream ends normally (not shattered).
   */
  recordDreamCompletion(exitTension: number): void {
    if (!this.currentArchetype) return;

    const result: DreamResult = {
      archetypeType: this.currentArchetype,
      dreamIndex: this.dreamIndex,
      peakTension: this.currentPeakTension,
      exitTension,
      durationMs: performance.now() - this.dreamStartTime,
      survived: true,
    };

    this.stats.archetypeHistory.push(result);
    this.stats.currentStreak++;
    this.stats.longestStreak = Math.max(this.stats.longestStreak, this.stats.currentStreak);
    this.updateAverageTension(exitTension);

    this.dreamIndex++;
  }

  /**
   * Record Dream failure (sphere shattered).
   * Session continues from title phase after restart.
   */
  recordDreamShatter(exitTension: number): void {
    if (!this.currentArchetype) return;

    const result: DreamResult = {
      archetypeType: this.currentArchetype,
      dreamIndex: this.dreamIndex,
      peakTension: this.currentPeakTension,
      exitTension,
      durationMs: performance.now() - this.dreamStartTime,
      survived: false,
    };

    this.stats.archetypeHistory.push(result);
    this.stats.currentStreak = 0;
    this.updateAverageTension(exitTension);
  }

  /**
   * Update peak tension tracking (called per-frame or on tension change).
   */
  updatePeakTension(tension: number): void {
    if (tension > this.currentPeakTension) {
      this.currentPeakTension = tension;
    }
    if (tension > this.stats.peakTension) {
      this.stats.peakTension = tension;
    }
  }

  /**
   * Get current session statistics.
   */
  getStats(): Readonly<SessionStats> {
    return this.stats;
  }

  /**
   * Get current Dream index within session.
   */
  getDreamIndex(): number {
    return this.dreamIndex;
  }

  /**
   * Get current pacing cycle number (0-based).
   */
  getCurrentCycle(): number {
    return this.currentCycle;
  }

  /**
   * Get current archetype type.
   */
  getCurrentArchetype(): ArchetypeType | null {
    return this.currentArchetype;
  }

  /**
   * Check if currently in a transition between Dreams.
   */
  getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * Set transition state (called by GameBootstrap during Dream bridge).
   */
  setTransitioning(transitioning: boolean): void {
    this.isTransitioning = transitioning;
  }

  /**
   * Get the pacing phase for a given cycle position.
   */
  getPacingPhase(cyclePosition: number): 'opening' | 'development' | 'climax' | 'resolution' {
    if (cyclePosition <= 1) return 'opening';
    if (cyclePosition <= 4) return 'development';
    if (cyclePosition <= 6) return 'climax';
    return 'resolution';
  }

  /**
   * Get the available archetype pool for a given pacing phase.
   * Filters out recently used archetypes.
   */
  getAvailablePool(phase: 'opening' | 'development' | 'climax' | 'resolution'): ArchetypeType[] {
    const pool = this.getPoolForPhase(phase);
    const recentWindow = this.usedArchetypes.slice(-7);
    const available = pool.filter((t) => !recentWindow.includes(t));
    return available.length > 0 ? available : pool;
  }

  // ── Private Methods ──

  private getPoolForPhase(phase: 'opening' | 'development' | 'climax' | 'resolution'): ArchetypeType[] {
    switch (phase) {
      case 'opening': return OPENING_POOL;
      case 'development': return DEVELOPMENT_POOL;
      case 'climax': return CLIMAX_POOL;
      case 'resolution': return RESOLUTION_POOL;
    }
  }

  private selectFromPool(phase: 'opening' | 'development' | 'climax' | 'resolution', dreamSeedHash: number): ArchetypeType {
    const pool = this.getAvailablePool(phase);
    const rng = mulberry32(dreamSeedHash);
    const index = Math.floor(rng() * pool.length);
    return pool[index];
  }

  private calculateCarryoverTension(phase: 'opening' | 'development' | 'climax' | 'resolution'): number {
    if (this.dreamIndex === 0) return 0; // First Dream starts at 0

    const lastResult = this.stats.archetypeHistory[this.stats.archetypeHistory.length - 1];
    if (!lastResult) return 0;

    // Base carryover: 25% of exit tension
    let carryover = lastResult.exitTension * TENSION_CARRYOVER_RATIO;

    // Phase adjustments
    switch (phase) {
      case 'opening':
        // Opening Dreams start calm
        carryover = Math.min(carryover, 0.15);
        break;
      case 'development':
        // Development carries moderate tension forward
        break;
      case 'climax':
        // Climax gets a tension floor boost (minimum starting tension)
        carryover = Math.max(carryover, CLIMAX_TENSION_FLOOR);
        break;
      case 'resolution':
        // Resolution caps carryover to force calm
        carryover = Math.min(carryover, RESOLUTION_TENSION_CAP);
        break;
    }

    return carryover;
  }

  private updateAverageTension(tension: number): void {
    const history = this.stats.archetypeHistory;
    if (history.length === 0) return;
    const sum = history.reduce((acc, r) => acc + r.peakTension, 0);
    this.stats.averageTension = sum / history.length;
  }

  /**
   * Dispose and reset instance.
   */
  dispose(): void {
    this.currentArchetype = null;
    this.usedArchetypes = [];
    this.isTransitioning = false;
  }
}
