export interface FixedStepState {
  accumulator: number;
}

/**
 * Advances deterministic fixed-timestep simulation steps independent of render FPS.
 */
export function runFixedSteps(
  state: FixedStepState,
  dtSeconds: number,
  stepSeconds: number,
  runStep: (stepSeconds: number) => void,
  maxStepsPerFrame = 8,
): void {
  if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
    throw new Error(`runFixedSteps requires stepSeconds to be a finite positive number. Received: ${stepSeconds}`);
  }

  state.accumulator += dtSeconds;

  let steps = 0;
  while (state.accumulator >= stepSeconds && steps < maxStepsPerFrame) {
    runStep(stepSeconds);
    state.accumulator -= stepSeconds;
    steps += 1;
  }

  // Prevent spiral-of-death on tab wakeups.
  if (steps === maxStepsPerFrame && state.accumulator > stepSeconds * maxStepsPerFrame) {
    state.accumulator = stepSeconds * maxStepsPerFrame;
  }
}

export function spawnIntervalSeconds(tension: number, rng: () => number, min = 0.12, max = 1.4): number {
  const clamped = Math.max(0, Math.min(1, tension));
  const base = max - clamped * (max - min);
  // Deterministic jitter from seed RNG
  const jitter = 0.8 + rng() * 0.4;
  return Math.min(max, Math.max(min, base * jitter));
}
