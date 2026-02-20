/**
 * Archetype Slot Derivation — Cognitive Dissonance v3.0
 *
 * Each of the 25 archetypes defines how to derive its slot parameters from a seed hash.
 * The seed system decomposes the hash into parameter ranges per archetype, giving each
 * archetype ~128+ parameter combinations. Combined with difficulty curves and tension
 * variations, this yields 25,600+ meaningfully distinct Dream configurations.
 *
 * Design: LEVEL_ARCHETYPES.md §Seed Slot System
 */

import { mulberry32 } from '../utils/seed-helpers';
import type {
  ArchetypeSlots,
  ArchetypeType,
  BaseSlots,
  ChordHoldSlots,
  ConductorSlots,
  CrystallineCubeBossSlots,
  CubeJuggleSlots,
  CubeStackSlots,
  EscalationSlots,
  FacetAlignSlots,
  GhostChaseSlots,
  KeySequenceSlots,
  LabyrinthSlots,
  LeverTensionSlots,
  LockPickSlots,
  MorphMirrorSlots,
  OrbitalCatchSlots,
  PinballSlots,
  PlatterRotationSlots,
  RefractionAimSlots,
  ResonanceSlots,
  RhythmGateSlots,
  SphereSculptSlots,
  SurvivalSlots,
  TendrilDodgeSlots,
  TurntableScratchSlots,
  WhackAMoleSlots,
  ZenDriftSlots,
  EscalationSlots as EscalationSlotsType,
} from './components';

// ── Key selection helpers ──

const ALL_KEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];

/** Select a random subset of keys from the 14 available */
function selectKeys(rng: () => number, min: number, max: number): string[] {
  const count = min + Math.floor(rng() * (max - min + 1));
  const shuffled = [...ALL_KEYS].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

/** Create base slots with active primitive flags */
function baseSlots(
  rng: () => number,
  opts: {
    keycapCount?: [number, number]; // [min, max] or undefined = none
    lever?: boolean;
    platter?: boolean;
    sphere?: boolean;
    crystallineCube?: boolean;
    morphCube?: boolean;
  },
): BaseSlots {
  return {
    keycapSubset: opts.keycapCount ? selectKeys(rng, opts.keycapCount[0], opts.keycapCount[1]) : [],
    leverActive: opts.lever ?? false,
    platterActive: opts.platter ?? false,
    sphereActive: opts.sphere ?? false,
    crystallineCubeActive: opts.crystallineCube ?? false,
    morphCubeActive: opts.morphCube ?? false,
  };
}

/** Range helper: min + rng() * (max - min) */
function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Integer range helper */
function irange(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ── Per-Archetype Slot Derivation ──

function derivePlatterRotation(rng: () => number): PlatterRotationSlots {
  return {
    ...baseSlots(rng, { keycapCount: [4, 14], platter: true }),
    rotationRPM: irange(rng, 2, 8),
    reachZoneArc: range(rng, 60, 120),
    direction: rng() > 0.5 ? 1 : -1,
  };
}

function deriveLeverTension(rng: () => number): LeverTensionSlots {
  return {
    ...baseSlots(rng, { lever: true }),
    slitPeriod: range(rng, 1.5, 4.0),
    frequencyTolerance: range(rng, 0.05, 0.25),
    patternCount: irange(rng, 1, 3),
  };
}

function deriveKeySequence(rng: () => number): KeySequenceSlots {
  return {
    ...baseSlots(rng, { keycapCount: [5, 11] }),
    sequenceLength: irange(rng, 2, 5),
    timeWindowMs: irange(rng, 400, 2000),
    showDuration: range(rng, 0.5, 2.0),
  };
}

function deriveCrystallineCubeBoss(rng: () => number): CrystallineCubeBossSlots {
  return {
    ...baseSlots(rng, { keycapCount: [6, 14], lever: true, crystallineCube: true }),
    slamCycles: irange(rng, 1, 5),
    bossHealth: range(rng, 1.0, 2.5),
    descentSpeed: range(rng, 0.5, 2.0),
    counterWindowMs: irange(rng, 200, 800),
  };
}

function deriveFacetAlign(rng: () => number): FacetAlignSlots {
  return {
    ...baseSlots(rng, { sphere: true, crystallineCube: true }),
    facetCount: irange(rng, 4, 8),
    alignmentThresholdDeg: range(rng, 5, 20),
    scrambleIntervalS: range(rng, 8, 20),
    lockoutDurationMs: irange(rng, 300, 1000),
  };
}

function deriveOrbitalCatch(rng: () => number): OrbitalCatchSlots {
  return {
    ...baseSlots(rng, { sphere: true, keycapCount: [2, 6], crystallineCube: true, morphCube: true }),
    orbitCount: irange(rng, 1, 4),
    orbitSpeedBase: range(rng, 0.5, 2.0),
    orbitRadiusRange: [range(rng, 0.3, 0.5), range(rng, 0.6, 1.0)],
    altitudeRange: [range(rng, -0.3, 0), range(rng, 0.1, 0.5)],
    catchWindowDeg: range(rng, 10, 30),
  };
}

function deriveRefractionAim(rng: () => number): RefractionAimSlots {
  return {
    ...baseSlots(rng, { sphere: true, keycapCount: [1, 4], crystallineCube: true }),
    beamWidth: range(rng, 0.05, 0.3),
    targetKeycapCount: irange(rng, 1, 4),
    driftSpeed: range(rng, 0.001, 0.01),
    refractionAngle: range(rng, 15, 60),
  };
}

function deriveLabyrinth(rng: () => number): LabyrinthSlots {
  const useMorphObstacle = rng() > 0.6;
  return {
    ...baseSlots(rng, { sphere: true, morphCube: useMorphObstacle }),
    mazeComplexity: irange(rng, 3, 8),
    particleSpeed: range(rng, 0.5, 2.0),
    targetZoneSize: range(rng, 0.05, 0.15),
    wallBounce: rng() > 0.5 ? 'elastic' : 'sticky',
    mazeRotationOffset: range(rng, 0, Math.PI * 2),
  };
}

function deriveTurntableScratch(rng: () => number): TurntableScratchSlots {
  return {
    ...baseSlots(rng, { platter: true, lever: true, keycapCount: [2, 6] }),
    phraseLengthBeats: irange(rng, 4, 16),
    scratchPoints: irange(rng, 1, 4),
    bpm: irange(rng, 80, 140),
    keyDropSubset: selectKeys(rng, 2, 6),
    scratchWindowMs: irange(rng, 100, 400),
  };
}

function deriveRhythmGate(rng: () => number): RhythmGateSlots {
  const useMorph = rng() > 0.5;
  return {
    ...baseSlots(rng, { keycapCount: [3, 8], lever: rng() > 0.4, morphCube: useMorph }),
    bpm: irange(rng, 60, 160),
    gatePattern: (['quarter', 'eighth', 'syncopated'] as const)[Math.floor(rng() * 3)],
    openRatio: range(rng, 0.2, 0.6),
    leverRequired: rng() > 0.4,
  };
}

function deriveWhackAMole(rng: () => number): WhackAMoleSlots {
  return {
    ...baseSlots(rng, { keycapCount: [6, 14], morphCube: true }),
    emergeDurationMs: irange(rng, 300, 2000),
    maxSimultaneous: irange(rng, 1, 6),
    emergeIntervalMs: irange(rng, 500, 3000),
    decoyRate: range(rng, 0, 0.3),
  };
}

function deriveChordHold(rng: () => number): ChordHoldSlots {
  return {
    ...baseSlots(rng, { keycapCount: [6, 14], crystallineCube: true }),
    chordSize: irange(rng, 2, 4),
    holdDurationMs: irange(rng, 500, 2000),
    sequenceLength: irange(rng, 3, 8),
    transitionWindowMs: irange(rng, 200, 1000),
  };
}

function deriveMorphMirror(rng: () => number): MorphMirrorSlots {
  return {
    ...baseSlots(rng, { sphere: true, morphCube: true }),
    cubePatternSpeed: range(rng, 0.3, 1.5),
    cubeMotionType: (['rotation', 'stretch', 'oscillate'] as const)[Math.floor(rng() * 3)],
    inversePrecisionDeg: range(rng, 10, 30),
    patternChangeIntervalS: range(rng, 3, 10),
  };
}

function deriveConductor(rng: () => number): ConductorSlots {
  return {
    ...baseSlots(rng, { lever: true, platter: true, keycapCount: [2, 5], crystallineCube: true }),
    targetBpm: irange(rng, 60, 180),
    dynamicCurve: (['crescendo', 'decrescendo', 'sforzando'] as const)[Math.floor(rng() * 3)],
    sectionCount: irange(rng, 2, 5),
    toleranceBpm: range(rng, 3, 15),
  };
}

function deriveLockPick(rng: () => number): LockPickSlots {
  const pinCount = irange(rng, 3, 7);
  return {
    ...baseSlots(rng, { sphere: true, lever: true, crystallineCube: true }),
    pinCount,
    notchWidthDeg: range(rng, 3, 12),
    notchPositions: Array.from({ length: pinCount }, () => range(rng, 0, 360)),
    resetPenalty: rng() > 0.5 ? 'reset-all' : 'reset-one',
    leverHoldDurationMs: irange(rng, 200, 800),
  };
}

function deriveCubeJuggle(rng: () => number): CubeJuggleSlots {
  return {
    ...baseSlots(rng, { sphere: true, crystallineCube: true, morphCube: true }),
    cubeCount: irange(rng, 2, 5),
    decayRate: range(rng, 0.01, 0.05),
    bumpStrength: range(rng, 0.3, 1.0),
    orbitSpread: range(rng, 0.3, 1.0),
    spawnInterval: range(rng, 5, 20),
  };
}

function deriveZenDrift(rng: () => number): ZenDriftSlots {
  return {
    ...baseSlots(rng, { sphere: true, morphCube: true }),
    driftSpeed: range(rng, 0.001, 0.005),
    jerkThreshold: range(rng, 0.01, 0.05),
    coherenceDecayRate: range(rng, 0.005, 0.02),
    sessionDurationS: irange(rng, 30, 120),
    gazeWeight: range(rng, 0.3, 1.0),
  };
}

function derivePinball(rng: () => number): PinballSlots {
  return {
    ...baseSlots(rng, { platter: true, lever: true, keycapCount: [4, 10], morphCube: rng() > 0.3 }),
    ballSpeed: range(rng, 0.5, 2.0),
    flipperStrength: range(rng, 0.5, 1.5),
    bumperCount: irange(rng, 0, 3),
    multiball: irange(rng, 1, 3),
  };
}

function deriveTendrilDodge(rng: () => number): TendrilDodgeSlots {
  return {
    ...baseSlots(rng, { sphere: true, lever: true, keycapCount: [3, 8] }),
    tendrilWaveSize: irange(rng, 3, 12),
    waveIntervalS: range(rng, 2, 8),
    approachSpeed: range(rng, 0.3, 1.5),
    dissolveAngleDeg: range(rng, 15, 45),
    shieldDurationMs: irange(rng, 300, 1500),
    shieldCooldownS: range(rng, 3, 10),
  };
}

function deriveEscalation(rng: () => number): EscalationSlots {
  const surfaces = ['keycaps', 'lever', 'platter', 'sphere', 'crystallineCube', 'morphCube'];
  const shuffled = [...surfaces].sort(() => rng() - 0.5);
  return {
    ...baseSlots(rng, {
      keycapCount: [3, 8],
      lever: true,
      platter: true,
      sphere: true,
      crystallineCube: true,
      morphCube: true,
    }),
    activationOrder: shuffled,
    activationIntervalS: range(rng, 15, 45),
    startDifficulty: rng() > 0.5 ? 'easy' : 'medium',
    maxDimensions: irange(rng, 3, 6),
    compoundTensionMultiplier: range(rng, 1.2, 2.0),
  };
}

function deriveResonance(rng: () => number): ResonanceSlots {
  return {
    ...baseSlots(rng, { sphere: true, lever: true, crystallineCube: true }),
    resonanceFrequency: range(rng, 0.1, 0.9),
    toleranceBand: range(rng, 0.05, 0.2),
    frequencyDriftRate: range(rng, 0.001, 0.01),
    amplitudeRange: [range(rng, 0.1, 0.3), range(rng, 0.7, 1.0)],
    holdDurationS: range(rng, 2, 8),
  };
}

function deriveSurvival(rng: () => number): SurvivalSlots {
  return {
    ...baseSlots(rng, {
      keycapCount: [8, 14],
      lever: true,
      platter: true,
      sphere: true,
      crystallineCube: true,
      morphCube: true,
    }),
    baseTensionRiseRate: range(rng, 0.01, 0.05),
    surfaceIntensity: {
      keycaps: range(rng, 0.5, 1.5),
      lever: range(rng, 0.5, 1.5),
      platter: range(rng, 0.5, 1.5),
      sphere: range(rng, 0.5, 1.5),
      cubes: range(rng, 0.5, 1.5),
    },
    respiteIntervalS: rng() > 0.3 ? range(rng, 15, 30) : 0,
    cubeAggressionRate: range(rng, 0.5, 2.0),
  };
}

function deriveCubeStack(rng: () => number): CubeStackSlots {
  return {
    ...baseSlots(rng, { sphere: true, lever: true, crystallineCube: true, morphCube: true }),
    stackHeight: irange(rng, 2, 4),
    driftForce: range(rng, 0.005, 0.03),
    alignmentThresholdDeg: range(rng, 3, 15),
    switchCooldownMs: irange(rng, 200, 1000),
    balanceDifficultyMode: rng() > 0.5 ? 'dynamic-wind' : 'static',
  };
}

function deriveGhostChase(rng: () => number): GhostChaseSlots {
  return {
    ...baseSlots(rng, { keycapCount: [4, 10], sphere: true, morphCube: true }),
    echoDelayMs: irange(rng, 500, 3000),
    echoCount: irange(rng, 1, 3),
    harmonizeMode: (['interleave', 'complement', 'invert'] as const)[Math.floor(rng() * 3)],
    echoDecayRate: range(rng, 0.01, 0.05),
  };
}

function deriveSphereSculpt(rng: () => number): SphereSculptSlots {
  return {
    ...baseSlots(rng, { sphere: true, keycapCount: [2, 6], crystallineCube: true, morphCube: true }),
    targetComplexity: range(rng, 0.2, 1.0),
    axisMappingSensitivity: range(rng, 0.5, 2.0),
    morphDamping: range(rng, 0.3, 0.9),
    targetHoldDurationS: range(rng, 2, 8),
    targetChangeIntervalS: range(rng, 10, 30),
  };
}

// ── Derivation registry ──

const SLOT_DERIVATIONS: Record<ArchetypeType, (rng: () => number) => ArchetypeSlots> = {
  PlatterRotation: derivePlatterRotation,
  LeverTension: deriveLeverTension,
  KeySequence: deriveKeySequence,
  CrystallineCubeBoss: deriveCrystallineCubeBoss,
  FacetAlign: deriveFacetAlign,
  OrbitalCatch: deriveOrbitalCatch,
  RefractionAim: deriveRefractionAim,
  Labyrinth: deriveLabyrinth,
  TurntableScratch: deriveTurntableScratch,
  RhythmGate: deriveRhythmGate,
  WhackAMole: deriveWhackAMole,
  ChordHold: deriveChordHold,
  MorphMirror: deriveMorphMirror,
  Conductor: deriveConductor,
  LockPick: deriveLockPick,
  CubeJuggle: deriveCubeJuggle,
  ZenDrift: deriveZenDrift,
  Pinball: derivePinball,
  TendrilDodge: deriveTendrilDodge,
  Escalation: deriveEscalation,
  Resonance: deriveResonance,
  Survival: deriveSurvival,
  CubeStack: deriveCubeStack,
  GhostChase: deriveGhostChase,
  SphereSculpt: deriveSphereSculpt,
};

/** All 25 archetype type identifiers */
export const ARCHETYPE_TYPES: ArchetypeType[] = Object.keys(SLOT_DERIVATIONS) as ArchetypeType[];

/**
 * Derive archetype slot parameters from seed hash.
 *
 * @param archetypeType - Which of the 25 archetypes
 * @param seedHash - Seed hash for deterministic parameter generation
 * @returns Fully populated slot parameters for the archetype
 */
export function deriveArchetypeSlots(archetypeType: ArchetypeType, seedHash: number): ArchetypeSlots {
  const rng = mulberry32(seedHash);
  const deriveFn = SLOT_DERIVATIONS[archetypeType];
  return deriveFn(rng);
}

/**
 * Select archetype type from seed hash with pacing awareness.
 *
 * Uses seedHash % 25 for base selection, but can be overridden by
 * pacing system to enforce the arc shape (calm → development → climax → resolution).
 *
 * @param seedHash - Seed hash
 * @param dreamIndex - Which Dream in the current session (0-based)
 * @param previousTypes - Archetypes already used in this session (for de-duplication)
 * @returns Selected archetype type
 */
export function selectArchetypeFromSeed(
  seedHash: number,
  dreamIndex: number,
  previousTypes: ArchetypeType[] = [],
): ArchetypeType {
  const rng = mulberry32(seedHash + dreamIndex * 7919); // Different RNG per dream

  // Pacing arc: determine which pool to draw from based on dream index
  const cyclePosition = dreamIndex % 8; // 8-dream cycle
  let pool: ArchetypeType[];

  if (cyclePosition <= 1) {
    // Opening: low cognitive load
    pool = ['PlatterRotation', 'LeverTension', 'Labyrinth', 'ZenDrift', 'KeySequence'];
  } else if (cyclePosition <= 4) {
    // Development: medium load, introduce cubes
    pool = [
      'FacetAlign', 'RefractionAim', 'ChordHold', 'MorphMirror', 'RhythmGate',
      'WhackAMole', 'TurntableScratch', 'LockPick', 'Resonance', 'SphereSculpt',
      'Conductor', 'GhostChase',
    ];
  } else if (cyclePosition <= 6) {
    // Climax: high load, bosses, frantic
    pool = [
      'CrystallineCubeBoss', 'OrbitalCatch', 'Survival', 'CubeJuggle',
      'TendrilDodge', 'Escalation', 'CubeStack', 'Pinball',
    ];
  } else {
    // Resolution: zen cooldown
    pool = ['ZenDrift', 'Labyrinth', 'Resonance'];
  }

  // Filter out recently used archetypes (don't repeat within a cycle)
  const recentWindow = previousTypes.slice(-7); // Last 7 dreams
  const available = pool.filter((t) => !recentWindow.includes(t));

  // If all filtered out, fall back to full pool
  const finalPool = available.length > 0 ? available : pool;

  // Select from pool using RNG
  const index = Math.floor(rng() * finalPool.length);
  return finalPool[index];
}
