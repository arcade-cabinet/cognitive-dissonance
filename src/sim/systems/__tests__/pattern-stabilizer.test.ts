import { beforeEach, describe, expect, it } from 'vitest';
import { Game, Input, IsPattern, Level, Pattern, Position, world } from '@/sim/world';
import { createPatternStabilizerState, tickPatternStabilizer } from '../pattern-stabilizer';

const FIXED_STEP_S = 1 / 30;

function resetWorld(): void {
  world.set(Game, () => ({ phase: 'playing' as const, restartToken: 0 }));
  world.set(Level, (prev) => ({
    ...prev,
    currentLevel: 1,
    coherence: 25,
    peakCoherence: 25,
    tension: 0.12,
  }));
  world.set(Input, (prev) => ({ ...prev, heldKeycaps: new Set<number>() }));
  // Destroy any leftover pattern entities from prior tests.
  world.query(IsPattern).updateEach((_t, e) => {
    e.destroy();
  });
}

function spawnTestPattern(opts: { progress?: number; speed?: number; colorIndex?: number; angle?: number } = {}) {
  const { progress = 0, speed = 0.5, colorIndex = 0, angle = 0 } = opts;
  const e = world.spawn(IsPattern, Pattern, Position);
  e.set(Pattern, { progress, speed, colorIndex, angle, color: '#ffffff' });
  e.set(Position, { x: 0, y: 0.4, z: 0 });
  return e;
}

describe('pattern-stabilizer', () => {
  beforeEach(() => {
    resetWorld();
  });

  it('does nothing and resets accumulator when phase is not playing', () => {
    world.set(Game, (prev) => ({ ...prev, phase: 'paused' as const }));
    const state = createPatternStabilizerState();
    state.fixedStep.accumulator = 0.05;

    tickPatternStabilizer(world, state, 0.5);

    expect(state.fixedStep.accumulator).toBe(0);
    expect(world.query(IsPattern).length).toBe(0);
  });

  it('advances pattern progress outward at its speed', () => {
    const p = spawnTestPattern({ progress: 0.3, speed: 0.6 });

    // Run one fixed step (1/30s).
    const state = createPatternStabilizerState();
    state.spawnTimer = 100; // suppress new spawns
    tickPatternStabilizer(world, state, FIXED_STEP_S);

    const data = p.get(Pattern);
    expect(data?.progress).toBeCloseTo(0.3 + 0.6 * FIXED_STEP_S, 5);
  });

  it('pulls pattern progress back when the matching keycap is held', () => {
    const p = spawnTestPattern({ progress: 0.5, speed: 0.6, colorIndex: 3 });
    world.set(Input, (prev) => ({ ...prev, heldKeycaps: new Set<number>([3]) }));

    const state = createPatternStabilizerState();
    state.spawnTimer = 100;
    tickPatternStabilizer(world, state, FIXED_STEP_S);

    // forward: 0.6 * dt; pull: 2.4 * dt; net: -1.8 * dt = -0.06.
    // 0.5 - 0.06 = 0.44. (forward applied first, then pull.)
    const data = p.get(Pattern);
    expect(data?.progress).toBeCloseTo(0.44, 5);
  });

  it('rewards coherence when a pattern is fully stabilised', () => {
    const p = spawnTestPattern({ progress: 0.02, speed: 0, colorIndex: 1 });
    world.set(Input, (prev) => ({ ...prev, heldKeycaps: new Set<number>([1]) }));

    const state = createPatternStabilizerState();
    state.spawnTimer = 100;
    tickPatternStabilizer(world, state, FIXED_STEP_S);

    expect(p.has(IsPattern)).toBe(false); // entity destroyed
    // COHERENCE_REWARD = 4 (tuning pass 1)
    expect(world.get(Level)?.coherence).toBeCloseTo(25 + 4, 5);
  });

  it('penalises tension when a pattern escapes (progress >= 1)', () => {
    const p = spawnTestPattern({ progress: 0.99, speed: 1.0 });
    const startTension = world.get(Level)?.tension ?? 0;

    const state = createPatternStabilizerState();
    state.spawnTimer = 100;
    tickPatternStabilizer(world, state, FIXED_STEP_S);

    expect(p.has(IsPattern)).toBe(false);
    expect(world.get(Level)?.tension).toBeCloseTo(startTension + 0.12, 5);
  });

  it('clamps tension to 1 even with many escapes', () => {
    for (let i = 0; i < 20; i++) {
      spawnTestPattern({ progress: 0.99, speed: 1.0, angle: i });
    }

    const state = createPatternStabilizerState();
    state.spawnTimer = 100;
    tickPatternStabilizer(world, state, FIXED_STEP_S);

    expect(world.get(Level)?.tension).toBe(1);
  });

  it('writes the pattern position from progress + angle', () => {
    const p = spawnTestPattern({ progress: 0.5, speed: 0, angle: Math.PI / 2 });

    const state = createPatternStabilizerState();
    state.spawnTimer = 100;
    tickPatternStabilizer(world, state, FIXED_STEP_S);

    const pos = p.get(Position);
    // angle = π/2, radius = 0.5 * 0.52 = 0.26 → x ≈ 0, z ≈ 0.26
    expect(pos?.x).toBeCloseTo(0, 5);
    expect(pos?.z).toBeCloseTo(0.26, 5);
    expect(pos?.y).toBe(0.4);
  });
});
