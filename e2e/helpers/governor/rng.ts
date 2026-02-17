/**
 * Mulberry32 Seeded PRNG
 *
 * Deterministic pseudo-random number generator for reproducible E2E runs.
 * Same algorithm as src/lib/rng.ts but isolated for the governor subpackage.
 */

/** Create a seeded PRNG using the mulberry32 algorithm */
export function createRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
