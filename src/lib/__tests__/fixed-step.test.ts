import { describe, expect, it } from 'vitest';
import { runFixedSteps, spawnIntervalSeconds } from '../fixed-step';

describe('fixed-step', () => {
  it('runs deterministic number of steps for accumulated dt', () => {
    const s = { accumulator: 0 };
    let count = 0;

    runFixedSteps(s, 0.1, 1 / 30, () => {
      count += 1;
    });

    expect(count).toBe(3);
    expect(s.accumulator).toBeGreaterThanOrEqual(0);
    expect(s.accumulator).toBeLessThan(1 / 30);
  });

  it('caps runaway catch-up steps', () => {
    const s = { accumulator: 0 };
    let count = 0;

    runFixedSteps(
      s,
      10,
      1 / 60,
      () => {
        count += 1;
      },
      5,
    );

    expect(count).toBe(5);
    expect(s.accumulator).toBeLessThanOrEqual((1 / 60) * 5);
  });

  it('spawnIntervalSeconds gets faster at higher tension', () => {
    const seeded = () => 0.5;
    const low = spawnIntervalSeconds(0.1, seeded);
    const high = spawnIntervalSeconds(0.9, seeded);

    expect(high).toBeLessThan(low);
  });

  it('throws when stepSeconds is not finite positive', () => {
    const s = { accumulator: 0 };

    expect(() => runFixedSteps(s, 0.016, 0, () => {})).toThrowError(
      'runFixedSteps requires stepSeconds to be a finite positive number',
    );
    expect(() => runFixedSteps(s, 0.016, Number.NaN, () => {})).toThrowError(
      'runFixedSteps requires stepSeconds to be a finite positive number',
    );
  });
});
