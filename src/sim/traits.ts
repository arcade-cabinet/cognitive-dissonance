/**
 * Koota traits for Cognitive Dissonance.
 *
 * Two categories:
 *
 * 1. **Singleton traits** — attached to the world entity itself, used for
 *    global game state (replaces Zustand stores). Read/write via
 *    `world.get(Trait)` / `world.set(Trait, {...})` / `useTrait(world, Trait)`.
 *
 * 2. **Entity traits** — attached to spawned game entities (sphere, enemies,
 *    patterns), used for ECS-style data + behavior separation. Queried via
 *    `world.query(Trait, …)`.
 *
 * Keep this file small and data-only. Logic lives in actions/ and systems/.
 */

import { trait } from 'koota';
import type seedrandom from 'seedrandom';

// ─────────────────────────────────────────────────────────────────────────────
// Singleton traits (attached to the world entity)
// ─────────────────────────────────────────────────────────────────────────────

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

/** Game phase + restart counter. Replaces useGameStore. */
export const Game = trait({
  phase: 'title' as GamePhase,
  restartToken: 0,
});

/** Level progression, coherence, tension. Replaces useLevelStore. */
export const Level = trait({
  currentLevel: 1,
  coherence: 25,
  peakCoherence: 25,
  tension: 0.12,
});

/** Deterministic seed + RNG. Replaces useSeedStore.
 *  Callback-based (AoS) because seedrandom creates a stateful closure. */
export const Seed = trait(() => ({
  seedString: '',
  lastSeedUsed: '',
  rng: (() => Math.random()) as ReturnType<typeof seedrandom>,
}));

/** Held keycap indices (pointer-down state). Replaces useInputStore.
 *  Callback-based because Set<number> shouldn't be shared across worlds. */
export const Input = trait(() => ({
  heldKeycaps: new Set<number>(),
}));

/** Tone.js audio graph + per-frame tension (for the adaptive score loop). */
export const Audio = trait(() => ({
  isInitialized: false,
  tension: 0.12,
  // Untyped to keep tone.js out of this file's import graph — consumers cast.
  graph: null as unknown as null | {
    masterGain: unknown;
    drone: unknown;
    padFilter: unknown;
    pads: unknown;
    glitchFilter: unknown;
    glitchEnv: unknown;
    glitchNoise: unknown;
    chimes: unknown;
    loop: unknown;
    stepIndex: number;
    glitchPattern: number[];
    chimePattern: number[];
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Entity traits (spawned via world.spawn)
// ─────────────────────────────────────────────────────────────────────────────

/** Tag: this entity is the AI sphere. Only one ever exists at a time. */
export const IsSphere = trait();

/** Tag: this entity is an enemy cube/ship. */
export const IsEnemy = trait();

/** Tag: this entity is a corruption pattern escaping the sphere. */
export const IsPattern = trait();

/** Position in world space. */
export const Position = trait({ x: 0, y: 0, z: 0 });

/** Velocity for simple linear motion (patterns mostly). */
export const Velocity = trait({ x: 0, y: 0, z: 0 });

/** Enemy health + type tag. */
export const Enemy = trait({
  health: 1,
  isBoss: false,
  kind: 'seek' as 'seek' | 'zigzag' | 'split' | 'wander',
});

/** Pattern progress (0..1 from center to rim) + speed + color index. */
export const Pattern = trait({
  progress: 0,
  speed: 0.5,
  colorIndex: 0,
  /** Hex color, kept here so renderer doesn't need a separate trait. */
  color: '#ffffff',
});

/** Sphere-specific state: tension/coherence mirrors + exploded flag. */
export const Sphere = trait({
  tension: 0,
  coherence: 25,
  crackLevel: 0,
  exploded: false,
});
