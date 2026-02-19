import * as fc from 'fast-check';
import { deriveEnemyTraitSelector, derivePatternSequences, hashSeed, mulberry32 } from '../seed-helpers';

describe('seed-helpers', () => {
  describe('mulberry32', () => {
    it('produces deterministic output for same seed', () => {
      const rng1 = mulberry32(12345);
      const rng2 = mulberry32(12345);
      expect(rng1()).toBe(rng2());
    });

    it('produces different output for different seeds', () => {
      const rng1 = mulberry32(12345);
      const rng2 = mulberry32(54321);
      expect(rng1()).not.toBe(rng2());
    });
  });

  describe('hashSeed', () => {
    it('produces same hash for same string', () => {
      expect(hashSeed('test')).toBe(hashSeed('test'));
    });

    it('produces different hash for different strings', () => {
      expect(hashSeed('test1')).not.toBe(hashSeed('test2'));
    });

    it('produces positive integers', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 64 }), (seed) => {
          const hash = hashSeed(seed);
          expect(hash).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(hash)).toBe(true);
        }),
      );
    });
  });

  describe('derivePatternSequences', () => {
    it('generates requested number of sequences', () => {
      const sequences = derivePatternSequences(12345, ['Q', 'W', 'E'], 5);
      expect(sequences).toHaveLength(5);
    });

    it('generates sequences with 1-5 keys each', () => {
      const sequences = derivePatternSequences(12345, ['Q', 'W', 'E'], 10);
      for (const seq of sequences) {
        expect(seq.length).toBeGreaterThanOrEqual(1);
        expect(seq.length).toBeLessThanOrEqual(5);
      }
    });

    it('only uses keys from patternKeys array', () => {
      const patternKeys = ['Q', 'W', 'E'];
      const sequences = derivePatternSequences(12345, patternKeys, 10);
      for (const seq of sequences) {
        for (const key of seq) {
          expect(patternKeys).toContain(key);
        }
      }
    });

    it('is deterministic for same seed', () => {
      const seq1 = derivePatternSequences(12345, ['Q', 'W', 'E'], 5);
      const seq2 = derivePatternSequences(12345, ['Q', 'W', 'E'], 5);
      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences for different seeds', () => {
      const seq1 = derivePatternSequences(12345, ['Q', 'W', 'E'], 5);
      const seq2 = derivePatternSequences(54321, ['Q', 'W', 'E'], 5);
      expect(seq1).not.toEqual(seq2);
    });

    // Property-based test: validates Requirement 37.4
    it('PBT: pattern sequences are always valid', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          fc.array(fc.string({ minLength: 1, maxLength: 1 }), { minLength: 3, maxLength: 10 }),
          fc.integer({ min: 1, max: 20 }),
          (seed, keys, count) => {
            const sequences = derivePatternSequences(seed, keys, count);
            expect(sequences).toHaveLength(count);
            for (const seq of sequences) {
              expect(seq.length).toBeGreaterThanOrEqual(1);
              expect(seq.length).toBeLessThanOrEqual(5);
              for (const key of seq) {
                expect(keys).toContain(key);
              }
            }
          },
        ),
      );
    });
  });

  describe('deriveEnemyTraitSelector', () => {
    const allTraits = [
      'NeonRaymarcher',
      'TendrilBinder',
      'PlatterCrusher',
      'GlassShatterer',
      'EchoRepeater',
      'LeverSnatcher',
      'SphereCorruptor',
    ] as const;

    it('returns a function', () => {
      const selector = deriveEnemyTraitSelector(12345, 'PlatterCrusher');
      expect(typeof selector).toBe('function');
    });

    it('selector returns valid YukaTrait', () => {
      const selector = deriveEnemyTraitSelector(12345, 'PlatterCrusher');
      const trait = selector();
      expect(allTraits).toContain(trait);
    });

    it('is deterministic for same seed', () => {
      const selector1 = deriveEnemyTraitSelector(12345, 'PlatterCrusher');
      const selector2 = deriveEnemyTraitSelector(12345, 'PlatterCrusher');
      const traits1 = Array.from({ length: 10 }, () => selector1());
      const traits2 = Array.from({ length: 10 }, () => selector2());
      expect(traits1).toEqual(traits2);
    });

    it('produces different distributions for different seeds', () => {
      const selector1 = deriveEnemyTraitSelector(12345, 'PlatterCrusher');
      const selector2 = deriveEnemyTraitSelector(54321, 'PlatterCrusher');
      const traits1 = Array.from({ length: 10 }, () => selector1());
      const traits2 = Array.from({ length: 10 }, () => selector2());
      expect(traits1).not.toEqual(traits2);
    });

    // Property-based test: validates Requirement 37.5 (enemy trait distribution with archetype bias)
    it('PBT: thematic trait appears more frequently (3x weight)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000000 }), fc.constantFrom(...allTraits), (seed, thematicTrait) => {
          const selector = deriveEnemyTraitSelector(seed, thematicTrait);
          const samples = Array.from({ length: 1000 }, () => selector());
          const thematicCount = samples.filter((t) => t === thematicTrait).length;
          const otherCount = samples.length - thematicCount;

          // With 3x weight, thematic trait should appear ~3x more often than any single other trait
          // Expected: thematic = 3/9 = 33.3%, each other = 1/9 = 11.1%
          // Allow 20% variance for statistical fluctuation
          const expectedThematicRatio = 3 / 9;
          const actualThematicRatio = thematicCount / samples.length;
          expect(actualThematicRatio).toBeGreaterThan(expectedThematicRatio * 0.8);
          expect(actualThematicRatio).toBeLessThan(expectedThematicRatio * 1.2);
        }),
      );
    });
  });
});
