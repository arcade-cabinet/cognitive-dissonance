import { World } from 'miniplex';
import type { AudioParams, DifficultyConfig, GameEntity, PhaseConfig, TensionCurveConfig } from '../types';
import { deriveEnemyTraitSelector, derivePatternSequences, hashSeed, mulberry32 } from '../utils/seed-helpers';

// Consolidated Miniplex World
export const world = new World<GameEntity>();

// Level Archetypes — queries for each level type
// Buried seed selects one per Dream via seedHash % 4
export const PlatterRotationDream = world.with(
  'level',
  'platterCore',
  'rotationAxis',
  'tensionCurve',
  'keyPatterns',
  'buriedSeedHash',
);
export const LeverTensionDream = world.with(
  'level',
  'leverCore',
  'resistanceProfile',
  'slitAnimation',
  'corruptionTendrilSpawn',
);
export const KeySequenceDream = world.with(
  'level',
  'keycapPatterns',
  'stabilizationHoldTime',
  'yukaSpawnRate',
  'patternProgression',
);
export const CrystallineCubeBossDream = world.with(
  'level',
  'boss',
  'cubeCrystalline',
  'platterLockPhase',
  'finalTensionBurst',
);

// Hand Archetypes (XR hand tracking — 26 joints each)
export const LeftHand = world.with('xrHand', 'left', 'joints', 'gripStrength', 'pinchStrength', 'contactPoints');
export const RightHand = world.with('xrHand', 'right', 'joints', 'gripStrength', 'pinchStrength', 'contactPoints');

// AR Archetypes (dual mode)
export const WorldAnchoredPlatter = world.with('arAnchored', 'platterCore', 'anchor', 'modeLeverPosition', 'roomScale');
export const ProjectedPlatter = world.with(
  'arAnchored',
  'platterCore',
  'anchor',
  'modeLeverPosition',
  'phoneProjected',
);
export const ARSphere = world.with('arEntity', 'sphereCore', 'anchor');

// Enemy Archetypes
export const YukaEnemy = world.with('enemy', 'yuka', 'morphTarget', 'currentTrait', 'morphProgress', 'anchor');
export const CrystallineCubeBoss = world.with('boss', 'cubeCrystalline', 'crushPhase', 'health', 'worldImpact');

/**
 * Create three level phase configurations (early, mid, late) with seed-derived variability.
 *
 * @param seedHash - Numeric seed hash used to derive deterministic variation for the phases.
 * @returns An array of three PhaseConfig objects for the early, mid, and late phases; each contains tension, patternKeys, spawnRate, and yukaCount. Spawn rates include a seed-derived variance of approximately ±15%; the final phase includes a `boss` field set to `"crystalline-cube"`.
 */
function buildPhaseDefinitions(seedHash: number): PhaseConfig[] {
  const rng = mulberry32(seedHash);
  const variance = () => 0.85 + (rng() * 31) / 100; // ±15%
  return [
    {
      tension: 0.0,
      patternKeys: ['Q', 'W', 'E', 'R', 'T'],
      spawnRate: 1.2 * variance(),
      yukaCount: 3,
    },
    {
      tension: 0.4,
      patternKeys: ['A', 'S', 'D', 'F', 'G', 'H'],
      spawnRate: 0.8 * variance(),
      yukaCount: 8,
    },
    {
      tension: 0.8,
      patternKeys: ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
      spawnRate: 0.4 * variance(),
      yukaCount: 15,
      boss: 'crystalline-cube',
    },
  ];
}

/**
 * Create a tension-curve configuration for the specified archetype with deterministic seed variance.
 *
 * The returned values tune how tension grows, decays, stabilizes, and rebounds for gameplay systems.
 *
 * @param seedHash - Numeric seed used to produce deterministic variance in the curve
 * @param archetype - Archetype identifier; expected values: "PlatterRotation", "LeverTension", "KeySequence", or "CrystallineCubeBoss"
 * @returns A TensionCurveConfig containing `increaseRate`, `decreaseRate`, `overStabilizationThreshold`, `reboundProbability`, and `reboundAmount`
 */
function buildTensionCurve(seedHash: number, archetype: string): TensionCurveConfig {
  const rng = mulberry32(seedHash);
  const v = () => 0.85 + (rng() * 31) / 100;
  const curves: Record<string, TensionCurveConfig> = {
    PlatterRotation: {
      increaseRate: 0.025 * v(),
      decreaseRate: 0.018 * v(),
      overStabilizationThreshold: 0.05,
      reboundProbability: 0.02,
      reboundAmount: 0.12,
    },
    LeverTension: {
      increaseRate: 0.03 * v(),
      decreaseRate: 0.022 * v(),
      overStabilizationThreshold: 0.04,
      reboundProbability: 0.03,
      reboundAmount: 0.1,
    },
    KeySequence: {
      increaseRate: 0.02 * v(),
      decreaseRate: 0.015 * v(),
      overStabilizationThreshold: 0.06,
      reboundProbability: 0.02,
      reboundAmount: 0.14,
    },
    CrystallineCubeBoss: {
      increaseRate: 0.035 * v(),
      decreaseRate: 0.012 * v(),
      overStabilizationThreshold: 0.03,
      reboundProbability: 0.04,
      reboundAmount: 0.15,
    },
  };
  return curves[archetype];
}

/**
 * Produces a difficulty-scaling configuration whose numeric parameters are deterministically varied from a seed.
 *
 * @param seedHash - Numeric seed hash used to initialize the deterministic RNG that drives variance
 * @returns A DifficultyConfig object containing tuned gameplay parameters:
 * - `k`: difficulty scaling coefficient (seed-varied around 0.5)
 * - `timeScale`: temporal scaling factor for difficulty progression (seed-varied around 0.001)
 * - `dampingCoeff`: damping coefficient for dynamic systems (approximately 0.7–0.9)
 * - `spawnRateBase`: base enemy spawn interval in seconds (roughly 1.0–1.4)
 * - `spawnRateFloor`: minimum allowed spawn interval (0.2)
 * - `maxEnemyBase`: baseline simultaneous enemy count (3)
 * - `maxEnemyCeiling`: maximum simultaneous enemy count cap (24)
 * - `morphSpeedBase`: baseline morph speed (1.0)
 * - `morphSpeedCeiling`: maximum morph speed cap (3.0)
 * - `bossThresholdBase`: baseline threshold for triggering boss-like behaviour (0.92)
 * - `bossThresholdFloor`: minimum threshold allowed (0.6)
 */
function deriveDifficultyConfig(seedHash: number): DifficultyConfig {
  const rng = mulberry32(seedHash);
  const variance20 = () => 0.8 + (rng() * 41) / 100; // ±20%
  return {
    k: 0.5 * variance20(),
    timeScale: 0.001 * variance20(),
    dampingCoeff: 0.7 + (rng() * 21) / 100, // 0.7–0.9
    spawnRateBase: 1.0 + (rng() * 5) / 10, // 1.0–1.4s
    spawnRateFloor: 0.2,
    maxEnemyBase: 3,
    maxEnemyCeiling: 24,
    morphSpeedBase: 1.0,
    morphSpeedCeiling: 3.0,
    bossThresholdBase: 0.92,
    bossThresholdFloor: 0.6,
  };
}

/**
 * Derives deterministic audio parameters from a numeric seed hash.
 *
 * @param seedHash - Numeric seed hash used to initialize the pseudo-random generator
 * @returns An `AudioParams` object containing `bpm` (integer between 60 and 139), `swing` (0 to 0.29), and `rootNote` (0–11)
 */
function deriveAudioParams(seedHash: number): AudioParams {
  const rng = mulberry32(seedHash);
  return {
    bpm: 60 + Math.floor(rng() * 80),
    swing: Math.floor(rng() * 30) / 100,
    rootNote: Math.floor(rng() * 12),
  };
}

/**
 * Generates a resistance profile for a LeverTensionDream from a numeric seed.
 *
 * @param seedHash - Numeric seed hash used to initialize the deterministic RNG.
 * @returns An array of 10 resistance values in the range [0, 1) representing per-slot resistance.
 */
function deriveResistanceProfile(seedHash: number): number[] {
  const rng = mulberry32(seedHash);
  return Array.from({ length: 10 }, () => rng());
}

/**
 * Generates deterministic multi-key sequences from a numeric seed.
 *
 * @param seedHash - Numeric seed used to initialize the pseudo-random generator
 * @returns An array of 8 key sequences; each sequence is an array of 2–5 key strings chosen from `['Q','W','E','R','T','A','S','D','F','G','H']`
 */
function deriveMultiKeySequences(seedHash: number): string[][] {
  const rng = mulberry32(seedHash);
  const keys = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H'];
  return Array.from({ length: 8 }, () => {
    const len = 2 + Math.floor(rng() * 4); // 2–5 keys per sequence
    return Array.from({ length: len }, () => keys[Math.floor(rng() * keys.length)]);
  });
}

/**
 * Builds a deterministic progression of pattern values for KeySequenceDream.
 *
 * @param seedHash - Numeric seed hash that initializes the RNG.
 * @returns An array of five pseudorandom numbers in the range [0, 1) representing the pattern progression.
 */
function derivePatternProgression(seedHash: number): number[] {
  const rng = mulberry32(seedHash);
  return Array.from({ length: 5 }, () => rng());
}

/**
 * Create a deterministic dream-level GameEntity from a seed string and add it to the shared world.
 *
 * @param seedString - Human-readable seed used to derive the dream's archetype and all seeded properties
 * @returns The created GameEntity instance added to the global world
 */
export function spawnDreamFromSeed(seedString: string): GameEntity {
  const seedHash = hashSeed(seedString);
  const archetypeIndex = seedHash % 4;
  const rng = mulberry32(seedHash);
  const entity: Partial<GameEntity> = { level: true, buriedSeedHash: seedHash };

  // Common seed-derived parameters for ALL archetypes
  const phases = buildPhaseDefinitions(seedHash);
  const difficultyConfig = deriveDifficultyConfig(seedHash);
  const audioParams = deriveAudioParams(seedHash);

  switch (archetypeIndex) {
    case 0: // PlatterRotationDream
      {
        const patternSequences = derivePatternSequences(seedHash, phases[0].patternKeys, 12);
        const enemyTraitSelector = deriveEnemyTraitSelector(seedHash, 'PlatterCrusher');
        Object.assign(entity, {
          platterCore: true,
          rotationAxis: true,
          tensionCurve: buildTensionCurve(seedHash, 'PlatterRotation'),
          keyPatterns: phases[0].patternKeys,
          phases,
          difficultyConfig,
          audioParams,
          rotationRPM: 2 + Math.floor(rng() * 7), // seed-derived 2–8 RPM
          reachZoneArc: Math.PI / 2, // 90° arc
          patternSequences,
          enemyTraitSelector,
        });
      }
      break;
    case 1: // LeverTensionDream
      {
        const patternSequences = derivePatternSequences(seedHash, phases[0].patternKeys, 12);
        const enemyTraitSelector = deriveEnemyTraitSelector(seedHash, 'LeverSnatcher');
        Object.assign(entity, {
          leverCore: true,
          tensionCurve: buildTensionCurve(seedHash, 'LeverTension'),
          keyPatterns: phases[0].patternKeys,
          phases,
          difficultyConfig,
          audioParams,
          resistanceProfile: deriveResistanceProfile(seedHash),
          slitAnimation: true,
          slitPeriod: 1.5 + Math.floor(rng() * 6) * 0.5, // seed-derived 1.5–4s
          frequencyTolerance: 0.15, // base ±0.15
          corruptionTendrilSpawn: 0.8 + Math.floor(rng() * 5) * 0.1,
          patternSequences,
          enemyTraitSelector,
        });
      }
      break;
    case 2: // KeySequenceDream
      {
        const patternSequences = derivePatternSequences(seedHash, phases[0].patternKeys, 12);
        const enemyTraitSelector = deriveEnemyTraitSelector(seedHash, 'EchoRepeater');
        Object.assign(entity, {
          tensionCurve: buildTensionCurve(seedHash, 'KeySequence'),
          keyPatterns: phases[0].patternKeys,
          phases,
          difficultyConfig,
          audioParams,
          keycapPatterns: deriveMultiKeySequences(seedHash),
          stabilizationHoldTime: 800 + Math.floor(rng() * 13) * 100, // seed-derived 800–2000ms
          yukaSpawnRate: phases[0].spawnRate,
          patternProgression: derivePatternProgression(seedHash),
          baseSequenceLength: 2 + Math.floor(rng() * 2), // seed-derived 2–3 keys
          patternSequences,
          enemyTraitSelector,
        });
      }
      break;
    case 3: // CrystallineCubeBossDream
      {
        const patternSequences = derivePatternSequences(seedHash, phases[0].patternKeys, 12);
        const enemyTraitSelector = deriveEnemyTraitSelector(seedHash, 'GlassShatterer');
        Object.assign(entity, {
          boss: true,
          cubeCrystalline: true,
          tensionCurve: buildTensionCurve(seedHash, 'CrystallineCubeBoss'),
          keyPatterns: phases[0].patternKeys,
          phases,
          difficultyConfig,
          audioParams,
          platterLockPhase: 0,
          finalTensionBurst: 0.15,
          bossHealth: 1.5,
          slamCycles: 3,
          counterWindowBase: 4.0, // seconds
          patternSequences,
          enemyTraitSelector,
        });
      }
      break;
  }

  return world.add(entity as GameEntity);
}