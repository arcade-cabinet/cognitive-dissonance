import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

// Yuka AI trait types
export type YukaTrait =
  | 'NeonRaymarcher'
  | 'TendrilBinder'
  | 'PlatterCrusher'
  | 'GlassShatterer'
  | 'EchoRepeater'
  | 'LeverSnatcher'
  | 'SphereCorruptor';

// Hand joint with mesh overlay (XR types will be added when XR is implemented)
export interface HandJoint {
  // biome-ignore lint/suspicious/noExplicitAny: WebXRJoint type will be added when XR is implemented (Task 21)
  joint: any; // WebXRJoint placeholder
  // biome-ignore lint/suspicious/noExplicitAny: Mesh type will be added when XR is implemented (Task 21)
  mesh: any; // Mesh placeholder
}

// Phase configuration (built into Level_Archetype entity at spawn time)
export interface PhaseConfig {
  tension: number;
  patternKeys: string[];
  spawnRate: number;
  yukaCount: number;
  boss?: string;
}

// Tension curve configuration (per-archetype)
export interface TensionCurveConfig {
  increaseRate: number;
  decreaseRate: number;
  overStabilizationThreshold: number;
  reboundProbability: number;
  reboundAmount: number;
}

// Difficulty scaling configuration
export interface DifficultyConfig {
  k: number;
  timeScale: number;
  dampingCoeff: number;
  spawnRateBase: number;
  spawnRateFloor: number;
  maxEnemyBase: number;
  maxEnemyCeiling: number;
  morphSpeedBase: number;
  morphSpeedCeiling: number;
  bossThresholdBase: number;
  bossThresholdFloor: number;
}

// Difficulty snapshot (computed per frame)
export interface DifficultySnapshot {
  spawnRate: number;
  maxEnemyCount: number;
  patternComplexity: number;
  morphSpeed: number;
  bossSpawnThreshold: number;
  tensionIncreaseModifier: number;
}

// Audio parameters
export interface AudioParams {
  bpm: number;
  swing: number;
  rootNote: number;
}

// Main game entity type (Miniplex)
export interface GameEntity {
  // Level archetype tags
  level?: boolean;
  platterCore?: boolean;
  rotationAxis?: boolean;
  tensionCurve?: TensionCurveConfig;
  keyPatterns?: string[];
  buriedSeedHash?: number;
  leverCore?: boolean;
  resistanceProfile?: number[];
  slitAnimation?: boolean;
  slitPeriod?: number;
  frequencyTolerance?: number;
  corruptionTendrilSpawn?: number;
  keycapPatterns?: string[][];
  stabilizationHoldTime?: number;
  yukaSpawnRate?: number;
  patternProgression?: number[];
  baseSequenceLength?: number;
  boss?: boolean;
  cubeCrystalline?: boolean;
  platterLockPhase?: number;
  finalTensionBurst?: number;
  bossHealth?: number;
  slamCycles?: number;
  counterWindowBase?: number;

  // Seed-derived procedural parameters (built inline, no JSON)
  phases?: PhaseConfig[];
  difficultyConfig?: DifficultyConfig;
  audioParams?: AudioParams;
  rotationRPM?: number;
  reachZoneArc?: number;
  patternSequences?: string[][]; // Pattern sequences (1-5 keys each) for this Dream
  enemyTraitSelector?: () => YukaTrait; // Enemy trait selector with archetype bias

  // Dynamic difficulty parameters (written by DifficultyScalingSystem each frame)
  spawnRate?: number;
  maxEnemyCount?: number;
  patternComplexity?: number;
  morphSpeed?: number;
  bossSpawnThreshold?: number;
  tensionIncreaseModifier?: number;

  // Hand archetype tags
  xrHand?: boolean;
  left?: boolean;
  right?: boolean;
  joints?: HandJoint[];
  gripStrength?: number;
  pinchStrength?: number;
  contactPoints?: Vector3[];

  // AR archetype tags
  arAnchored?: boolean;
  arEntity?: boolean;
  sphereCore?: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: WebXRAnchor type will be added when XR is implemented (Task 20)
  anchor?: any; // WebXRAnchor placeholder
  modeLeverPosition?: number;
  roomScale?: boolean;
  phoneProjected?: boolean;

  // Enemy archetype tags
  enemy?: boolean;
  yuka?: boolean;
  morphTarget?: {
    // biome-ignore lint/suspicious/noExplicitAny: Mesh and MorphTargetManager types from Babylon.js
    mesh: any; // Mesh
    // biome-ignore lint/suspicious/noExplicitAny: MorphTargetManager type from Babylon.js
    manager: any; // MorphTargetManager
  };
  currentTrait?: YukaTrait;
  morphProgress?: number;

  // Boss archetype tags
  crushPhase?: number;
  health?: number;
  worldImpact?: boolean;

  // Shared
  position?: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
}
