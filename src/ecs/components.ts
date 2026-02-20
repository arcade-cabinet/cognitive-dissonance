/**
 * ECS Component Types — Cognitive Dissonance v3.0
 *
 * Six interaction primitives + archetype entity + runtime entities.
 * Each primitive is an individual Miniplex entity. Archetypes configure
 * which primitives are active and how they behave via slot parameters.
 *
 * Design: LEVEL_ARCHETYPES.md, user directive on Miniplex-driven composition
 */

import type { YukaTrait } from '../types';

// ── Archetype Type ──

/**
 * All 25 level archetype identifiers.
 * Seed hash selects archetype: seedHash % 25.
 */
export type ArchetypeType =
  | 'PlatterRotation'
  | 'LeverTension'
  | 'KeySequence'
  | 'CrystallineCubeBoss'
  | 'FacetAlign'
  | 'OrbitalCatch'
  | 'RefractionAim'
  | 'Labyrinth'
  | 'TurntableScratch'
  | 'RhythmGate'
  | 'WhackAMole'
  | 'ChordHold'
  | 'MorphMirror'
  | 'Conductor'
  | 'LockPick'
  | 'CubeJuggle'
  | 'ZenDrift'
  | 'Pinball'
  | 'TendrilDodge'
  | 'Escalation'
  | 'Resonance'
  | 'Survival'
  | 'CubeStack'
  | 'GhostChase'
  | 'SphereSculpt';

// ── Pacing Classification ──

export type PacingProfile = 'calm' | 'rhythmic' | 'deliberate' | 'reactive' | 'frantic' | 'intense' | 'meditative' | 'building' | 'relentless' | 'creative' | 'layered' | 'chaotic' | 'flowing' | 'sustained' | 'burst' | 'steady';
export type CognitiveLoad = 'low' | 'low-med' | 'medium' | 'high' | 'very-high' | 'escalating';

// ── Primitive Components ──

/**
 * Keycap primitive component.
 * Created for each of the 14 keycap meshes. Active subset determined by archetype.
 */
export interface KeycapComponent {
  letter: string;
  active: boolean;       // Whether this keycap participates in current archetype
  emerged: boolean;      // Physically visible above platter surface
  glowIntensity: number; // 0.0-1.0, driven by pattern matching
  holdProgress: number;  // 0.0-1.0, how long this key has been held
}

/**
 * Lever primitive component.
 * Single lever on the platter rim. Position 0.0-1.0.
 */
export interface LeverComponent {
  position: number;       // 0.0-1.0 current position
  active: boolean;        // Whether lever participates in current archetype
  resistance: number;     // 0.0-1.0 resistance feel
  locked: boolean;        // Whether lever is locked in place
}

/**
 * Platter primitive component.
 * Central rotating disc. Rotates around Y-axis.
 */
export interface PlatterComponent {
  rotationRPM: number;    // Current rotation speed
  direction: 1 | -1;     // CW (+1) or CCW (-1)
  active: boolean;        // Whether platter rotation is active in current archetype
  locked: boolean;        // Whether platter rotation is locked (e.g. boss fight)
}

/**
 * Sphere primitive component.
 * Trackball in the glass inset. Free rotation.
 */
export interface SphereComponent {
  active: boolean;        // Whether sphere interaction is active
  angularSpeed: number;   // Current angular speed
  driftEnabled: boolean;  // Whether gaze/idle drift is active
  driftSpeed: number;     // Drift rate (rad/frame)
}

/**
 * Crystalline Cube component.
 * SDF geometry, free 3D movement. Used as reference, target, boss, or spatial element.
 */
export interface CrystallineCubeComponent {
  active: boolean;
  role: 'boss' | 'reference' | 'target' | 'obstacle' | 'metronome' | 'progress';
  health: number;          // For boss role
  facetCount: number;      // Number of visible facets
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  orbitRadius: number;     // Distance from platter center
  orbitSpeed: number;      // Angular speed (rad/s)
  altitude: number;        // Y position above platter
}

/**
 * Morph Cube component.
 * Shape-shifting geometry, free 3D movement. Used as mirror, obstacle, bumper, or ghost.
 */
export interface MorphCubeComponent {
  active: boolean;
  role: 'mirror' | 'obstacle' | 'bumper' | 'ghost' | 'breathing' | 'metronome';
  morphProgress: number;   // 0.0-1.0 current morph state
  currentTrait: YukaTrait;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  orbitRadius: number;
  orbitSpeed: number;
  altitude: number;
}

// ── Archetype Slots ──

/**
 * Base slot parameters shared by all archetypes.
 */
export interface BaseSlots {
  /** Keycap letters active in this archetype (subset of 14) */
  keycapSubset: string[];
  /** Whether lever is used */
  leverActive: boolean;
  /** Whether platter rotation is used */
  platterActive: boolean;
  /** Whether sphere interaction is used */
  sphereActive: boolean;
  /** Whether crystalline cube is used */
  crystallineCubeActive: boolean;
  /** Whether morph cube is used */
  morphCubeActive: boolean;
}

/** Per-archetype slot parameter types */
export interface PlatterRotationSlots extends BaseSlots {
  rotationRPM: number;         // 2-8
  reachZoneArc: number;        // 60-120 degrees
  direction: 1 | -1;
}

export interface LeverTensionSlots extends BaseSlots {
  slitPeriod: number;          // 1.5-4s
  frequencyTolerance: number;  // 0.05-0.25
  patternCount: number;        // 1-3 simultaneous
}

export interface KeySequenceSlots extends BaseSlots {
  sequenceLength: number;      // 2-5
  timeWindowMs: number;        // 400-2000
  showDuration: number;        // how long pattern displays
}

export interface CrystallineCubeBossSlots extends BaseSlots {
  slamCycles: number;          // 1-5
  bossHealth: number;          // 1.0-2.5
  descentSpeed: number;
  counterWindowMs: number;     // 200-800
}

export interface FacetAlignSlots extends BaseSlots {
  facetCount: number;          // 4-8
  alignmentThresholdDeg: number; // 5-20
  scrambleIntervalS: number;   // 8-20
  lockoutDurationMs: number;   // 300-1000
}

export interface OrbitalCatchSlots extends BaseSlots {
  orbitCount: number;          // 1-4
  orbitSpeedBase: number;      // 0.5-2.0 rad/s
  orbitRadiusRange: [number, number];
  altitudeRange: [number, number]; // Y: -0.3 to 0.5
  catchWindowDeg: number;      // 10-30
}

export interface RefractionAimSlots extends BaseSlots {
  beamWidth: number;           // narrow-wide
  targetKeycapCount: number;   // 1-4
  driftSpeed: number;
  refractionAngle: number;
}

export interface LabyrinthSlots extends BaseSlots {
  mazeComplexity: number;      // 3-8 (NxN grid)
  particleSpeed: number;
  targetZoneSize: number;
  wallBounce: 'elastic' | 'sticky';
  mazeRotationOffset: number;
}

export interface TurntableScratchSlots extends BaseSlots {
  phraseLengthBeats: number;   // 4-16
  scratchPoints: number;       // 1-4 per phrase
  bpm: number;                 // 80-140
  keyDropSubset: string[];     // 2-6 keys
  scratchWindowMs: number;     // 100-400
}

export interface RhythmGateSlots extends BaseSlots {
  bpm: number;                 // 60-160
  gatePattern: 'quarter' | 'eighth' | 'syncopated';
  openRatio: number;           // 0.2-0.6 of beat
  leverRequired: boolean;
}

export interface WhackAMoleSlots extends BaseSlots {
  emergeDurationMs: number;    // 300-2000
  maxSimultaneous: number;     // 1-6
  emergeIntervalMs: number;    // 500-3000
  decoyRate: number;           // 0-0.3
}

export interface ChordHoldSlots extends BaseSlots {
  chordSize: number;           // 2-4
  holdDurationMs: number;      // 500-2000
  sequenceLength: number;      // 3-8 chords
  transitionWindowMs: number;  // 200-1000
}

export interface MorphMirrorSlots extends BaseSlots {
  cubePatternSpeed: number;    // 0.3-1.5
  cubeMotionType: 'rotation' | 'stretch' | 'oscillate';
  inversePrecisionDeg: number; // 10-30
  patternChangeIntervalS: number; // 3-10
}

export interface ConductorSlots extends BaseSlots {
  targetBpm: number;           // 60-180
  dynamicCurve: 'crescendo' | 'decrescendo' | 'sforzando';
  sectionCount: number;        // 2-5 instrument groups
  toleranceBpm: number;        // ±3 to ±15
}

export interface LockPickSlots extends BaseSlots {
  pinCount: number;            // 3-7
  notchWidthDeg: number;       // 3-12
  notchPositions: number[];    // random per seed
  resetPenalty: 'reset-all' | 'reset-one';
  leverHoldDurationMs: number; // 200-800
}

export interface CubeJuggleSlots extends BaseSlots {
  cubeCount: number;           // 2-5
  decayRate: number;           // altitude loss per second
  bumpStrength: number;
  orbitSpread: number;         // tight cluster vs wide orbit
  spawnInterval: number;       // new cube every N seconds
}

export interface ZenDriftSlots extends BaseSlots {
  driftSpeed: number;          // 0.001-0.005 rad/frame
  jerkThreshold: number;
  coherenceDecayRate: number;
  sessionDurationS: number;    // 30-120
  gazeWeight: number;
}

export interface PinballSlots extends BaseSlots {
  ballSpeed: number;
  flipperStrength: number;
  bumperCount: number;         // 0-3 morph cube bumpers
  multiball: number;           // 1-3 simultaneous
}

export interface TendrilDodgeSlots extends BaseSlots {
  tendrilWaveSize: number;     // 3-12
  waveIntervalS: number;      // 2-8
  approachSpeed: number;
  dissolveAngleDeg: number;    // 15-45
  shieldDurationMs: number;    // 300-1500
  shieldCooldownS: number;    // 3-10
}

export interface EscalationSlots extends BaseSlots {
  activationOrder: string[];   // permutation of 6 surfaces
  activationIntervalS: number; // 15-45
  startDifficulty: 'easy' | 'medium';
  maxDimensions: number;       // 3-6
  compoundTensionMultiplier: number;
}

export interface ResonanceSlots extends BaseSlots {
  resonanceFrequency: number;  // hidden target
  toleranceBand: number;       // narrow-wide
  frequencyDriftRate: number;
  amplitudeRange: [number, number];
  holdDurationS: number;       // sustain for N seconds
}

export interface SurvivalSlots extends BaseSlots {
  baseTensionRiseRate: number; // 0.01-0.05/s
  surfaceIntensity: Record<string, number>; // per-surface difficulty weights
  respiteIntervalS: number;   // 0 = none, 15-30 = brief calm
  cubeAggressionRate: number;
}

export interface CubeStackSlots extends BaseSlots {
  stackHeight: number;         // 2-4 elements
  driftForce: number;
  alignmentThresholdDeg: number; // 3-15
  switchCooldownMs: number;    // 200-1000
  balanceDifficultyMode: 'static' | 'dynamic-wind';
}

export interface GhostChaseSlots extends BaseSlots {
  echoDelayMs: number;         // 500-3000
  echoCount: number;           // 1-3 simultaneous ghosts
  harmonizeMode: 'interleave' | 'complement' | 'invert';
  echoDecayRate: number;
}

export interface SphereSculptSlots extends BaseSlots {
  targetComplexity: number;    // simple to complex
  axisMappingSensitivity: number;
  morphDamping: number;
  targetHoldDurationS: number;
  targetChangeIntervalS: number;
}

/**
 * Union of all archetype slot types.
 * Discriminated by ArchetypeType in the ArchetypeComponent.
 */
export type ArchetypeSlots =
  | PlatterRotationSlots
  | LeverTensionSlots
  | KeySequenceSlots
  | CrystallineCubeBossSlots
  | FacetAlignSlots
  | OrbitalCatchSlots
  | RefractionAimSlots
  | LabyrinthSlots
  | TurntableScratchSlots
  | RhythmGateSlots
  | WhackAMoleSlots
  | ChordHoldSlots
  | MorphMirrorSlots
  | ConductorSlots
  | LockPickSlots
  | CubeJuggleSlots
  | ZenDriftSlots
  | PinballSlots
  | TendrilDodgeSlots
  | EscalationSlots
  | ResonanceSlots
  | SurvivalSlots
  | CubeStackSlots
  | GhostChaseSlots
  | SphereSculptSlots;

// ── Archetype Component ──

/**
 * Archetype entity component.
 * One active archetype entity per Dream. Configures all primitive entities.
 */
export interface ArchetypeComponent {
  type: ArchetypeType;
  slots: ArchetypeSlots;
  seedHash: number;
  pacing: PacingProfile;
  cognitiveLoad: CognitiveLoad;
}

// ── Archetype Metadata (static, for pacing/selection) ──

export interface ArchetypeMetadata {
  type: ArchetypeType;
  pacing: PacingProfile;
  cognitiveLoad: CognitiveLoad;
  primarySurfaces: string[];
  cubesUsed: ('crystalline' | 'morph' | 'both' | 'none')[];
  thematicEnemyTrait: YukaTrait | null;
}

/**
 * Static metadata for all 25 archetypes.
 * Used by the seed system for pacing-aware archetype selection.
 */
export const ARCHETYPE_METADATA: Record<ArchetypeType, ArchetypeMetadata> = {
  PlatterRotation: { type: 'PlatterRotation', pacing: 'steady', cognitiveLoad: 'low-med', primarySurfaces: ['platter', 'keycaps'], cubesUsed: ['none'], thematicEnemyTrait: 'PlatterCrusher' },
  LeverTension: { type: 'LeverTension', pacing: 'rhythmic', cognitiveLoad: 'low', primarySurfaces: ['lever', 'slit'], cubesUsed: ['none'], thematicEnemyTrait: 'LeverSnatcher' },
  KeySequence: { type: 'KeySequence', pacing: 'burst', cognitiveLoad: 'medium', primarySurfaces: ['keycaps'], cubesUsed: ['none'], thematicEnemyTrait: 'EchoRepeater' },
  CrystallineCubeBoss: { type: 'CrystallineCubeBoss', pacing: 'intense', cognitiveLoad: 'high', primarySurfaces: ['cube', 'lever', 'keycaps'], cubesUsed: ['crystalline'], thematicEnemyTrait: 'GlassShatterer' },
  FacetAlign: { type: 'FacetAlign', pacing: 'deliberate', cognitiveLoad: 'medium', primarySurfaces: ['sphere', 'cube'], cubesUsed: ['crystalline'], thematicEnemyTrait: null },
  OrbitalCatch: { type: 'OrbitalCatch', pacing: 'frantic', cognitiveLoad: 'high', primarySurfaces: ['sphere', 'cubes'], cubesUsed: ['both'], thematicEnemyTrait: null },
  RefractionAim: { type: 'RefractionAim', pacing: 'deliberate', cognitiveLoad: 'medium', primarySurfaces: ['sphere', 'cube', 'keycaps'], cubesUsed: ['crystalline'], thematicEnemyTrait: null },
  Labyrinth: { type: 'Labyrinth', pacing: 'calm', cognitiveLoad: 'low-med', primarySurfaces: ['sphere'], cubesUsed: ['morph'], thematicEnemyTrait: null },
  TurntableScratch: { type: 'TurntableScratch', pacing: 'rhythmic', cognitiveLoad: 'medium', primarySurfaces: ['platter', 'lever', 'keycaps'], cubesUsed: ['none'], thematicEnemyTrait: null },
  RhythmGate: { type: 'RhythmGate', pacing: 'rhythmic', cognitiveLoad: 'medium', primarySurfaces: ['slit', 'keycaps', 'lever'], cubesUsed: ['morph'], thematicEnemyTrait: null },
  WhackAMole: { type: 'WhackAMole', pacing: 'reactive', cognitiveLoad: 'low-med', primarySurfaces: ['keycaps'], cubesUsed: ['morph'], thematicEnemyTrait: null },
  ChordHold: { type: 'ChordHold', pacing: 'deliberate', cognitiveLoad: 'medium', primarySurfaces: ['keycaps', 'cube'], cubesUsed: ['crystalline'], thematicEnemyTrait: null },
  MorphMirror: { type: 'MorphMirror', pacing: 'flowing', cognitiveLoad: 'medium', primarySurfaces: ['sphere', 'cube'], cubesUsed: ['morph'], thematicEnemyTrait: 'SphereCorruptor' },
  Conductor: { type: 'Conductor', pacing: 'rhythmic', cognitiveLoad: 'high', primarySurfaces: ['lever', 'platter', 'keycaps'], cubesUsed: ['crystalline'], thematicEnemyTrait: null },
  LockPick: { type: 'LockPick', pacing: 'deliberate', cognitiveLoad: 'medium', primarySurfaces: ['sphere', 'lever'], cubesUsed: ['crystalline'], thematicEnemyTrait: null },
  CubeJuggle: { type: 'CubeJuggle', pacing: 'frantic', cognitiveLoad: 'high', primarySurfaces: ['sphere', 'cubes'], cubesUsed: ['both'], thematicEnemyTrait: null },
  ZenDrift: { type: 'ZenDrift', pacing: 'meditative', cognitiveLoad: 'low', primarySurfaces: ['sphere'], cubesUsed: ['morph'], thematicEnemyTrait: null },
  Pinball: { type: 'Pinball', pacing: 'chaotic', cognitiveLoad: 'medium', primarySurfaces: ['platter', 'lever', 'keycaps'], cubesUsed: ['morph'], thematicEnemyTrait: null },
  TendrilDodge: { type: 'TendrilDodge', pacing: 'intense', cognitiveLoad: 'high', primarySurfaces: ['sphere', 'lever', 'keycaps'], cubesUsed: ['none'], thematicEnemyTrait: 'TendrilBinder' },
  Escalation: { type: 'Escalation', pacing: 'building', cognitiveLoad: 'escalating', primarySurfaces: ['all'], cubesUsed: ['both'], thematicEnemyTrait: null },
  Resonance: { type: 'Resonance', pacing: 'sustained', cognitiveLoad: 'medium', primarySurfaces: ['sphere', 'lever', 'cube'], cubesUsed: ['crystalline'], thematicEnemyTrait: null },
  Survival: { type: 'Survival', pacing: 'relentless', cognitiveLoad: 'very-high', primarySurfaces: ['all'], cubesUsed: ['both'], thematicEnemyTrait: null },
  CubeStack: { type: 'CubeStack', pacing: 'deliberate', cognitiveLoad: 'high', primarySurfaces: ['sphere', 'cubes', 'lever'], cubesUsed: ['both'], thematicEnemyTrait: null },
  GhostChase: { type: 'GhostChase', pacing: 'layered', cognitiveLoad: 'high', primarySurfaces: ['keycaps', 'sphere'], cubesUsed: ['morph'], thematicEnemyTrait: 'EchoRepeater' },
  SphereSculpt: { type: 'SphereSculpt', pacing: 'creative', cognitiveLoad: 'medium', primarySurfaces: ['sphere', 'cubes', 'keycaps'], cubesUsed: ['both'], thematicEnemyTrait: null },
};

// ── Composite Entity Type (extends existing GameEntity) ──

/**
 * Primitive entity type for the new ECS architecture.
 * Each entity has exactly ONE primary component tag plus its component data.
 * This extends (not replaces) the existing GameEntity for gradual migration.
 */
export interface PrimitiveEntity {
  // Primary component tags (exactly one per entity)
  keycap?: KeycapComponent;
  lever?: LeverComponent;
  platter?: PlatterComponent;
  sphere?: SphereComponent;
  crystallineCube?: CrystallineCubeComponent;
  morphCube?: MorphCubeComponent;
  archetype?: ArchetypeComponent;

  // Mesh reference (all primitives have one)
  mesh?: { dispose: () => void; name: string; position: { x: number; y: number; z: number } };
}
