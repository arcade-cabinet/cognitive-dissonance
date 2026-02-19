// mulberry32 PRNG (deterministic, fast, high-quality)
export function mulberry32(seed: number): () => number {
  return () => {
    // biome-ignore lint/suspicious/noAssignInExpressions: This is the standard mulberry32 PRNG algorithm
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash a seed string to a 32-bit integer
export function hashSeed(seedString: string): number {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Generate pattern sequences from PRNG + phase patternKeys
// Returns array of key sequences (1-5 keys each) for a phase
export function derivePatternSequences(seedHash: number, patternKeys: string[], count: number): string[][] {
  const rng = mulberry32(seedHash);
  return Array.from({ length: count }, () => {
    const len = 1 + Math.floor(rng() * 5); // 1–5 keys per pattern
    return Array.from({ length: len }, () => patternKeys[Math.floor(rng() * patternKeys.length)]);
  });
}

// Derive enemy trait distribution with archetype bias
// Returns a function that selects a YukaTrait with 3x weight for the thematic trait
export function deriveEnemyTraitSelector(
  seedHash: number,
  thematicTrait: string,
): () =>
  | 'NeonRaymarcher'
  | 'TendrilBinder'
  | 'PlatterCrusher'
  | 'GlassShatterer'
  | 'EchoRepeater'
  | 'LeverSnatcher'
  | 'SphereCorruptor' {
  const rng = mulberry32(seedHash);
  const traits = [
    'NeonRaymarcher',
    'TendrilBinder',
    'PlatterCrusher',
    'GlassShatterer',
    'EchoRepeater',
    'LeverSnatcher',
    'SphereCorruptor',
  ] as const;

  // Build weighted array: thematic trait appears 3x
  const weightedTraits: (typeof traits)[number][] = [];
  for (const trait of traits) {
    const weight = trait === thematicTrait ? 3 : 1;
    for (let i = 0; i < weight; i++) {
      weightedTraits.push(trait);
    }
  }

  return () => {
    const index = Math.floor(rng() * weightedTraits.length);
    return weightedTraits[index];
  };
}
