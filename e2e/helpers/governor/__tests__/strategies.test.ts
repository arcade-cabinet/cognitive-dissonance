import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { bestCounterKey, decideAction, evaluateNuke, randomAbilityKey } from '../strategies';
import type { GameSnapshot, ResolvedConfig } from '../types';
import { DEFAULT_CONFIG, NUKE_KEY, resolveConfig } from '../types';

/** Create a snapshot with overrides */
function snapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    panic: 30,
    score: 100,
    time: 10,
    nukeReady: false,
    enemyCounters: [],
    ...overrides,
  };
}

/** Create a config with overrides */
function config(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** Create a fixed RNG that returns values from a sequence */
function fixedRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

// ─── evaluateNuke ─────────────────────────────────────────────

describe('evaluateNuke', () => {
  it('returns nuke action when panic > threshold, nuke ready, specials enabled', () => {
    const result = evaluateNuke(
      snapshot({ panic: 60, nukeReady: true }),
      config({ useSpecials: true, nukeThreshold: 50 })
    );
    expect(result).toEqual({ type: 'press', key: NUKE_KEY });
  });

  it('returns null when panic is below threshold', () => {
    const result = evaluateNuke(
      snapshot({ panic: 40, nukeReady: true }),
      config({ useSpecials: true, nukeThreshold: 50 })
    );
    expect(result).toBeNull();
  });

  it('returns null when panic equals threshold (not exceeded)', () => {
    const result = evaluateNuke(
      snapshot({ panic: 50, nukeReady: true }),
      config({ useSpecials: true, nukeThreshold: 50 })
    );
    expect(result).toBeNull();
  });

  it('returns null when nuke is on cooldown', () => {
    const result = evaluateNuke(
      snapshot({ panic: 80, nukeReady: false }),
      config({ useSpecials: true, nukeThreshold: 50 })
    );
    expect(result).toBeNull();
  });

  it('returns null when useSpecials is disabled', () => {
    const result = evaluateNuke(
      snapshot({ panic: 80, nukeReady: true }),
      config({ useSpecials: false, nukeThreshold: 50 })
    );
    expect(result).toBeNull();
  });

  it('respects custom nukeThreshold', () => {
    const result = evaluateNuke(
      snapshot({ panic: 35, nukeReady: true }),
      config({ useSpecials: true, nukeThreshold: 30 })
    );
    expect(result).toEqual({ type: 'press', key: NUKE_KEY });
  });
});

// ─── randomAbilityKey ─────────────────────────────────────────

describe('randomAbilityKey', () => {
  it('returns F1 when rng returns 0', () => {
    expect(randomAbilityKey(fixedRng([0]))).toBe('F1');
  });

  it('returns F2 when rng returns ~0.5', () => {
    expect(randomAbilityKey(fixedRng([0.5]))).toBe('F2');
  });

  it('returns F3 when rng returns ~0.9', () => {
    expect(randomAbilityKey(fixedRng([0.9]))).toBe('F3');
  });

  it('always returns a valid ability key', () => {
    const rng = createRng(42);
    const validKeys = new Set(['F1', 'F2', 'F3']);
    for (let i = 0; i < 100; i++) {
      expect(validKeys.has(randomAbilityKey(rng))).toBe(true);
    }
  });
});

// ─── bestCounterKey ───────────────────────────────────────────

describe('bestCounterKey', () => {
  it('returns F1 for majority reality enemies', () => {
    expect(bestCounterKey(['reality', 'reality', 'logic'])).toBe('F1');
  });

  it('returns F2 for majority history enemies', () => {
    expect(bestCounterKey(['history', 'history', 'reality'])).toBe('F2');
  });

  it('returns F3 for majority logic enemies', () => {
    expect(bestCounterKey(['logic', 'logic', 'logic', 'history'])).toBe('F3');
  });

  it('handles single enemy', () => {
    expect(bestCounterKey(['reality'])).toBe('F1');
    expect(bestCounterKey(['history'])).toBe('F2');
    expect(bestCounterKey(['logic'])).toBe('F3');
  });

  it('returns first max on tie', () => {
    // With equal counts, Object.entries iteration order determines winner.
    // The result should be deterministic regardless.
    const result = bestCounterKey(['reality', 'history']);
    expect(['F1', 'F2']).toContain(result);
  });

  it('handles large enemy list', () => {
    const enemies = Array(50).fill('logic').concat(Array(30).fill('reality'));
    expect(bestCounterKey(enemies)).toBe('F3');
  });
});

// ─── decideAction ─────────────────────────────────────────────

describe('decideAction', () => {
  it('returns nuke when panic is critical and nuke ready (highest priority)', () => {
    const action = decideAction(
      snapshot({ panic: 80, nukeReady: true, enemyCounters: ['reality'] }),
      config({ useSpecials: true, nukeThreshold: 50 }),
      fixedRng([0.5])
    );
    expect(action).toEqual({ type: 'press', key: NUKE_KEY });
  });

  it('returns random key when accuracy check fails', () => {
    // RNG values: 0.95 (> accuracy 0.8 → miss), 0.1 (→ F1 random pick)
    const action = decideAction(
      snapshot({ enemyCounters: ['logic', 'logic'] }),
      config({ accuracy: 0.8 }),
      fixedRng([0.95, 0.1])
    );
    expect(action.type).toBe('press');
    expect(['F1', 'F2', 'F3']).toContain((action as { key: string }).key);
  });

  it('returns best counter when enemies present and accuracy passes', () => {
    // RNG: 0.3 (< accuracy 0.8 → pass), 0.3 (< aggressiveness 0.7 → act)
    const action = decideAction(
      snapshot({ enemyCounters: ['history', 'history', 'reality'] }),
      config({ accuracy: 0.8, aggressiveness: 0.7 }),
      fixedRng([0.3, 0.3])
    );
    expect(action).toEqual({ type: 'press', key: 'F2' });
  });

  it('returns wait when aggressiveness gate fails', () => {
    // RNG: 0.3 (< accuracy → pass), 0.9 (> aggressiveness 0.7 → wait)
    const action = decideAction(
      snapshot({ enemyCounters: ['reality'] }),
      config({ accuracy: 0.8, aggressiveness: 0.7 }),
      fixedRng([0.3, 0.9])
    );
    expect(action).toEqual({ type: 'wait' });
  });

  it('falls back to random key when no enemies', () => {
    // RNG: 0.3 (< accuracy → pass), 0.1 (random key F1), 0.3 (< aggressiveness → act)
    const action = decideAction(
      snapshot({ enemyCounters: [] }),
      config({ accuracy: 0.8, aggressiveness: 0.7 }),
      fixedRng([0.3, 0.1, 0.3])
    );
    expect(action.type).toBe('press');
    expect(['F1', 'F2', 'F3']).toContain((action as { key: string }).key);
  });

  it('nuke takes priority over counter even with enemies', () => {
    const action = decideAction(
      snapshot({
        panic: 90,
        nukeReady: true,
        enemyCounters: ['reality', 'reality', 'reality'],
      }),
      config({ useSpecials: true, nukeThreshold: 50 }),
      fixedRng([0.5])
    );
    expect(action).toEqual({ type: 'press', key: NUKE_KEY });
  });

  it('skips nuke when specials disabled, proceeds to counter', () => {
    // RNG: 0.3 (< accuracy → pass), 0.3 (< aggressiveness → act)
    const action = decideAction(
      snapshot({
        panic: 90,
        nukeReady: true,
        enemyCounters: ['logic', 'logic'],
      }),
      config({ useSpecials: false, accuracy: 0.8, aggressiveness: 0.7 }),
      fixedRng([0.3, 0.3])
    );
    expect(action).toEqual({ type: 'press', key: 'F3' });
  });

  it('works with seeded RNG for deterministic outcomes', () => {
    const snap = snapshot({ enemyCounters: ['reality', 'history', 'logic'] });
    const cfg = config();

    const result1 = decideAction(snap, cfg, createRng(42));
    const result2 = decideAction(snap, cfg, createRng(42));

    expect(result1).toEqual(result2);
  });

  it('with 100% accuracy and 100% aggressiveness always counters', () => {
    const rng = createRng(1);
    const cfg = config({ accuracy: 1, aggressiveness: 1 });
    const snap = snapshot({ enemyCounters: ['reality'] });

    for (let i = 0; i < 20; i++) {
      const action = decideAction(snap, cfg, rng);
      // Should always press F1 (reality counter) — never wait, never miss
      expect(action).toEqual({ type: 'press', key: 'F1' });
    }
  });

  it('with 0% aggressiveness always waits (unless nuke)', () => {
    // RNG: 0.3 (< accuracy), 0.999 (> aggressiveness 0 is impossible with < check)
    // Wait: aggressiveness 0 means rng() < 0 is always false → always wait
    const cfg = config({ accuracy: 1, aggressiveness: 0 });
    const snap = snapshot({ enemyCounters: ['reality'] });
    const rng = createRng(1);

    for (let i = 0; i < 20; i++) {
      const action = decideAction(snap, cfg, rng);
      expect(action).toEqual({ type: 'wait' });
    }
  });
});

// ─── resolveConfig ────────────────────────────────────────────

describe('resolveConfig', () => {
  it('applies all defaults when no config provided', () => {
    const { resolved, seed } = resolveConfig();
    expect(resolved).toEqual(DEFAULT_CONFIG);
    expect(seed).toBe(42);
  });

  it('preserves provided values', () => {
    const { resolved, seed } = resolveConfig({
      aggressiveness: 0.5,
      accuracy: 0.3,
      seed: 123,
      nukeThreshold: 75,
    });
    expect(resolved.aggressiveness).toBe(0.5);
    expect(resolved.accuracy).toBe(0.3);
    expect(resolved.nukeThreshold).toBe(75);
    expect(seed).toBe(123);
    // Defaults still applied for unspecified
    expect(resolved.reactionTime).toBe(300);
    expect(resolved.useSpecials).toBe(true);
  });
});
