/**
 * Tests for DreamSequencer
 *
 * Covers: singleton pattern, startSession, selectNextDream, pacing arc pools,
 *         no-repeat within cycle, tension carryover, recordDreamCompletion,
 *         recordDreamShatter, updatePeakTension, getStats, determinism.
 */

import { DreamSequencer } from '../DreamSequencer';

// ── Mock performance.now() for consistent timing ──

let mockNow = 0;
const originalPerformanceNow = performance.now.bind(performance);

beforeAll(() => {
  jest.spyOn(performance, 'now').mockImplementation(() => mockNow);
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ── Pacing pool definitions (mirroring source for verification) ──

const OPENING_POOL = [
  'ZenDrift', 'Labyrinth', 'LeverTension', 'PlatterRotation', 'KeySequence',
] as const;

const DEVELOPMENT_POOL = [
  'FacetAlign', 'RefractionAim', 'ChordHold', 'MorphMirror', 'RhythmGate',
  'WhackAMole', 'TurntableScratch', 'LockPick', 'Resonance', 'SphereSculpt',
  'Conductor', 'GhostChase',
] as const;

const CLIMAX_POOL = [
  'CrystallineCubeBoss', 'OrbitalCatch', 'Survival', 'CubeJuggle',
  'TendrilDodge', 'Escalation', 'CubeStack', 'Pinball',
] as const;

const RESOLUTION_POOL = [
  'ZenDrift', 'Labyrinth', 'Resonance',
] as const;

// ── Helpers ──

function resetSequencer(): DreamSequencer {
  (DreamSequencer as any).instance = null;
  return DreamSequencer.getInstance();
}

describe('DreamSequencer', () => {
  let sequencer: DreamSequencer;

  beforeEach(() => {
    mockNow = 0;
    sequencer = resetSequencer();
  });

  // ── 1. Singleton pattern ──

  describe('Singleton pattern', () => {
    it('getInstance returns the same instance on repeated calls', () => {
      const a = DreamSequencer.getInstance();
      const b = DreamSequencer.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting the static field', () => {
      const first = DreamSequencer.getInstance();
      (DreamSequencer as any).instance = null;
      const second = DreamSequencer.getInstance();
      expect(second).not.toBe(first);
    });
  });

  // ── 2. startSession ──

  describe('startSession', () => {
    it('resets all state and sets sessionSeedHash', () => {
      sequencer.startSession('test-seed');

      expect(sequencer.getDreamIndex()).toBe(0);
      expect(sequencer.getCurrentCycle()).toBe(0);
      expect(sequencer.getCurrentArchetype()).toBeNull();
      expect(sequencer.getIsTransitioning()).toBe(false);

      const stats = sequencer.getStats();
      expect(stats.totalDreams).toBe(0);
      expect(stats.completedCycles).toBe(0);
      expect(stats.longestStreak).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.averageTension).toBe(0);
      expect(stats.archetypeHistory).toEqual([]);
      expect(stats.peakTension).toBe(0);
    });

    it('sets a non-zero sessionSeedHash for non-empty seed', () => {
      sequencer.startSession('abc');
      // Access private sessionSeedHash via any cast
      expect((sequencer as any).sessionSeedHash).not.toBe(0);
    });

    it('resets state even after prior Dreams have been selected', () => {
      sequencer.startSession('seed-one');
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.5);
      sequencer.selectNextDream();

      // Now restart
      sequencer.startSession('seed-two');
      expect(sequencer.getDreamIndex()).toBe(0);
      expect(sequencer.getStats().totalDreams).toBe(0);
      expect(sequencer.getStats().archetypeHistory).toEqual([]);
      expect(sequencer.getCurrentArchetype()).toBeNull();
    });
  });

  // ── 3. selectNextDream ──

  describe('selectNextDream', () => {
    beforeEach(() => {
      sequencer.startSession('test-select');
    });

    it('returns an object with archetypeType, seedHash, tensionCurve, carryoverTension, pacingPhase, transitionDurationMs', () => {
      const result = sequencer.selectNextDream();

      expect(result).toHaveProperty('archetypeType');
      expect(typeof result.archetypeType).toBe('string');
      expect(result).toHaveProperty('seedHash');
      expect(typeof result.seedHash).toBe('number');
      expect(result).toHaveProperty('tensionCurve');
      expect(result.tensionCurve).toHaveProperty('increaseRate');
      expect(result.tensionCurve).toHaveProperty('decreaseRate');
      expect(result.tensionCurve).toHaveProperty('overStabilizationThreshold');
      expect(result.tensionCurve).toHaveProperty('reboundProbability');
      expect(result.tensionCurve).toHaveProperty('reboundAmount');
      expect(result).toHaveProperty('carryoverTension');
      expect(typeof result.carryoverTension).toBe('number');
      expect(result).toHaveProperty('pacingPhase');
      expect(result).toHaveProperty('transitionDurationMs');
    });

    it('first Dream has 0 carryover tension', () => {
      const result = sequencer.selectNextDream();
      expect(result.carryoverTension).toBe(0);
    });

    it('first Dream has 0 transition duration', () => {
      const result = sequencer.selectNextDream();
      expect(result.transitionDurationMs).toBe(0);
    });

    it('subsequent Dreams have non-zero transition duration (2500ms)', () => {
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.3);
      const result = sequencer.selectNextDream();
      expect(result.transitionDurationMs).toBe(2500);
    });

    it('increments totalDreams count on each call', () => {
      sequencer.selectNextDream();
      expect(sequencer.getStats().totalDreams).toBe(1);

      sequencer.recordDreamCompletion(0.2);
      sequencer.selectNextDream();
      expect(sequencer.getStats().totalDreams).toBe(2);
    });

    it('sets currentArchetype after selection', () => {
      const result = sequencer.selectNextDream();
      expect(sequencer.getCurrentArchetype()).toBe(result.archetypeType);
    });
  });

  // ── 4. Pacing arc ──

  describe('Pacing arc', () => {
    beforeEach(() => {
      sequencer.startSession('pacing-test');
    });

    /**
     * Helper: select N dreams, recording completion between each.
     * Returns all selected archetypes and pacing phases.
     */
    function selectDreams(count: number): Array<{ archetypeType: string; pacingPhase: string }> {
      const results: Array<{ archetypeType: string; pacingPhase: string }> = [];
      for (let i = 0; i < count; i++) {
        const result = sequencer.selectNextDream();
        results.push({ archetypeType: result.archetypeType, pacingPhase: result.pacingPhase });
        if (i < count - 1) {
          mockNow += 60000; // Advance time for each Dream
          sequencer.recordDreamCompletion(0.3);
        }
      }
      return results;
    }

    it('dreamIndex 0-1 selects from opening pool', () => {
      const results = selectDreams(2);
      for (const r of results) {
        expect(r.pacingPhase).toBe('opening');
        expect(OPENING_POOL as readonly string[]).toContain(r.archetypeType);
      }
    });

    it('dreamIndex 2-4 selects from development pool', () => {
      // Select the first 2 opening Dreams
      const _ = selectDreams(2);
      mockNow += 60000;
      sequencer.recordDreamCompletion(0.3);

      // Now dreamIndex is 2, 3, 4
      for (let i = 2; i <= 4; i++) {
        const result = sequencer.selectNextDream();
        expect(result.pacingPhase).toBe('development');
        expect(DEVELOPMENT_POOL as readonly string[]).toContain(result.archetypeType);
        if (i < 4) {
          mockNow += 60000;
          sequencer.recordDreamCompletion(0.4);
        }
      }
    });

    it('dreamIndex 5-6 selects from climax pool', () => {
      // Advance through opening (0-1) + development (2-4)
      for (let i = 0; i < 5; i++) {
        sequencer.selectNextDream();
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.4);
      }

      // dreamIndex 5 and 6 are climax
      for (let i = 5; i <= 6; i++) {
        const result = sequencer.selectNextDream();
        expect(result.pacingPhase).toBe('climax');
        expect(CLIMAX_POOL as readonly string[]).toContain(result.archetypeType);
        if (i < 6) {
          mockNow += 60000;
          sequencer.recordDreamCompletion(0.5);
        }
      }
    });

    it('dreamIndex 7 selects from resolution pool', () => {
      // Advance through 0-6
      for (let i = 0; i < 7; i++) {
        sequencer.selectNextDream();
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.3);
      }

      const result = sequencer.selectNextDream();
      expect(result.pacingPhase).toBe('resolution');
      expect(RESOLUTION_POOL as readonly string[]).toContain(result.archetypeType);
    });

    it('cycle wraps: dreamIndex 8 should be opening again', () => {
      // Complete a full cycle (0-7)
      for (let i = 0; i < 8; i++) {
        sequencer.selectNextDream();
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.3);
      }

      // dreamIndex 8 should wrap to cyclePosition 0 (opening)
      const result = sequencer.selectNextDream();
      expect(result.pacingPhase).toBe('opening');
      expect(OPENING_POOL as readonly string[]).toContain(result.archetypeType);
    });

    it('getPacingPhase returns correct phase for each cycle position', () => {
      expect(sequencer.getPacingPhase(0)).toBe('opening');
      expect(sequencer.getPacingPhase(1)).toBe('opening');
      expect(sequencer.getPacingPhase(2)).toBe('development');
      expect(sequencer.getPacingPhase(3)).toBe('development');
      expect(sequencer.getPacingPhase(4)).toBe('development');
      expect(sequencer.getPacingPhase(5)).toBe('climax');
      expect(sequencer.getPacingPhase(6)).toBe('climax');
      expect(sequencer.getPacingPhase(7)).toBe('resolution');
    });
  });

  // ── 5. No-repeat within cycle ──

  describe('No-repeat within cycle', () => {
    it('no archetype repeats in the last 7 selections (when pools are large enough)', () => {
      sequencer.startSession('no-repeat-test');

      const archetypes: string[] = [];
      for (let i = 0; i < 7; i++) {
        const result = sequencer.selectNextDream();
        archetypes.push(result.archetypeType);
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.3);
      }

      // Within a single cycle (7 unique slots from different pools),
      // the recent window check should prevent repeats.
      // Note: Opening pool has 5, development has 12, climax has 8 --
      // all larger than the number of selections from each pool,
      // so we expect no duplicates in the last 7.
      const last7 = archetypes.slice(-7);
      const uniqueSet = new Set(last7);
      expect(uniqueSet.size).toBe(last7.length);
    });

    it('getAvailablePool filters recently used archetypes', () => {
      sequencer.startSession('filter-test');
      // Select the first Dream (opening pool)
      const result = sequencer.selectNextDream();
      const selectedType = result.archetypeType;

      // The available pool should now exclude the selected archetype
      const available = sequencer.getAvailablePool('opening');
      expect(available).not.toContain(selectedType);
    });

    it('getAvailablePool falls back to full pool if all are recently used', () => {
      sequencer.startSession('fallback-test');

      // Force all opening pool items into usedArchetypes
      const openingPool = ['ZenDrift', 'Labyrinth', 'LeverTension', 'PlatterRotation', 'KeySequence'];
      (sequencer as any).usedArchetypes = [...openingPool, 'FacetAlign', 'ChordHold'];

      // All 5 opening archetypes are in the last 7, so getAvailablePool should return the full pool
      const available = sequencer.getAvailablePool('opening');
      expect(available.length).toBe(openingPool.length);
    });
  });

  // ── 6. Tension carryover ──

  describe('Tension carryover', () => {
    it('opening phase caps carryover at 0.15', () => {
      sequencer.startSession('opening-cap-test');

      // Complete first Dream with high exit tension
      sequencer.selectNextDream();
      mockNow += 60000;
      sequencer.recordDreamCompletion(0.9);

      // dreamIndex 1 is still opening phase
      const result = sequencer.selectNextDream();
      expect(result.pacingPhase).toBe('opening');
      // Carryover = min(0.9 * 0.25, 0.15) = min(0.225, 0.15) = 0.15
      expect(result.carryoverTension).toBeLessThanOrEqual(0.15);
    });

    it('climax phase has floor of 0.4', () => {
      sequencer.startSession('climax-floor-test');

      // Advance through opening (0-1) + development (2-4)
      for (let i = 0; i < 5; i++) {
        sequencer.selectNextDream();
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.1); // Very low exit tension
      }

      // dreamIndex 5 is climax
      const result = sequencer.selectNextDream();
      expect(result.pacingPhase).toBe('climax');
      // Carryover = max(0.1 * 0.25, 0.4) = max(0.025, 0.4) = 0.4
      expect(result.carryoverTension).toBeGreaterThanOrEqual(0.4);
    });

    it('resolution phase caps at 0.3', () => {
      sequencer.startSession('resolution-cap-test');

      // Advance through opening (0-1) + development (2-4) + climax (5-6)
      for (let i = 0; i < 7; i++) {
        sequencer.selectNextDream();
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.95); // High exit tension
      }

      // dreamIndex 7 is resolution
      const result = sequencer.selectNextDream();
      expect(result.pacingPhase).toBe('resolution');
      // Carryover = min(0.95 * 0.25, 0.3) = min(0.2375, 0.3) = 0.2375
      // But regardless, it should be <= 0.3
      expect(result.carryoverTension).toBeLessThanOrEqual(0.3);
    });

    it('development phase passes through base carryover without modification', () => {
      sequencer.startSession('dev-pass-test');

      // Complete opening Dreams (0-1)
      for (let i = 0; i < 2; i++) {
        sequencer.selectNextDream();
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.6);
      }

      // dreamIndex 2 is development
      const result = sequencer.selectNextDream();
      expect(result.pacingPhase).toBe('development');
      // Carryover = 0.6 * 0.25 = 0.15 (no cap or floor applied)
      expect(result.carryoverTension).toBeCloseTo(0.6 * 0.25, 5);
    });

    it('first Dream always has zero carryover regardless of phase', () => {
      sequencer.startSession('first-zero');
      const result = sequencer.selectNextDream();
      expect(result.carryoverTension).toBe(0);
    });
  });

  // ── 7. recordDreamCompletion ──

  describe('recordDreamCompletion', () => {
    beforeEach(() => {
      sequencer.startSession('completion-test');
    });

    it('adds a DreamResult to archetypeHistory with survived=true', () => {
      sequencer.selectNextDream();
      mockNow += 30000;
      sequencer.recordDreamCompletion(0.5);

      const history = sequencer.getStats().archetypeHistory;
      expect(history).toHaveLength(1);
      expect(history[0].survived).toBe(true);
      expect(history[0].exitTension).toBe(0.5);
      expect(history[0].durationMs).toBe(30000);
    });

    it('increments currentStreak', () => {
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.3);
      expect(sequencer.getStats().currentStreak).toBe(1);

      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.4);
      expect(sequencer.getStats().currentStreak).toBe(2);
    });

    it('updates longestStreak', () => {
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.3);
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.4);
      expect(sequencer.getStats().longestStreak).toBe(2);
    });

    it('increments dreamIndex', () => {
      sequencer.selectNextDream();
      expect(sequencer.getDreamIndex()).toBe(0);
      sequencer.recordDreamCompletion(0.3);
      expect(sequencer.getDreamIndex()).toBe(1);
    });

    it('is a no-op if currentArchetype is null', () => {
      // Do not call selectNextDream first
      sequencer.recordDreamCompletion(0.5);
      expect(sequencer.getStats().archetypeHistory).toHaveLength(0);
    });

    it('records correct peakTension from updatePeakTension calls', () => {
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.3);
      sequencer.updatePeakTension(0.7);
      sequencer.updatePeakTension(0.5);
      sequencer.recordDreamCompletion(0.4);

      const history = sequencer.getStats().archetypeHistory;
      expect(history[0].peakTension).toBe(0.7);
    });
  });

  // ── 8. recordDreamShatter ──

  describe('recordDreamShatter', () => {
    beforeEach(() => {
      sequencer.startSession('shatter-test');
    });

    it('adds a DreamResult with survived=false', () => {
      sequencer.selectNextDream();
      mockNow += 15000;
      sequencer.recordDreamShatter(0.8);

      const history = sequencer.getStats().archetypeHistory;
      expect(history).toHaveLength(1);
      expect(history[0].survived).toBe(false);
      expect(history[0].exitTension).toBe(0.8);
      expect(history[0].durationMs).toBe(15000);
    });

    it('resets currentStreak to 0', () => {
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.3);
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.4);
      expect(sequencer.getStats().currentStreak).toBe(2);

      sequencer.selectNextDream();
      sequencer.recordDreamShatter(0.9);
      expect(sequencer.getStats().currentStreak).toBe(0);
    });

    it('does not reset longestStreak', () => {
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.3);
      sequencer.selectNextDream();
      sequencer.recordDreamCompletion(0.4);
      const longestBefore = sequencer.getStats().longestStreak;

      sequencer.selectNextDream();
      sequencer.recordDreamShatter(0.9);
      expect(sequencer.getStats().longestStreak).toBe(longestBefore);
    });

    it('is a no-op if currentArchetype is null', () => {
      sequencer.recordDreamShatter(0.5);
      expect(sequencer.getStats().archetypeHistory).toHaveLength(0);
    });

    it('does not increment dreamIndex (unlike completion)', () => {
      sequencer.selectNextDream();
      const indexBefore = sequencer.getDreamIndex();
      sequencer.recordDreamShatter(0.8);
      expect(sequencer.getDreamIndex()).toBe(indexBefore);
    });
  });

  // ── 9. updatePeakTension ──

  describe('updatePeakTension', () => {
    beforeEach(() => {
      sequencer.startSession('peak-tension-test');
    });

    it('tracks the highest tension for the current Dream', () => {
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.2);
      sequencer.updatePeakTension(0.6);
      sequencer.updatePeakTension(0.4);

      // currentPeakTension should be 0.6
      expect((sequencer as any).currentPeakTension).toBe(0.6);
    });

    it('tracks the highest tension across the entire session', () => {
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.5);
      sequencer.recordDreamCompletion(0.3);

      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.8);
      sequencer.recordDreamCompletion(0.4);

      expect(sequencer.getStats().peakTension).toBe(0.8);
    });

    it('does not decrease when called with a lower value', () => {
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.9);
      sequencer.updatePeakTension(0.1);

      expect((sequencer as any).currentPeakTension).toBe(0.9);
      expect(sequencer.getStats().peakTension).toBe(0.9);
    });
  });

  // ── 10. getStats ──

  describe('getStats', () => {
    it('returns correct session statistics after multiple Dreams', () => {
      sequencer.startSession('stats-test');

      // Dream 0: complete
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.4);
      mockNow += 45000;
      sequencer.recordDreamCompletion(0.3);

      // Dream 1: complete
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.6);
      mockNow += 50000;
      sequencer.recordDreamCompletion(0.5);

      // Dream 2: shatter
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.9);
      mockNow += 20000;
      sequencer.recordDreamShatter(0.8);

      const stats = sequencer.getStats();
      expect(stats.totalDreams).toBe(3);
      expect(stats.currentStreak).toBe(0); // Reset by shatter
      expect(stats.longestStreak).toBe(2); // Two consecutive completions
      expect(stats.archetypeHistory).toHaveLength(3);
      expect(stats.peakTension).toBe(0.9);
    });

    it('averageTension is computed from peak tensions in history', () => {
      sequencer.startSession('avg-test');

      // Dream 0: peak 0.4
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.4);
      sequencer.recordDreamCompletion(0.3);

      // Dream 1: peak 0.8
      sequencer.selectNextDream();
      sequencer.updatePeakTension(0.8);
      sequencer.recordDreamCompletion(0.5);

      const stats = sequencer.getStats();
      // Average of peak tensions: (0.4 + 0.8) / 2 = 0.6
      expect(stats.averageTension).toBeCloseTo(0.6, 5);
    });

    it('completedCycles increments when a new cycle begins', () => {
      sequencer.startSession('cycle-test');

      // Complete 8 Dreams (one full cycle)
      for (let i = 0; i < 8; i++) {
        sequencer.selectNextDream();
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.3);
      }

      // dreamIndex is now 8; selecting the 9th Dream (cyclePosition 0, dreamIndex > 0)
      // triggers cycle increment
      sequencer.selectNextDream();
      expect(sequencer.getStats().completedCycles).toBe(1);
      expect(sequencer.getCurrentCycle()).toBe(1);
    });
  });

  // ── 11. Determinism ──

  describe('Determinism', () => {
    it('same seed produces same archetype sequence', () => {
      const seed = 'deterministic-seed-42';

      // Run 1
      sequencer.startSession(seed);
      const sequence1: string[] = [];
      for (let i = 0; i < 8; i++) {
        const result = sequencer.selectNextDream();
        sequence1.push(result.archetypeType);
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.3);
      }

      // Run 2 (reset and replay)
      mockNow = 0;
      (DreamSequencer as any).instance = null;
      sequencer = DreamSequencer.getInstance();
      sequencer.startSession(seed);
      const sequence2: string[] = [];
      for (let i = 0; i < 8; i++) {
        const result = sequencer.selectNextDream();
        sequence2.push(result.archetypeType);
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.3);
      }

      expect(sequence1).toEqual(sequence2);
    });

    it('different seeds produce different archetype sequences', () => {
      sequencer.startSession('seed-alpha');
      const sequence1: string[] = [];
      for (let i = 0; i < 8; i++) {
        const result = sequencer.selectNextDream();
        sequence1.push(result.archetypeType);
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.3);
      }

      mockNow = 0;
      (DreamSequencer as any).instance = null;
      sequencer = DreamSequencer.getInstance();
      sequencer.startSession('seed-beta');
      const sequence2: string[] = [];
      for (let i = 0; i < 8; i++) {
        const result = sequencer.selectNextDream();
        sequence2.push(result.archetypeType);
        mockNow += 60000;
        sequencer.recordDreamCompletion(0.3);
      }

      // At least one archetype should differ (extremely unlikely to be identical
      // given different seeds across 8 Dreams drawn from diverse pools)
      const allSame = sequence1.every((a, i) => a === sequence2[i]);
      expect(allSame).toBe(false);
    });

    it('same seed produces same tension curves', () => {
      const seed = 'tension-determinism';

      // Run 1
      sequencer.startSession(seed);
      const result1 = sequencer.selectNextDream();

      // Run 2
      mockNow = 0;
      (DreamSequencer as any).instance = null;
      sequencer = DreamSequencer.getInstance();
      sequencer.startSession(seed);
      const result2 = sequencer.selectNextDream();

      expect(result1.tensionCurve).toEqual(result2.tensionCurve);
      expect(result1.seedHash).toBe(result2.seedHash);
    });
  });

  // ── Additional edge cases ──

  describe('Transition state', () => {
    it('setTransitioning and getIsTransitioning work correctly', () => {
      expect(sequencer.getIsTransitioning()).toBe(false);
      sequencer.setTransitioning(true);
      expect(sequencer.getIsTransitioning()).toBe(true);
      sequencer.setTransitioning(false);
      expect(sequencer.getIsTransitioning()).toBe(false);
    });
  });

  describe('dispose', () => {
    it('clears currentArchetype, usedArchetypes, and isTransitioning', () => {
      sequencer.startSession('dispose-test');
      sequencer.selectNextDream();
      sequencer.setTransitioning(true);

      sequencer.dispose();

      expect(sequencer.getCurrentArchetype()).toBeNull();
      expect((sequencer as any).usedArchetypes).toEqual([]);
      expect(sequencer.getIsTransitioning()).toBe(false);
    });
  });
});
