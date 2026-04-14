/**
 * Koota actions — discrete, synchronous mutations on the world.
 *
 * These wrap the former Zustand stores' action APIs so the migration from
 * `useLevelStore.getState().setTension(x)` to `setTension(x)` is mechanical.
 * Components that need reactive reads continue to use `useTrait(world, Level)`
 // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
 * etc.; callers inside render loops should use `world.get(Level)!` (cheap,
 * non-reactive snapshot).
 *
 * Koota's `world.set(Trait, value)` requires the FULL trait record. Use the
 * callback form `world.set(Trait, (prev) => ({ ...prev, foo: 1 }))` for
 * partial updates.
 */

import seedrandom from 'seedrandom';
import { Audio, Game, type GamePhase, Input, Level, Seed, world } from './world';

// ─── Game phase ───────────────────────────────────────────────────────────────

export function setPhase(phase: GamePhase): void {
  world.set(Game, (prev): { phase: GamePhase; restartToken: number } => ({ ...prev, phase }));
}

export function togglePause(): void {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const { phase } = world.get(Game)!;
  if (phase === 'playing') world.set(Game, (prev) => ({ ...prev, phase: 'paused' as const }));
  else if (phase === 'paused') world.set(Game, (prev) => ({ ...prev, phase: 'playing' as const }));
}

/** Restart: set phase back to 'title'. */
export function restart(): void {
  world.set(Game, (prev) => ({ ...prev, phase: 'title' as const }));
}

/** Trigger a restart from game-over: flip to 'playing' and bump the token
 *  so components watching restartToken can recreate per-run resources. */
export function triggerRestart(): void {
  world.set(Game, (prev) => ({
    ...prev,
    phase: 'playing' as const,
    restartToken: prev.restartToken + 1,
  }));
}

// ─── Level / tension / coherence ─────────────────────────────────────────────

export function advanceLevel(): void {
  world.set(Level, (prev) => ({
    ...prev,
    currentLevel: prev.currentLevel + 1,
    coherence: Math.min(100, prev.coherence + 8),
  }));
}

export function addCoherence(amount: number): void {
  world.set(Level, (prev) => {
    const next = Math.max(0, Math.min(100, prev.coherence + amount));
    return {
      ...prev,
      coherence: next,
      peakCoherence: Math.max(prev.peakCoherence, next),
    };
  });
}

export function setTension(value: number): void {
  world.set(Level, (prev) => ({
    ...prev,
    tension: Math.max(0, Math.min(1, value)),
  }));
}

export function resetLevel(): void {
  world.set(Level, {
    currentLevel: 1,
    coherence: 25,
    peakCoherence: 25,
    tension: 0.12,
  });
}

// ─── Seed / RNG ──────────────────────────────────────────────────────────────

export function generateNewSeed(): void {
  const rawSeed = Math.random().toString(36).slice(2) + Date.now().toString(36);
  world.set(Seed, {
    seedString: rawSeed,
    lastSeedUsed: rawSeed,
    rng: seedrandom(rawSeed),
  });
}

export function replayLastSeed(): void {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const cur = world.get(Seed)!;
  if (!cur.lastSeedUsed) {
    generateNewSeed();
    return;
  }
  world.set(Seed, {
    seedString: cur.lastSeedUsed,
    lastSeedUsed: cur.lastSeedUsed,
    rng: seedrandom(cur.lastSeedUsed),
  });
}

// ─── Input (keycap press state) ──────────────────────────────────────────────

export function pressKeycap(index: number): void {
  world.set(Input, (prev) => {
    if (prev.heldKeycaps.has(index)) return prev;
    const next = new Set(prev.heldKeycaps);
    next.add(index);
    return { ...prev, heldKeycaps: next };
  });
}

export function releaseKeycap(index: number): void {
  world.set(Input, (prev) => {
    if (!prev.heldKeycaps.has(index)) return prev;
    const next = new Set(prev.heldKeycaps);
    next.delete(index);
    return { ...prev, heldKeycaps: next };
  });
}

export function releaseAllKeycaps(): void {
  world.set(Input, (prev) => {
    if (prev.heldKeycaps.size === 0) return prev;
    return { ...prev, heldKeycaps: new Set<number>() };
  });
}

// ─── Audio ───────────────────────────────────────────────────────────────────

export function updateAudioTension(newTension: number): void {
  world.set(Audio, (prev) => ({ ...prev, tension: newTension }));
  // BPM adjustment happens inside the audio system — this action just
  // reports the value; the system subscribes to Audio.tension via useTrait
  // or reads world.get(Audio).tension each tick.
}
