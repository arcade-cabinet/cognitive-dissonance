/**
 * Seeded Pseudo-Random Number Generator
 *
 * Uses mulberry32 algorithm — fast, deterministic, good distribution.
 * Game-state RNG is seeded once per game start for reproducible gameplay.
 * Cosmetic-only randomness (music, particles, UI) still uses Math.random().
 */

let state = 0;

/** Seed the game RNG. Call once at game start. */
export function seedRng(seed: number): void {
  state = seed | 0;
}

/** Get next pseudo-random number in [0, 1). Drop-in replacement for Math.random(). */
export function rng(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Generate a unique deterministic ID for game entities. */
let idCounter = 0;

export function nextId(): number {
  return ++idCounter;
}

/** Reset ID counter. Call on game reset. */
export function resetIds(): void {
  idCounter = 0;
}
