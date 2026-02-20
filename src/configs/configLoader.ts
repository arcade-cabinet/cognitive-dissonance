/**
 * configLoader — Loader for seed-driven pattern and tension configurations.
 *
 * Loads patterns.json and merges with seed-derived procedural overrides.
 * On web: fetches via standard import (Metro bundles JSON).
 * On native: Metro resolves JSON from src/configs/.
 *
 * Source: ARCH v3.0 configLoader
 * Requirement: 5.1 (Seed-Driven Configuration)
 */

import type { DifficultyConfig, TensionCurveConfig } from '../types';
import { hashSeed } from '../utils/seed-helpers';
import patternsData from './patterns.json';

export interface PhaseConfig {
  tension: number;
  patternKeys: string[];
  spawnRate: number;
  yukaCount: number;
  boss?: string;
}

/** Raw tension curve from patterns.json (includes dampingFactor for DifficultyConfig) */
interface RawTensionCurve {
  increaseRate: number;
  decreaseRate: number;
  overStabilizationThreshold: number;
  reboundProbability: number;
  reboundAmount: number;
  dampingFactor: number;
}

export interface PatternsConfig {
  seed: string;
  phases: PhaseConfig[];
  tensionCurves: Record<string, RawTensionCurve>;
}

/**
 * Extract the canonical TensionCurveConfig (for TensionSystem) from a raw curve.
 */
function toTensionCurveConfig(raw: RawTensionCurve): TensionCurveConfig {
  return {
    increaseRate: raw.increaseRate,
    decreaseRate: raw.decreaseRate,
    overStabilizationThreshold: raw.overStabilizationThreshold,
    reboundProbability: raw.reboundProbability,
    reboundAmount: raw.reboundAmount,
  };
}

/**
 * Build a default DifficultyConfig from the raw tension curve's dampingFactor.
 */
function toDifficultyConfig(raw: RawTensionCurve, seedHash: number): DifficultyConfig {
  // Seed-derived variance on damping (+-5%)
  const variance = ((seedHash % 10) - 5) / 100;
  return {
    k: 1.35,
    timeScale: 0.001,
    dampingCoeff: raw.dampingFactor + variance,
    spawnRateBase: 1.0,
    spawnRateFloor: 0.3,
    maxEnemyBase: 5,
    maxEnemyCeiling: 20,
    morphSpeedBase: 0.5,
    morphSpeedCeiling: 2.0,
    bossThresholdBase: 0.85,
    bossThresholdFloor: 0.65,
  };
}

/**
 * Load pattern and tension configurations, merged with seed-derived overrides.
 *
 * @param seedString - The buried seed string for this Dream
 * @returns Merged config with seed-derived procedural overrides
 */
export function loadSeedConfigs(seedString: string): {
  patterns: PatternsConfig;
  seedHash: number;
  tensionCurve: TensionCurveConfig;
  difficultyConfig: DifficultyConfig;
} {
  const seedHash = hashSeed(seedString);

  // Select tension curve variant based on seed
  const curveNames = Object.keys(patternsData.tensionCurves);
  const curveIndex = seedHash % curveNames.length;
  const selectedCurveName = curveNames[curveIndex];

  // Apply seed-derived variance (+-20%) to spawn rates and yuka counts
  const variance = ((seedHash % 40) - 20) / 100; // -0.20 to +0.20
  const phases = patternsData.phases.map((phase) => ({
    ...phase,
    spawnRate: phase.spawnRate * (1 + variance),
    yukaCount: Math.max(1, Math.round(phase.yukaCount * (1 + variance))),
  }));

  const tensionCurves = patternsData.tensionCurves as Record<string, RawTensionCurve>;
  const rawCurve = tensionCurves[selectedCurveName];

  const patterns: PatternsConfig = {
    ...patternsData,
    phases,
    tensionCurves: {
      ...tensionCurves,
      active: rawCurve,
    },
  };

  return {
    patterns,
    seedHash,
    tensionCurve: toTensionCurveConfig(rawCurve),
    difficultyConfig: toDifficultyConfig(rawCurve, seedHash),
  };
}
