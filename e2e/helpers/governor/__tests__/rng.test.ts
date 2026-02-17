import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';

describe('createRng (Mulberry32)', () => {
  it('produces deterministic output for a given seed', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    const seq1 = Array.from({ length: 20 }, () => rng1());
    const seq2 = Array.from({ length: 20 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = createRng(1);
    const rng2 = createRng(2);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it('always returns values in [0, 1)', () => {
    const rng = createRng(12345);
    for (let i = 0; i < 10000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('has reasonable distribution (no extreme bias)', () => {
    const rng = createRng(999);
    const buckets = [0, 0, 0, 0, 0]; // 5 buckets: [0-0.2), [0.2-0.4), etc.
    const n = 10000;

    for (let i = 0; i < n; i++) {
      const bucket = Math.min(4, Math.floor(rng() * 5));
      buckets[bucket]++;
    }

    // Each bucket should have ~20% of values. Allow ±5% tolerance.
    const expected = n / 5;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(expected * 0.8);
      expect(count).toBeLessThan(expected * 1.2);
    }
  });

  it('handles seed 0', () => {
    const rng = createRng(0);
    const val = rng();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it('handles negative seeds', () => {
    const rng = createRng(-42);
    const seq = Array.from({ length: 5 }, () => rng());
    for (const val of seq) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('produces unique values in sequence (no stuck state)', () => {
    const rng = createRng(7);
    const values = new Set<number>();
    for (let i = 0; i < 100; i++) {
      values.add(rng());
    }
    // With 100 calls, we should have at least 99 unique values
    expect(values.size).toBeGreaterThanOrEqual(99);
  });
});
