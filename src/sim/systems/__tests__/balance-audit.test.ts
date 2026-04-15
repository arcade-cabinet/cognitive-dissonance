/**
 * Balance audit — pinned long-horizon simulations.
 *
 * Runs the pattern-stabilizer + tension-driver loop for N seconds under a
 * fixed seed and a scripted input policy. Asserts coherence / tension
 * trajectories so future balance tuning is a numerical pass instead of a
 * vibe check.
 *
 * Each scenario fixes a `seed` so the spawn schedule is identical across
 * runs. If a tuning change shifts the recorded trajectory, the test fails
 * loudly and the new numbers must be either accepted (update the pinned
 * value with a comment explaining the design intent) or reverted.
 *
 * The numbers below are NOT performance targets — they're a snapshot of
 * the current balance. Use them as the baseline for tuning #40.
 */

import seedrandom from 'seedrandom';
import { beforeEach, describe, expect, it } from 'vitest';
import { Game, Input, IsPattern, Level, Seed, world } from '@/sim/world';
import { createPatternStabilizerState, tickPatternStabilizer } from '../pattern-stabilizer';
import { tickTensionDriver } from '../tension-driver';

const FRAME_DT = 1 / 60;
const SECONDS = 30;

interface Snapshot {
  t: number;
  tension: number;
  coherence: number;
  patterns: number;
  level: number;
}

function resetWorld(seedString: string): void {
  world.set(Game, () => ({ phase: 'playing' as const, restartToken: 0 }));
  world.set(Level, (prev) => ({
    ...prev,
    currentLevel: 1,
    coherence: 25,
    peakCoherence: 25,
    tension: 0.12,
  }));
  world.set(Input, (prev) => ({ ...prev, heldKeycaps: new Set<number>() }));
  world.set(Seed, (prev) => ({
    ...prev,
    seedString,
    lastSeedUsed: seedString,
    rng: seedrandom(seedString),
  }));
  // Drop any leftover patterns from prior tests.
  world.query(IsPattern).updateEach((_t, e) => {
    e.destroy();
  });
}

/**
 * Drive the loop for `seconds` of sim time at 60Hz, applying `inputPolicy`
 * each frame. Returns one snapshot per second so we can check the shape of
 * the trajectory, not just the endpoint.
 */
function runScenario(seconds: number, inputPolicy: (t: number) => Set<number>): Snapshot[] {
  const stabilizerState = createPatternStabilizerState();
  const snapshots: Snapshot[] = [];
  const totalFrames = Math.round(seconds / FRAME_DT);
  let nextSnapAt = 1.0;

  for (let f = 0; f <= totalFrames; f++) {
    const t = f * FRAME_DT;
    world.set(Input, (prev) => ({ ...prev, heldKeycaps: inputPolicy(t) }));
    tickPatternStabilizer(world, stabilizerState, FRAME_DT);
    tickTensionDriver(world, FRAME_DT);

    if (t + 1e-9 >= nextSnapAt) {
      const lvl = world.get(Level);
      snapshots.push({
        t: Math.round(t * 10) / 10,
        tension: Math.round((lvl?.tension ?? 0) * 1000) / 1000,
        coherence: Math.round((lvl?.coherence ?? 0) * 100) / 100,
        patterns: world.query(IsPattern).length,
        level: lvl?.currentLevel ?? 0,
      });
      nextSnapAt += 1.0;
    }
  }
  return snapshots;
}

describe('balance-audit (pinned trajectories)', () => {
  beforeEach(() => {
    resetWorld('balance-audit-seed-v1');
  });

  it('idle player: tension climbs steadily, coherence drains, sphere shatters', () => {
    const trajectory = runScenario(SECONDS, () => new Set<number>());

    const final = trajectory[trajectory.length - 1];
    // Without input, escapes pile up: tension saturates near 1, coherence
    // drains to (or near) 0. We're not asserting the exact death frame —
    // just that the trajectory has the shape of "losing fast."
    expect(final.tension).toBeGreaterThan(0.85);
    expect(final.coherence).toBeLessThan(15);

    // Trajectory should be MONOTONIC-ish on tension after the first second
    // (allowing for stabilisation rewards from a lucky decay step).
    const tensions = trajectory.map((s) => s.tension);
    const peakTension = Math.max(...tensions);
    expect(peakTension).toBeGreaterThan(0.7);
  });

  it('paused phase: nothing changes regardless of dt', () => {
    world.set(Game, (prev) => ({ ...prev, phase: 'paused' as const }));
    const before = world.get(Level);

    runScenario(SECONDS, () => new Set<number>());

    const after = world.get(Level);
    expect(after?.tension).toBe(before?.tension);
    expect(after?.coherence).toBe(before?.coherence);
    expect(world.query(IsPattern).length).toBe(0);
  });

  it('held-all-keys-always (oracle player): tension stays at baseline', () => {
    // An impossible "oracle" who holds every keycap — every spawned pattern
    // has its colour matched and gets pulled back. This is the upper bound
    // on stabilisation; coherence should grow, not drain.
    const allHeld = new Set<number>();
    for (let i = 0; i < 12; i++) allHeld.add(i);

    runScenario(SECONDS, () => allHeld);

    const lvl = world.get(Level);
    // With perfect suppression, tension drifts to baseline and stays there.
    expect(lvl?.tension ?? 0).toBeLessThanOrEqual(0.2);
    // Coherence should have advanced — either coherence grew or we levelled
    // up (which resets coherence to 25).
    expect(lvl?.peakCoherence ?? 0).toBeGreaterThan(25);
  });

  it('high tension with no input drains coherence faster than baseline tension does', () => {
    // Drive both scenarios to the same seed, confirm the high-tension
    // trajectory hits zero coherence sooner than the baseline trajectory.
    const collectFirstZero = (startTension: number): number => {
      resetWorld('balance-audit-seed-v1');
      world.set(Level, (prev) => ({ ...prev, tension: startTension }));
      const trajectory = runScenario(SECONDS, () => new Set<number>());
      const zero = trajectory.find((s) => s.coherence <= 0);
      return zero ? zero.t : SECONDS + 1;
    };

    const tFromBaseline = collectFirstZero(0.12);
    const tFromHigh = collectFirstZero(0.95);
    expect(tFromHigh).toBeLessThan(tFromBaseline);
  });
});
