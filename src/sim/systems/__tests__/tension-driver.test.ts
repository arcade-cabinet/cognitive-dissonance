import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game, Level, world } from '@/sim/world';
import { tickTensionDriver } from '../tension-driver';

const TENSION_BASELINE = 0.12;

function resetWorld(): void {
  world.set(Game, () => ({ phase: 'playing' as const, restartToken: 0 }));
  world.set(Level, (prev) => ({
    ...prev,
    currentLevel: 1,
    coherence: 25,
    peakCoherence: 25,
    tension: TENSION_BASELINE,
  }));
}

describe('tension-driver', () => {
  beforeEach(() => {
    resetWorld();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when phase is not playing', () => {
    world.set(Game, (prev) => ({ ...prev, phase: 'title' as const }));
    world.set(Level, (prev) => ({ ...prev, tension: 0.9, coherence: 50 }));

    tickTensionDriver(world, 1.0);

    const lvl = world.get(Level);
    expect(lvl?.tension).toBe(0.9);
    expect(lvl?.coherence).toBe(50);
  });

  it('drifts elevated tension back toward baseline over time', () => {
    world.set(Level, (prev) => ({ ...prev, tension: 0.5 }));

    tickTensionDriver(world, 1.0);

    // IDLE_TENSION_DECAY = 0.04/s, so after 1s we move 0.04 toward 0.12 from 0.5 → 0.46.
    expect(world.get(Level)?.tension).toBeCloseTo(0.46, 5);
  });

  it('drifts depressed tension back up toward baseline', () => {
    world.set(Level, (prev) => ({ ...prev, tension: 0.04 }));

    tickTensionDriver(world, 1.0);

    // 0.04 + 0.04 = 0.08, still below baseline.
    expect(world.get(Level)?.tension).toBeCloseTo(0.08, 5);
  });

  it('does not overshoot the baseline when drift is large', () => {
    world.set(Level, (prev) => ({ ...prev, tension: 0.13 }));

    tickTensionDriver(world, 10.0);

    // Drift to baseline is 0.01; max possible step is 0.4. We must clamp.
    expect(world.get(Level)?.tension).toBeCloseTo(TENSION_BASELINE, 5);
  });

  it('drains coherence when tension exceeds the high threshold', () => {
    world.set(Level, (prev) => ({ ...prev, tension: 1.0, coherence: 50 }));

    tickTensionDriver(world, 1.0);

    // Decay runs first: 1.0 → 0.96. Drain uses the post-decay tension:
    // overage = (0.96 - 0.75) / 0.25 = 0.84; drain = 2 * 0.84 * 1s = 1.68
    // → coherence = 50 - 1.68 = 48.32
    const lvl = world.get(Level);
    expect(lvl?.tension).toBeCloseTo(0.96, 5);
    expect(lvl?.coherence).toBeCloseTo(48.32, 5);
  });

  it('does not drain coherence when tension is at or below the threshold', () => {
    world.set(Level, (prev) => ({ ...prev, tension: 0.75, coherence: 50 }));

    tickTensionDriver(world, 1.0);

    expect(world.get(Level)?.coherence).toBe(50);
  });

  it('advances level and resets coherence at 100', () => {
    world.set(Level, (prev) => ({ ...prev, coherence: 100, currentLevel: 3 }));
    const dispatched: CustomEvent[] = [];
    const spy = vi.spyOn(window, 'dispatchEvent').mockImplementation((e) => {
      dispatched.push(e as CustomEvent);
      return true;
    });

    tickTensionDriver(world, 0.016);

    const lvl = world.get(Level);
    expect(lvl?.currentLevel).toBe(4);
    expect(lvl?.coherence).toBe(25);
    expect(lvl?.tension).toBe(TENSION_BASELINE);

    const evt = dispatched.find((e) => e.type === 'coherenceMaintained');
    expect(evt).toBeDefined();
    expect((evt as CustomEvent).detail).toMatchObject({ level: 4 });

    spy.mockRestore();
  });

  it('tracks peakCoherence as the running maximum', () => {
    world.set(Level, (prev) => ({ ...prev, coherence: 80, peakCoherence: 60 }));

    tickTensionDriver(world, 0.016);

    expect(world.get(Level)?.peakCoherence).toBe(80);
  });

  it('triggers gameover and dispatches gameOver event when coherence hits zero', () => {
    world.set(Level, (prev) => ({ ...prev, coherence: 1, tension: 1.0, currentLevel: 5, peakCoherence: 60 }));
    const dispatched: CustomEvent[] = [];
    const spy = vi.spyOn(window, 'dispatchEvent').mockImplementation((e) => {
      dispatched.push(e as CustomEvent);
      return true;
    });

    tickTensionDriver(world, 1.0);

    const lvl = world.get(Level);
    expect(lvl?.coherence).toBe(0);
    expect(world.get(Game)?.phase).toBe('gameover');

    const evt = dispatched.find((e) => e.type === 'gameOver');
    expect(evt).toBeDefined();
    expect((evt as CustomEvent).detail).toMatchObject({ peakCoherence: 60, currentLevel: 5 });

    spy.mockRestore();
  });
});
