import {
  ARCHETYPE_TYPES,
  deriveArchetypeSlots,
  selectArchetypeFromSeed,
} from '../archetypeSlots';
import type { ArchetypeType, BaseSlots } from '../components';

// ── Helpers ──

const ALL_KEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];
const TEST_SEED = 42;

/** Assert a numeric value is within [min, max] inclusive */
function expectInRange(value: number, min: number, max: number, label: string) {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/** Assert base slots fields exist and have correct types */
function expectBaseSlots(slots: BaseSlots) {
  expect(Array.isArray(slots.keycapSubset)).toBe(true);
  for (const key of slots.keycapSubset) {
    expect(ALL_KEYS).toContain(key);
  }
  expect(typeof slots.leverActive).toBe('boolean');
  expect(typeof slots.platterActive).toBe('boolean');
  expect(typeof slots.sphereActive).toBe('boolean');
  expect(typeof slots.crystallineCubeActive).toBe('boolean');
  expect(typeof slots.morphCubeActive).toBe('boolean');
}

// ── Tests ──

describe('archetypeSlots', () => {
  // ── 5. ARCHETYPE_TYPES count ──

  describe('ARCHETYPE_TYPES', () => {
    it('has exactly 25 entries', () => {
      expect(ARCHETYPE_TYPES).toHaveLength(25);
    });

    it('contains no duplicates', () => {
      const unique = new Set(ARCHETYPE_TYPES);
      expect(unique.size).toBe(25);
    });

    it('contains all expected archetype names', () => {
      const expected: ArchetypeType[] = [
        'PlatterRotation', 'LeverTension', 'KeySequence', 'CrystallineCubeBoss',
        'FacetAlign', 'OrbitalCatch', 'RefractionAim', 'Labyrinth',
        'TurntableScratch', 'RhythmGate', 'WhackAMole', 'ChordHold',
        'MorphMirror', 'Conductor', 'LockPick', 'CubeJuggle',
        'ZenDrift', 'Pinball', 'TendrilDodge', 'Escalation',
        'Resonance', 'Survival', 'CubeStack', 'GhostChase', 'SphereSculpt',
      ];
      for (const name of expected) {
        expect(ARCHETYPE_TYPES).toContain(name);
      }
    });
  });

  // ── 1. Determinism tests ──

  describe('Determinism', () => {
    it.each(ARCHETYPE_TYPES)(
      'deriveArchetypeSlots(%s) produces identical results for the same seed',
      (archetypeType) => {
        const slots1 = deriveArchetypeSlots(archetypeType, TEST_SEED);
        const slots2 = deriveArchetypeSlots(archetypeType, TEST_SEED);
        expect(slots1).toEqual(slots2);
      },
    );

    it('deriveArchetypeSlots is deterministic across multiple calls with different seeds', () => {
      const seeds = [0, 1, 999, 123456, 0xdeadbeef];
      for (const seed of seeds) {
        const a = deriveArchetypeSlots('PlatterRotation', seed);
        const b = deriveArchetypeSlots('PlatterRotation', seed);
        expect(a).toEqual(b);
      }
    });

    it('selectArchetypeFromSeed is deterministic', () => {
      for (let i = 0; i < 8; i++) {
        const type1 = selectArchetypeFromSeed(TEST_SEED, i, []);
        const type2 = selectArchetypeFromSeed(TEST_SEED, i, []);
        expect(type1).toBe(type2);
      }
    });
  });

  // ── 2. Coverage tests: all 25 archetypes return valid BaseSlots ──

  describe('BaseSlots coverage for all 25 archetypes', () => {
    it.each(ARCHETYPE_TYPES)(
      'deriveArchetypeSlots(%s) returns object with all BaseSlots fields',
      (archetypeType) => {
        const slots = deriveArchetypeSlots(archetypeType, TEST_SEED);
        expectBaseSlots(slots);
      },
    );
  });

  // ── 3. Range validation per archetype ──

  describe('Range validation', () => {
    // Test with multiple seeds to exercise range boundaries
    const testSeeds = [42, 12345, 99999, 0, 777777, 314159, 271828, 1000000];

    describe('PlatterRotation', () => {
      it.each(testSeeds)('seed %i: rotationRPM 2-8, reachZoneArc 60-120, direction +/-1', (seed) => {
        const slots = deriveArchetypeSlots('PlatterRotation', seed) as any;
        expectInRange(slots.rotationRPM, 2, 8, 'rotationRPM');
        expectInRange(slots.reachZoneArc, 60, 120, 'reachZoneArc');
        expect([1, -1]).toContain(slots.direction);
        expect(slots.platterActive).toBe(true);
        expect(slots.keycapSubset.length).toBeGreaterThanOrEqual(4);
        expect(slots.keycapSubset.length).toBeLessThanOrEqual(14);
      });
    });

    describe('LeverTension', () => {
      it.each(testSeeds)('seed %i: slitPeriod 1.5-4, frequencyTolerance 0.05-0.25, patternCount 1-3', (seed) => {
        const slots = deriveArchetypeSlots('LeverTension', seed) as any;
        expectInRange(slots.slitPeriod, 1.5, 4.0, 'slitPeriod');
        expectInRange(slots.frequencyTolerance, 0.05, 0.25, 'frequencyTolerance');
        expectInRange(slots.patternCount, 1, 3, 'patternCount');
        expect(Number.isInteger(slots.patternCount)).toBe(true);
        expect(slots.leverActive).toBe(true);
      });
    });

    describe('KeySequence', () => {
      it.each(testSeeds)('seed %i: sequenceLength 2-5, timeWindowMs 400-2000, showDuration 0.5-2.0', (seed) => {
        const slots = deriveArchetypeSlots('KeySequence', seed) as any;
        expectInRange(slots.sequenceLength, 2, 5, 'sequenceLength');
        expect(Number.isInteger(slots.sequenceLength)).toBe(true);
        expectInRange(slots.timeWindowMs, 400, 2000, 'timeWindowMs');
        expect(Number.isInteger(slots.timeWindowMs)).toBe(true);
        expectInRange(slots.showDuration, 0.5, 2.0, 'showDuration');
        expect(slots.keycapSubset.length).toBeGreaterThanOrEqual(5);
        expect(slots.keycapSubset.length).toBeLessThanOrEqual(11);
      });
    });

    describe('CrystallineCubeBoss', () => {
      it.each(testSeeds)('seed %i: slamCycles 1-5, bossHealth 1.0-2.5, descentSpeed 0.5-2.0, counterWindowMs 200-800', (seed) => {
        const slots = deriveArchetypeSlots('CrystallineCubeBoss', seed) as any;
        expectInRange(slots.slamCycles, 1, 5, 'slamCycles');
        expect(Number.isInteger(slots.slamCycles)).toBe(true);
        expectInRange(slots.bossHealth, 1.0, 2.5, 'bossHealth');
        expectInRange(slots.descentSpeed, 0.5, 2.0, 'descentSpeed');
        expectInRange(slots.counterWindowMs, 200, 800, 'counterWindowMs');
        expect(Number.isInteger(slots.counterWindowMs)).toBe(true);
        expect(slots.leverActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
        expect(slots.keycapSubset.length).toBeGreaterThanOrEqual(6);
        expect(slots.keycapSubset.length).toBeLessThanOrEqual(14);
      });
    });

    describe('FacetAlign', () => {
      it.each(testSeeds)('seed %i: facetCount 4-8, alignmentThresholdDeg 5-20, scrambleIntervalS 8-20, lockoutDurationMs 300-1000', (seed) => {
        const slots = deriveArchetypeSlots('FacetAlign', seed) as any;
        expectInRange(slots.facetCount, 4, 8, 'facetCount');
        expect(Number.isInteger(slots.facetCount)).toBe(true);
        expectInRange(slots.alignmentThresholdDeg, 5, 20, 'alignmentThresholdDeg');
        expectInRange(slots.scrambleIntervalS, 8, 20, 'scrambleIntervalS');
        expectInRange(slots.lockoutDurationMs, 300, 1000, 'lockoutDurationMs');
        expect(Number.isInteger(slots.lockoutDurationMs)).toBe(true);
        expect(slots.sphereActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
      });
    });

    describe('OrbitalCatch', () => {
      it.each(testSeeds)('seed %i: orbitCount 1-4, orbitSpeedBase 0.5-2.0, catchWindowDeg 10-30, tuples valid', (seed) => {
        const slots = deriveArchetypeSlots('OrbitalCatch', seed) as any;
        expectInRange(slots.orbitCount, 1, 4, 'orbitCount');
        expect(Number.isInteger(slots.orbitCount)).toBe(true);
        expectInRange(slots.orbitSpeedBase, 0.5, 2.0, 'orbitSpeedBase');
        expectInRange(slots.catchWindowDeg, 10, 30, 'catchWindowDeg');
        expect(Array.isArray(slots.orbitRadiusRange)).toBe(true);
        expect(slots.orbitRadiusRange).toHaveLength(2);
        expectInRange(slots.orbitRadiusRange[0], 0.3, 0.5, 'orbitRadiusRange[0]');
        expectInRange(slots.orbitRadiusRange[1], 0.6, 1.0, 'orbitRadiusRange[1]');
        expect(Array.isArray(slots.altitudeRange)).toBe(true);
        expect(slots.altitudeRange).toHaveLength(2);
        expectInRange(slots.altitudeRange[0], -0.3, 0, 'altitudeRange[0]');
        expectInRange(slots.altitudeRange[1], 0.1, 0.5, 'altitudeRange[1]');
        expect(slots.sphereActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
      });
    });

    describe('RefractionAim', () => {
      it.each(testSeeds)('seed %i: beamWidth 0.05-0.3, targetKeycapCount 1-4, driftSpeed 0.001-0.01, refractionAngle 15-60', (seed) => {
        const slots = deriveArchetypeSlots('RefractionAim', seed) as any;
        expectInRange(slots.beamWidth, 0.05, 0.3, 'beamWidth');
        expectInRange(slots.targetKeycapCount, 1, 4, 'targetKeycapCount');
        expect(Number.isInteger(slots.targetKeycapCount)).toBe(true);
        expectInRange(slots.driftSpeed, 0.001, 0.01, 'driftSpeed');
        expectInRange(slots.refractionAngle, 15, 60, 'refractionAngle');
        expect(slots.sphereActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
      });
    });

    describe('Labyrinth', () => {
      it.each(testSeeds)('seed %i: mazeComplexity 3-8, particleSpeed 0.5-2.0, targetZoneSize 0.05-0.15, wallBounce valid, mazeRotationOffset 0-2PI', (seed) => {
        const slots = deriveArchetypeSlots('Labyrinth', seed) as any;
        expectInRange(slots.mazeComplexity, 3, 8, 'mazeComplexity');
        expect(Number.isInteger(slots.mazeComplexity)).toBe(true);
        expectInRange(slots.particleSpeed, 0.5, 2.0, 'particleSpeed');
        expectInRange(slots.targetZoneSize, 0.05, 0.15, 'targetZoneSize');
        expect(['elastic', 'sticky']).toContain(slots.wallBounce);
        expectInRange(slots.mazeRotationOffset, 0, Math.PI * 2, 'mazeRotationOffset');
        expect(slots.sphereActive).toBe(true);
      });
    });

    describe('TurntableScratch', () => {
      it.each(testSeeds)('seed %i: phraseLengthBeats 4-16, scratchPoints 1-4, bpm 80-140, scratchWindowMs 100-400, keyDropSubset valid', (seed) => {
        const slots = deriveArchetypeSlots('TurntableScratch', seed) as any;
        expectInRange(slots.phraseLengthBeats, 4, 16, 'phraseLengthBeats');
        expect(Number.isInteger(slots.phraseLengthBeats)).toBe(true);
        expectInRange(slots.scratchPoints, 1, 4, 'scratchPoints');
        expect(Number.isInteger(slots.scratchPoints)).toBe(true);
        expectInRange(slots.bpm, 80, 140, 'bpm');
        expect(Number.isInteger(slots.bpm)).toBe(true);
        expectInRange(slots.scratchWindowMs, 100, 400, 'scratchWindowMs');
        expect(Number.isInteger(slots.scratchWindowMs)).toBe(true);
        expect(Array.isArray(slots.keyDropSubset)).toBe(true);
        expect(slots.keyDropSubset.length).toBeGreaterThanOrEqual(2);
        expect(slots.keyDropSubset.length).toBeLessThanOrEqual(6);
        for (const key of slots.keyDropSubset) {
          expect(ALL_KEYS).toContain(key);
        }
        expect(slots.platterActive).toBe(true);
        expect(slots.leverActive).toBe(true);
      });
    });

    describe('RhythmGate', () => {
      it.each(testSeeds)('seed %i: bpm 60-160, gatePattern valid, openRatio 0.2-0.6, leverRequired boolean', (seed) => {
        const slots = deriveArchetypeSlots('RhythmGate', seed) as any;
        expectInRange(slots.bpm, 60, 160, 'bpm');
        expect(Number.isInteger(slots.bpm)).toBe(true);
        expect(['quarter', 'eighth', 'syncopated']).toContain(slots.gatePattern);
        expectInRange(slots.openRatio, 0.2, 0.6, 'openRatio');
        expect(typeof slots.leverRequired).toBe('boolean');
      });
    });

    describe('WhackAMole', () => {
      it.each(testSeeds)('seed %i: emergeDurationMs 300-2000, maxSimultaneous 1-6, emergeIntervalMs 500-3000, decoyRate 0-0.3', (seed) => {
        const slots = deriveArchetypeSlots('WhackAMole', seed) as any;
        expectInRange(slots.emergeDurationMs, 300, 2000, 'emergeDurationMs');
        expect(Number.isInteger(slots.emergeDurationMs)).toBe(true);
        expectInRange(slots.maxSimultaneous, 1, 6, 'maxSimultaneous');
        expect(Number.isInteger(slots.maxSimultaneous)).toBe(true);
        expectInRange(slots.emergeIntervalMs, 500, 3000, 'emergeIntervalMs');
        expect(Number.isInteger(slots.emergeIntervalMs)).toBe(true);
        expectInRange(slots.decoyRate, 0, 0.3, 'decoyRate');
        expect(slots.morphCubeActive).toBe(true);
        expect(slots.keycapSubset.length).toBeGreaterThanOrEqual(6);
        expect(slots.keycapSubset.length).toBeLessThanOrEqual(14);
      });
    });

    describe('ChordHold', () => {
      it.each(testSeeds)('seed %i: chordSize 2-4, holdDurationMs 500-2000, sequenceLength 3-8, transitionWindowMs 200-1000', (seed) => {
        const slots = deriveArchetypeSlots('ChordHold', seed) as any;
        expectInRange(slots.chordSize, 2, 4, 'chordSize');
        expect(Number.isInteger(slots.chordSize)).toBe(true);
        expectInRange(slots.holdDurationMs, 500, 2000, 'holdDurationMs');
        expect(Number.isInteger(slots.holdDurationMs)).toBe(true);
        expectInRange(slots.sequenceLength, 3, 8, 'sequenceLength');
        expect(Number.isInteger(slots.sequenceLength)).toBe(true);
        expectInRange(slots.transitionWindowMs, 200, 1000, 'transitionWindowMs');
        expect(Number.isInteger(slots.transitionWindowMs)).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
        expect(slots.keycapSubset.length).toBeGreaterThanOrEqual(6);
        expect(slots.keycapSubset.length).toBeLessThanOrEqual(14);
      });
    });

    describe('MorphMirror', () => {
      it.each(testSeeds)('seed %i: cubePatternSpeed 0.3-1.5, cubeMotionType valid, inversePrecisionDeg 10-30, patternChangeIntervalS 3-10', (seed) => {
        const slots = deriveArchetypeSlots('MorphMirror', seed) as any;
        expectInRange(slots.cubePatternSpeed, 0.3, 1.5, 'cubePatternSpeed');
        expect(['rotation', 'stretch', 'oscillate']).toContain(slots.cubeMotionType);
        expectInRange(slots.inversePrecisionDeg, 10, 30, 'inversePrecisionDeg');
        expectInRange(slots.patternChangeIntervalS, 3, 10, 'patternChangeIntervalS');
        expect(slots.sphereActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
      });
    });

    describe('Conductor', () => {
      it.each(testSeeds)('seed %i: targetBpm 60-180, dynamicCurve valid, sectionCount 2-5, toleranceBpm 3-15', (seed) => {
        const slots = deriveArchetypeSlots('Conductor', seed) as any;
        expectInRange(slots.targetBpm, 60, 180, 'targetBpm');
        expect(Number.isInteger(slots.targetBpm)).toBe(true);
        expect(['crescendo', 'decrescendo', 'sforzando']).toContain(slots.dynamicCurve);
        expectInRange(slots.sectionCount, 2, 5, 'sectionCount');
        expect(Number.isInteger(slots.sectionCount)).toBe(true);
        expectInRange(slots.toleranceBpm, 3, 15, 'toleranceBpm');
        expect(slots.leverActive).toBe(true);
        expect(slots.platterActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
      });
    });

    describe('LockPick', () => {
      it.each(testSeeds)('seed %i: pinCount 3-7, notchWidthDeg 3-12, notchPositions valid, resetPenalty valid, leverHoldDurationMs 200-800', (seed) => {
        const slots = deriveArchetypeSlots('LockPick', seed) as any;
        expectInRange(slots.pinCount, 3, 7, 'pinCount');
        expect(Number.isInteger(slots.pinCount)).toBe(true);
        expectInRange(slots.notchWidthDeg, 3, 12, 'notchWidthDeg');
        expect(Array.isArray(slots.notchPositions)).toBe(true);
        expect(slots.notchPositions).toHaveLength(slots.pinCount);
        for (const pos of slots.notchPositions) {
          expectInRange(pos, 0, 360, 'notchPosition');
        }
        expect(['reset-all', 'reset-one']).toContain(slots.resetPenalty);
        expectInRange(slots.leverHoldDurationMs, 200, 800, 'leverHoldDurationMs');
        expect(Number.isInteger(slots.leverHoldDurationMs)).toBe(true);
        expect(slots.sphereActive).toBe(true);
        expect(slots.leverActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
      });
    });

    describe('CubeJuggle', () => {
      it.each(testSeeds)('seed %i: cubeCount 2-5, decayRate 0.01-0.05, bumpStrength 0.3-1.0, orbitSpread 0.3-1.0, spawnInterval 5-20', (seed) => {
        const slots = deriveArchetypeSlots('CubeJuggle', seed) as any;
        expectInRange(slots.cubeCount, 2, 5, 'cubeCount');
        expect(Number.isInteger(slots.cubeCount)).toBe(true);
        expectInRange(slots.decayRate, 0.01, 0.05, 'decayRate');
        expectInRange(slots.bumpStrength, 0.3, 1.0, 'bumpStrength');
        expectInRange(slots.orbitSpread, 0.3, 1.0, 'orbitSpread');
        expectInRange(slots.spawnInterval, 5, 20, 'spawnInterval');
        expect(slots.sphereActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
      });
    });

    describe('ZenDrift', () => {
      it.each(testSeeds)('seed %i: driftSpeed 0.001-0.005, jerkThreshold 0.01-0.05, coherenceDecayRate 0.005-0.02, sessionDurationS 30-120, gazeWeight 0.3-1.0', (seed) => {
        const slots = deriveArchetypeSlots('ZenDrift', seed) as any;
        expectInRange(slots.driftSpeed, 0.001, 0.005, 'driftSpeed');
        expectInRange(slots.jerkThreshold, 0.01, 0.05, 'jerkThreshold');
        expectInRange(slots.coherenceDecayRate, 0.005, 0.02, 'coherenceDecayRate');
        expectInRange(slots.sessionDurationS, 30, 120, 'sessionDurationS');
        expect(Number.isInteger(slots.sessionDurationS)).toBe(true);
        expectInRange(slots.gazeWeight, 0.3, 1.0, 'gazeWeight');
        expect(slots.sphereActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
      });
    });

    describe('Pinball', () => {
      it.each(testSeeds)('seed %i: ballSpeed 0.5-2.0, flipperStrength 0.5-1.5, bumperCount 0-3, multiball 1-3', (seed) => {
        const slots = deriveArchetypeSlots('Pinball', seed) as any;
        expectInRange(slots.ballSpeed, 0.5, 2.0, 'ballSpeed');
        expectInRange(slots.flipperStrength, 0.5, 1.5, 'flipperStrength');
        expectInRange(slots.bumperCount, 0, 3, 'bumperCount');
        expect(Number.isInteger(slots.bumperCount)).toBe(true);
        expectInRange(slots.multiball, 1, 3, 'multiball');
        expect(Number.isInteger(slots.multiball)).toBe(true);
        expect(slots.platterActive).toBe(true);
        expect(slots.leverActive).toBe(true);
      });
    });

    describe('TendrilDodge', () => {
      it.each(testSeeds)('seed %i: tendrilWaveSize 3-12, waveIntervalS 2-8, approachSpeed 0.3-1.5, dissolveAngleDeg 15-45, shieldDurationMs 300-1500, shieldCooldownS 3-10', (seed) => {
        const slots = deriveArchetypeSlots('TendrilDodge', seed) as any;
        expectInRange(slots.tendrilWaveSize, 3, 12, 'tendrilWaveSize');
        expect(Number.isInteger(slots.tendrilWaveSize)).toBe(true);
        expectInRange(slots.waveIntervalS, 2, 8, 'waveIntervalS');
        expectInRange(slots.approachSpeed, 0.3, 1.5, 'approachSpeed');
        expectInRange(slots.dissolveAngleDeg, 15, 45, 'dissolveAngleDeg');
        expectInRange(slots.shieldDurationMs, 300, 1500, 'shieldDurationMs');
        expect(Number.isInteger(slots.shieldDurationMs)).toBe(true);
        expectInRange(slots.shieldCooldownS, 3, 10, 'shieldCooldownS');
        expect(slots.sphereActive).toBe(true);
        expect(slots.leverActive).toBe(true);
      });
    });

    describe('Escalation', () => {
      it.each(testSeeds)('seed %i: activationOrder is 6 surfaces, activationIntervalS 15-45, startDifficulty valid, maxDimensions 3-6, compoundTensionMultiplier 1.2-2.0', (seed) => {
        const slots = deriveArchetypeSlots('Escalation', seed) as any;
        expect(Array.isArray(slots.activationOrder)).toBe(true);
        expect(slots.activationOrder).toHaveLength(6);
        const expectedSurfaces = ['keycaps', 'lever', 'platter', 'sphere', 'crystallineCube', 'morphCube'];
        for (const surface of slots.activationOrder) {
          expect(expectedSurfaces).toContain(surface);
        }
        // All 6 unique surfaces present (permutation)
        expect(new Set(slots.activationOrder).size).toBe(6);
        expectInRange(slots.activationIntervalS, 15, 45, 'activationIntervalS');
        expect(['easy', 'medium']).toContain(slots.startDifficulty);
        expectInRange(slots.maxDimensions, 3, 6, 'maxDimensions');
        expect(Number.isInteger(slots.maxDimensions)).toBe(true);
        expectInRange(slots.compoundTensionMultiplier, 1.2, 2.0, 'compoundTensionMultiplier');
        // Escalation uses all primitives
        expect(slots.leverActive).toBe(true);
        expect(slots.platterActive).toBe(true);
        expect(slots.sphereActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
      });
    });

    describe('Resonance', () => {
      it.each(testSeeds)('seed %i: resonanceFrequency 0.1-0.9, toleranceBand 0.05-0.2, frequencyDriftRate 0.001-0.01, amplitudeRange valid, holdDurationS 2-8', (seed) => {
        const slots = deriveArchetypeSlots('Resonance', seed) as any;
        expectInRange(slots.resonanceFrequency, 0.1, 0.9, 'resonanceFrequency');
        expectInRange(slots.toleranceBand, 0.05, 0.2, 'toleranceBand');
        expectInRange(slots.frequencyDriftRate, 0.001, 0.01, 'frequencyDriftRate');
        expect(Array.isArray(slots.amplitudeRange)).toBe(true);
        expect(slots.amplitudeRange).toHaveLength(2);
        expectInRange(slots.amplitudeRange[0], 0.1, 0.3, 'amplitudeRange[0]');
        expectInRange(slots.amplitudeRange[1], 0.7, 1.0, 'amplitudeRange[1]');
        expectInRange(slots.holdDurationS, 2, 8, 'holdDurationS');
        expect(slots.sphereActive).toBe(true);
        expect(slots.leverActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
      });
    });

    describe('Survival', () => {
      it.each(testSeeds)('seed %i: baseTensionRiseRate 0.01-0.05, surfaceIntensity valid, respiteIntervalS 0 or 15-30, cubeAggressionRate 0.5-2.0', (seed) => {
        const slots = deriveArchetypeSlots('Survival', seed) as any;
        expectInRange(slots.baseTensionRiseRate, 0.01, 0.05, 'baseTensionRiseRate');
        expect(typeof slots.surfaceIntensity).toBe('object');
        for (const key of ['keycaps', 'lever', 'platter', 'sphere', 'cubes']) {
          expectInRange(slots.surfaceIntensity[key], 0.5, 1.5, `surfaceIntensity.${key}`);
        }
        // respiteIntervalS is 0 or 15-30
        if (slots.respiteIntervalS !== 0) {
          expectInRange(slots.respiteIntervalS, 15, 30, 'respiteIntervalS');
        }
        expectInRange(slots.cubeAggressionRate, 0.5, 2.0, 'cubeAggressionRate');
        // Survival uses all primitives
        expect(slots.leverActive).toBe(true);
        expect(slots.platterActive).toBe(true);
        expect(slots.sphereActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
        expect(slots.keycapSubset.length).toBeGreaterThanOrEqual(8);
        expect(slots.keycapSubset.length).toBeLessThanOrEqual(14);
      });
    });

    describe('CubeStack', () => {
      it.each(testSeeds)('seed %i: stackHeight 2-4, driftForce 0.005-0.03, alignmentThresholdDeg 3-15, switchCooldownMs 200-1000, balanceDifficultyMode valid', (seed) => {
        const slots = deriveArchetypeSlots('CubeStack', seed) as any;
        expectInRange(slots.stackHeight, 2, 4, 'stackHeight');
        expect(Number.isInteger(slots.stackHeight)).toBe(true);
        expectInRange(slots.driftForce, 0.005, 0.03, 'driftForce');
        expectInRange(slots.alignmentThresholdDeg, 3, 15, 'alignmentThresholdDeg');
        expectInRange(slots.switchCooldownMs, 200, 1000, 'switchCooldownMs');
        expect(Number.isInteger(slots.switchCooldownMs)).toBe(true);
        expect(['static', 'dynamic-wind']).toContain(slots.balanceDifficultyMode);
        expect(slots.sphereActive).toBe(true);
        expect(slots.leverActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
      });
    });

    describe('GhostChase', () => {
      it.each(testSeeds)('seed %i: echoDelayMs 500-3000, echoCount 1-3, harmonizeMode valid, echoDecayRate 0.01-0.05', (seed) => {
        const slots = deriveArchetypeSlots('GhostChase', seed) as any;
        expectInRange(slots.echoDelayMs, 500, 3000, 'echoDelayMs');
        expect(Number.isInteger(slots.echoDelayMs)).toBe(true);
        expectInRange(slots.echoCount, 1, 3, 'echoCount');
        expect(Number.isInteger(slots.echoCount)).toBe(true);
        expect(['interleave', 'complement', 'invert']).toContain(slots.harmonizeMode);
        expectInRange(slots.echoDecayRate, 0.01, 0.05, 'echoDecayRate');
        expect(slots.sphereActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
        expect(slots.keycapSubset.length).toBeGreaterThanOrEqual(4);
        expect(slots.keycapSubset.length).toBeLessThanOrEqual(10);
      });
    });

    describe('SphereSculpt', () => {
      it.each(testSeeds)('seed %i: targetComplexity 0.2-1.0, axisMappingSensitivity 0.5-2.0, morphDamping 0.3-0.9, targetHoldDurationS 2-8, targetChangeIntervalS 10-30', (seed) => {
        const slots = deriveArchetypeSlots('SphereSculpt', seed) as any;
        expectInRange(slots.targetComplexity, 0.2, 1.0, 'targetComplexity');
        expectInRange(slots.axisMappingSensitivity, 0.5, 2.0, 'axisMappingSensitivity');
        expectInRange(slots.morphDamping, 0.3, 0.9, 'morphDamping');
        expectInRange(slots.targetHoldDurationS, 2, 8, 'targetHoldDurationS');
        expectInRange(slots.targetChangeIntervalS, 10, 30, 'targetChangeIntervalS');
        expect(slots.sphereActive).toBe(true);
        expect(slots.crystallineCubeActive).toBe(true);
        expect(slots.morphCubeActive).toBe(true);
      });
    });
  });

  // ── 4. Pacing selection tests ──

  describe('selectArchetypeFromSeed — pacing', () => {
    const lowPool: ArchetypeType[] = ['PlatterRotation', 'LeverTension', 'Labyrinth', 'ZenDrift', 'KeySequence'];
    const mediumPool: ArchetypeType[] = [
      'FacetAlign', 'RefractionAim', 'ChordHold', 'MorphMirror', 'RhythmGate',
      'WhackAMole', 'TurntableScratch', 'LockPick', 'Resonance', 'SphereSculpt',
      'Conductor', 'GhostChase',
    ];
    const highPool: ArchetypeType[] = [
      'CrystallineCubeBoss', 'OrbitalCatch', 'Survival', 'CubeJuggle',
      'TendrilDodge', 'Escalation', 'CubeStack', 'Pinball',
    ];
    const resolutionPool: ArchetypeType[] = ['ZenDrift', 'Labyrinth', 'Resonance'];

    // Test with many seeds for statistical confidence
    const manySeeds = Array.from({ length: 50 }, (_, i) => i * 137 + 1);

    describe('dreamIndex 0-1 selects from low cognitive load pool', () => {
      it.each([0, 1])('dreamIndex %i always selects from low pool', (dreamIndex) => {
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, dreamIndex, []);
          expect(lowPool).toContain(selected);
        }
      });
    });

    describe('dreamIndex 2-4 selects from medium pool', () => {
      it.each([2, 3, 4])('dreamIndex %i always selects from medium pool', (dreamIndex) => {
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, dreamIndex, []);
          expect(mediumPool).toContain(selected);
        }
      });
    });

    describe('dreamIndex 5-6 selects from high/climax pool', () => {
      it.each([5, 6])('dreamIndex %i always selects from high pool', (dreamIndex) => {
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, dreamIndex, []);
          expect(highPool).toContain(selected);
        }
      });
    });

    describe('dreamIndex 7 selects from resolution pool', () => {
      it('dreamIndex 7 always selects from resolution pool', () => {
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, 7, []);
          expect(resolutionPool).toContain(selected);
        }
      });
    });

    describe('8-dream cycle wraps around', () => {
      it('dreamIndex 8 behaves like dreamIndex 0 (low pool)', () => {
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, 8, []);
          expect(lowPool).toContain(selected);
        }
      });

      it('dreamIndex 15 behaves like dreamIndex 7 (resolution pool)', () => {
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, 15, []);
          expect(resolutionPool).toContain(selected);
        }
      });
    });

    describe('previously used archetypes are filtered out', () => {
      it('does not repeat archetypes from the last 7 dreams', () => {
        // Use a pool where we can force exclusion
        // Low pool: PlatterRotation, LeverTension, Labyrinth, ZenDrift, KeySequence
        // If we mark 4 as previous, only 1 should remain
        const previousTypes: ArchetypeType[] = [
          'PlatterRotation', 'LeverTension', 'Labyrinth', 'ZenDrift',
        ];
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, 0, previousTypes);
          expect(selected).toBe('KeySequence');
        }
      });

      it('falls back to full pool when all filtered out', () => {
        const previousTypes: ArchetypeType[] = [
          'PlatterRotation', 'LeverTension', 'Labyrinth', 'ZenDrift', 'KeySequence',
        ];
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, 0, previousTypes);
          // Falls back to full low pool since all are filtered
          expect(lowPool).toContain(selected);
        }
      });

      it('only considers the last 7 entries of previousTypes', () => {
        // If we have 8+ previous types, only the last 7 are considered
        const previousTypes: ArchetypeType[] = [
          'PlatterRotation', // index 0 - this is outside the last 7
          'LeverTension',    // index 1 - inside last 7
          'Labyrinth',       // index 2 - inside last 7
          'ZenDrift',        // index 3 - inside last 7
          'KeySequence',     // index 4 - inside last 7
          'FacetAlign',      // index 5 - inside last 7
          'ChordHold',       // index 6 - inside last 7
          'MorphMirror',     // index 7 - inside last 7
        ];
        // PlatterRotation should NOT be filtered since it's outside the last 7 window
        // Low pool: PlatterRotation, LeverTension, Labyrinth, ZenDrift, KeySequence
        // After filtering last 7: LeverTension, Labyrinth, ZenDrift, KeySequence are excluded
        // PlatterRotation should be the only available option
        for (const seed of manySeeds) {
          const selected = selectArchetypeFromSeed(seed, 0, previousTypes);
          expect(selected).toBe('PlatterRotation');
        }
      });
    });

    describe('selectArchetypeFromSeed always returns a valid ArchetypeType', () => {
      it('returns a member of ARCHETYPE_TYPES for any seed/dreamIndex', () => {
        for (let dreamIndex = 0; dreamIndex < 16; dreamIndex++) {
          for (const seed of [0, 42, 12345, 999999]) {
            const selected = selectArchetypeFromSeed(seed, dreamIndex, []);
            expect(ARCHETYPE_TYPES).toContain(selected);
          }
        }
      });
    });
  });

  // ── 6. Different seeds produce different slots ──

  describe('Seed variation', () => {
    it('different seeds produce different PlatterRotation slots (statistical)', () => {
      const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results = seeds.map((seed) => deriveArchetypeSlots('PlatterRotation', seed));
      // Check that not all rotationRPM values are the same
      const rpms = results.map((r) => (r as any).rotationRPM);
      const uniqueRpms = new Set(rpms);
      expect(uniqueRpms.size).toBeGreaterThan(1);
    });

    it('different seeds produce different slots across all archetypes', () => {
      const seeds = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      for (const archetypeType of ARCHETYPE_TYPES) {
        const results = seeds.map((seed) => deriveArchetypeSlots(archetypeType, seed));
        const serialized = results.map((r) => JSON.stringify(r));
        const unique = new Set(serialized);
        // With 10 different seeds, we should get more than 1 unique result
        expect(unique.size).toBeGreaterThan(1);
      }
    });

    it('different seeds produce different archetype selections', () => {
      const seeds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      // Test with medium pool (largest variety)
      const selections = seeds.map((seed) => selectArchetypeFromSeed(seed, 3, []));
      const unique = new Set(selections);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  // ── Additional edge case tests ──

  describe('Edge cases', () => {
    it('handles seed value 0', () => {
      for (const archetypeType of ARCHETYPE_TYPES) {
        const slots = deriveArchetypeSlots(archetypeType, 0);
        expectBaseSlots(slots);
      }
    });

    it('handles very large seed values', () => {
      const largeSeed = 0x7fffffff; // max 32-bit signed int
      for (const archetypeType of ARCHETYPE_TYPES) {
        const slots = deriveArchetypeSlots(archetypeType, largeSeed);
        expectBaseSlots(slots);
      }
    });

    it('handles negative seed values', () => {
      for (const archetypeType of ARCHETYPE_TYPES) {
        const slots = deriveArchetypeSlots(archetypeType, -12345);
        expectBaseSlots(slots);
      }
    });

    it('keycapSubset never contains duplicates', () => {
      const seeds = [42, 123, 456, 789, 1000, 5555, 99999, 314159];
      for (const archetypeType of ARCHETYPE_TYPES) {
        for (const seed of seeds) {
          const slots = deriveArchetypeSlots(archetypeType, seed);
          const keycaps = slots.keycapSubset;
          const unique = new Set(keycaps);
          expect(unique.size).toBe(keycaps.length);
        }
      }
    });

    it('keycapSubset only contains keys from the 14-key set', () => {
      const seeds = [42, 123, 456, 789, 1000, 5555, 99999, 314159];
      for (const archetypeType of ARCHETYPE_TYPES) {
        for (const seed of seeds) {
          const slots = deriveArchetypeSlots(archetypeType, seed);
          for (const key of slots.keycapSubset) {
            expect(ALL_KEYS).toContain(key);
          }
        }
      }
    });
  });
});
