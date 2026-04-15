/**
 * Pattern-stabilizer system — the core gameplay loop.
 *
 * Each step:
 *   1. Spawn new patterns at a tension-scaled interval
 *   2. Advance each active pattern's progress outward from the sphere
 *   3. Held keycaps matching a pattern's colorIndex pull it back inward
 *   4. If progress ≥ 1: pattern escaped → tension +, remove entity
 *   5. If progress ≤ 0: pattern stabilised → coherence +, remove entity
 *
 * Runs at a fixed 30Hz regardless of render fps (via runFixedSteps). Pure
 * Koota ECS mutations — no three.js imports. The cabinet renderer reads
 * Pattern entities each frame and draws them.
 */

import type { World } from 'koota';
import { type FixedStepState, runFixedSteps, spawnIntervalSeconds } from '@/lib/fixed-step';
import { KEYCAP_COLORS, KEYCAP_COUNT } from '@/lib/keycap-colors';
import { Game, Input, IsPattern, Level, Pattern, Position, Seed } from '../world';

const FIXED_STEP_S = 1 / 30;
const PATTERN_PULL_RATE = 2.4; // progress/sec pulled back when the matching keycap is held
const COHERENCE_REWARD = 4; // per stabilised pattern (tuning pass 1: 3 → 4)
const TENSION_PENALTY = 0.12; // per escaped pattern
// Per-stabilise tension drop (tuning pass 1: 0.05 → 0.08). Gives skilled
// play meaningful tension clawback so a 0.95-tension state isn't a one-way
// death spiral.
const TENSION_RELIEF_PER_STABILISE = 0.08;
const MAX_TENSION = 1;
const MIN_TENSION = 0;

export interface PatternStabilizerState {
  fixedStep: FixedStepState;
  spawnTimer: number;
}

export function createPatternStabilizerState(): PatternStabilizerState {
  return {
    fixedStep: { accumulator: 0 },
    spawnTimer: 0.3,
  };
}

/**
 * Drive one frame of the sim. Skip work unless `Game.phase === 'playing'`.
 */
export function tickPatternStabilizer(world: World, state: PatternStabilizerState, dt: number): void {
  if (world.get(Game)?.phase !== 'playing') {
    state.fixedStep.accumulator = 0;
    return;
  }

  runFixedSteps(state.fixedStep, dt, FIXED_STEP_S, (stepDt) => {
    runOneStep(world, state, stepDt);
  });
}

function runOneStep(world: World, state: PatternStabilizerState, dt: number): void {
  const seed = world.get(Seed);
  const rng = seed?.rng ?? Math.random;
  const curLevel = world.get(Level);
  const curTension = curLevel?.tension ?? 0;

  // ── Spawn ────────────────────────────────────────────────────────────
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnPattern(world, rng, curTension);
    state.spawnTimer = spawnIntervalSeconds(curTension, rng, 0.16, 1.1);
  }

  // ── Update every active pattern ──────────────────────────────────────
  const held = world.get(Input)?.heldKeycaps ?? new Set<number>();
  let escapedCount = 0;
  let stabilisedCount = 0;
  const toDestroy: Array<ReturnType<typeof world.query>[number]> = [];

  world.query(IsPattern, Pattern, Position).updateEach(([pattern, position], entity) => {
    let nextProgress = pattern.progress + pattern.speed * dt;
    if (held.has(pattern.colorIndex)) {
      nextProgress = Math.max(0, nextProgress - PATTERN_PULL_RATE * dt);
    }
    pattern.progress = nextProgress;
    const radius = nextProgress * 0.52;
    position.x = Math.cos(pattern.angle) * radius;
    position.y = 0.4;
    position.z = Math.sin(pattern.angle) * radius;

    if (nextProgress >= 1) {
      escapedCount++;
      toDestroy.push(entity);
    } else if (nextProgress <= 0) {
      stabilisedCount++;
      toDestroy.push(entity);
    }
  });

  for (const e of toDestroy) e.destroy();

  if (escapedCount > 0) {
    world.set(Level, (prev) => ({
      ...prev,
      tension: Math.min(MAX_TENSION, prev.tension + escapedCount * TENSION_PENALTY),
    }));
  }
  if (stabilisedCount > 0) {
    world.set(Level, (prev) => {
      const nextCoh = prev.coherence + stabilisedCount * COHERENCE_REWARD;
      return {
        ...prev,
        coherence: nextCoh,
        peakCoherence: Math.max(prev.peakCoherence, nextCoh),
        tension: Math.max(MIN_TENSION, prev.tension - stabilisedCount * TENSION_RELIEF_PER_STABILISE),
      };
    });
  }
}

function spawnPattern(world: World, rng: () => number, tension: number): void {
  const colorIndex = Math.floor(rng() * KEYCAP_COUNT);
  const kc = KEYCAP_COLORS[colorIndex];
  const speed = 0.3 + rng() * (0.4 + tension * 1.2);
  const angle = rng() * Math.PI * 2;

  const entity = world.spawn(IsPattern, Pattern, Position);
  entity.set(Pattern, {
    progress: 0,
    speed,
    colorIndex,
    angle,
    color: kc.hex,
  });
  entity.set(Position, { x: 0, y: 0.4, z: 0 });
}
