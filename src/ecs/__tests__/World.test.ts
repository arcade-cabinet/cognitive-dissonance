import * as fc from 'fast-check';
import { hashSeed } from '../../utils/seed-helpers';
import { spawnDreamFromSeed, world } from '../World';

describe('ECS World', () => {
  afterEach(() => {
    // Clean up all entities after each test
    for (const entity of world.entities) {
      world.remove(entity);
    }
  });

  describe('Unit Tests', () => {
    // Use seed strings that produce specific archetype indices via hashSeed() % 4
    // hashSeed("d") = 100 % 4 = 0 (PlatterRotationDream)
    // hashSeed("a") = 97  % 4 = 1 (LeverTensionDream)
    // hashSeed("b") = 98  % 4 = 2 (KeySequenceDream)
    // hashSeed("c") = 99  % 4 = 3 (CrystallineCubeBossDream)

    it('creates PlatterRotationDream archetype (seedHash % 4 === 0)', () => {
      const entity = spawnDreamFromSeed('d');
      expect(entity.level).toBe(true);
      expect(entity.platterCore).toBe(true);
      expect(entity.rotationAxis).toBe(true);
      expect(entity.rotationRPM).toBeGreaterThanOrEqual(2);
      expect(entity.rotationRPM).toBeLessThanOrEqual(8);
    });

    it('creates LeverTensionDream archetype (seedHash % 4 === 1)', () => {
      const entity = spawnDreamFromSeed('a');
      expect(entity.level).toBe(true);
      expect(entity.leverCore).toBe(true);
      expect(entity.slitAnimation).toBe(true);
      expect(entity.slitPeriod).toBeGreaterThanOrEqual(1.5);
      expect(entity.slitPeriod).toBeLessThanOrEqual(4.0);
    });

    it('creates KeySequenceDream archetype (seedHash % 4 === 2)', () => {
      const entity = spawnDreamFromSeed('b');
      expect(entity.level).toBe(true);
      expect(entity.keycapPatterns).toBeDefined();
      expect(entity.stabilizationHoldTime).toBeGreaterThanOrEqual(800);
      expect(entity.stabilizationHoldTime).toBeLessThanOrEqual(2000);
    });

    it('creates CrystallineCubeBossDream archetype (seedHash % 4 === 3)', () => {
      const entity = spawnDreamFromSeed('c');
      expect(entity.level).toBe(true);
      expect(entity.boss).toBe(true);
      expect(entity.cubeCrystalline).toBe(true);
      expect(entity.slamCycles).toBe(3);
    });

    it('includes phases array with 3 phases', () => {
      const entity = spawnDreamFromSeed('d');
      expect(entity.phases).toBeDefined();
      expect(entity.phases?.length).toBe(3);
      expect(entity.phases?.[0].tension).toBe(0.0);
      expect(entity.phases?.[1].tension).toBe(0.4);
      expect(entity.phases?.[2].tension).toBe(0.8);
    });

    it('includes tensionCurve config', () => {
      const entity = spawnDreamFromSeed('d');
      expect(entity.tensionCurve).toBeDefined();
      expect(entity.tensionCurve?.increaseRate).toBeGreaterThan(0);
      expect(entity.tensionCurve?.decreaseRate).toBeGreaterThan(0);
      expect(entity.tensionCurve?.overStabilizationThreshold).toBeGreaterThan(0);
    });

    it('includes difficultyConfig', () => {
      const entity = spawnDreamFromSeed('d');
      expect(entity.difficultyConfig).toBeDefined();
      expect(entity.difficultyConfig?.k).toBeGreaterThan(0);
      expect(entity.difficultyConfig?.timeScale).toBeGreaterThan(0);
      expect(entity.difficultyConfig?.dampingCoeff).toBeGreaterThanOrEqual(0.7);
      expect(entity.difficultyConfig?.dampingCoeff).toBeLessThanOrEqual(0.9);
    });

    it('includes audioParams', () => {
      const entity = spawnDreamFromSeed('d');
      expect(entity.audioParams).toBeDefined();
      expect(entity.audioParams?.bpm).toBeGreaterThanOrEqual(60);
      expect(entity.audioParams?.bpm).toBeLessThanOrEqual(139);
      expect(entity.audioParams?.swing).toBeGreaterThanOrEqual(0);
      expect(entity.audioParams?.swing).toBeLessThanOrEqual(0.29);
      expect(entity.audioParams?.rootNote).toBeGreaterThanOrEqual(0);
      expect(entity.audioParams?.rootNote).toBeLessThanOrEqual(11);
    });
  });

  describe('Property-Based Tests', () => {
    // P3: Seed Determinism
    it('same seed always produces same Level_Archetype', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 64 }), (seed) => {
          const entity1 = spawnDreamFromSeed(seed);
          const entity2 = spawnDreamFromSeed(seed);

          // Same archetype type
          expect(entity1.platterCore).toBe(entity2.platterCore);
          expect(entity1.leverCore).toBe(entity2.leverCore);
          expect(entity1.keycapPatterns).toEqual(entity2.keycapPatterns);
          expect(entity1.boss).toBe(entity2.boss);

          // Same procedural parameters
          expect(entity1.audioParams?.bpm).toBe(entity2.audioParams?.bpm);
          expect(entity1.audioParams?.swing).toBe(entity2.audioParams?.swing);
          expect(entity1.audioParams?.rootNote).toBe(entity2.audioParams?.rootNote);

          // Clean up
          world.remove(entity1);
          world.remove(entity2);
        }),
      );
    });

    // P9: Seed-to-Archetype Mapping Completeness
    it('seedHash modulo 4 maps to exactly one archetype', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 64 }), (seed) => {
          const entity = spawnDreamFromSeed(seed);
          const seedHash = hashSeed(seed);
          const archetypeIndex = seedHash % 4;

          switch (archetypeIndex) {
            case 0:
              expect(entity.platterCore).toBe(true);
              expect(entity.rotationAxis).toBe(true);
              break;
            case 1:
              expect(entity.leverCore).toBe(true);
              expect(entity.slitAnimation).toBe(true);
              break;
            case 2:
              expect(entity.keycapPatterns).toBeDefined();
              break;
            case 3:
              expect(entity.boss).toBe(true);
              expect(entity.cubeCrystalline).toBe(true);
              break;
          }

          world.remove(entity);
        }),
      );
    });

    // P17: Seed-to-Entity Component Completeness
    it('all required component fields are populated for any seed', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 64 }), (seed) => {
          const entity = spawnDreamFromSeed(seed);
          const seedHash = hashSeed(seed);

          // Required fields for all archetypes
          expect(entity.level).toBe(true);
          expect(entity.buriedSeedHash).toBe(seedHash);
          expect(entity.phases).toBeDefined();
          expect(entity.phases?.length).toBeGreaterThan(0);
          expect(entity.tensionCurve).toBeDefined();
          expect(entity.difficultyConfig).toBeDefined();
          expect(entity.audioParams).toBeDefined();

          // No null or undefined component fields
          expect(entity.phases).not.toBeNull();
          expect(entity.tensionCurve).not.toBeNull();
          expect(entity.difficultyConfig).not.toBeNull();
          expect(entity.audioParams).not.toBeNull();

          world.remove(entity);
        }),
      );
    });

    // P16: Seed Audio Parameter Ranges
    it('audio parameters are within expected ranges for any seed', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 64 }), (seed) => {
          const entity = spawnDreamFromSeed(seed);

          expect(entity.audioParams?.bpm).toBeGreaterThanOrEqual(60);
          expect(entity.audioParams?.bpm).toBeLessThanOrEqual(139);
          expect(entity.audioParams?.swing).toBeGreaterThanOrEqual(0);
          expect(entity.audioParams?.swing).toBeLessThanOrEqual(0.29);
          expect(entity.audioParams?.rootNote).toBeGreaterThanOrEqual(0);
          expect(entity.audioParams?.rootNote).toBeLessThanOrEqual(11);

          world.remove(entity);
        }),
      );
    });
  });
});
