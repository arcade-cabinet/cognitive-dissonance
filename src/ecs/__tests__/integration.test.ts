/**
 * Integration Tests — DreamSequencer -> ArchetypeActivation Flow
 *
 * Tests the full flow from DreamSequencer through ArchetypeActivationSystem
 * to primitive entity configuration in the Miniplex ECS world.
 */

import type { Scene } from '@babylonjs/core/scene';
import { ArchetypeActivationSystem } from '../ArchetypeActivationSystem';
import { ARCHETYPE_METADATA } from '../components';
import type { ArchetypeType } from '../components';
import {
  spawnKeycapEntities,
  spawnLeverEntity,
  spawnPlatterEntity,
  spawnSphereEntity,
  spawnCrystallineCubeEntity,
  spawnMorphCubeEntity,
} from '../primitives';
import { world } from '../World';
import { DreamSequencer } from '../../sequences/DreamSequencer';

// ── Mock performance.now() for consistent timing ──

let mockNow = 0;

beforeAll(() => {
  jest.spyOn(performance, 'now').mockImplementation(() => mockNow);
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ── Mock scene ──

const mockScene = { metadata: {} } as unknown as Scene;

// ── Mock mesh factory ──

function createMockMesh(name: string) {
  return {
    dispose: jest.fn(),
    name,
    position: { x: 0, y: 0, z: 0 },
  };
}

// ── Keycap letters ──

const KEYCAP_LETTERS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];

describe('DreamSequencer -> ArchetypeActivation integration', () => {
  let dreamSequencer: DreamSequencer;
  let archetypeActivation: ArchetypeActivationSystem;

  beforeEach(() => {
    mockNow = 0;

    // Reset singletons
    (DreamSequencer as any).instance = null;
    (ArchetypeActivationSystem as any).instance = null;

    // Clear all entities from world
    for (const e of [...world.entities]) {
      world.remove(e);
    }

    // Get fresh singleton instances
    dreamSequencer = DreamSequencer.getInstance();
    archetypeActivation = ArchetypeActivationSystem.getInstance();

    // Spawn 14 keycap entities
    const keycapMeshes = KEYCAP_LETTERS.map((letter) => createMockMesh(`keycap-${letter}`));
    spawnKeycapEntities(world, keycapMeshes);

    // Spawn lever, platter, sphere, crystalline cube, morph cube
    spawnLeverEntity(world, createMockMesh('lever'));
    spawnPlatterEntity(world, createMockMesh('platter'));
    spawnSphereEntity(world, createMockMesh('sphere'));
    spawnCrystallineCubeEntity(world, createMockMesh('crystalline-cube'));
    spawnMorphCubeEntity(world, createMockMesh('morph-cube'));
  });

  afterEach(() => {
    archetypeActivation.dispose();
    // Clear all entities from world
    for (const e of [...world.entities]) {
      world.remove(e);
    }
  });

  // ── Test a ──

  it('DreamSequencer.selectNextDream() returns valid archetype for ArchetypeActivation', () => {
    dreamSequencer.startSession('test-seed');
    const result = dreamSequencer.selectNextDream();

    // Verify archetypeType is in ARCHETYPE_METADATA
    expect(ARCHETYPE_METADATA[result.archetypeType]).toBeDefined();

    // Activate the archetype
    archetypeActivation.activate(result.archetypeType, result.seedHash, mockScene);

    // Verify archetype is active and matches
    const active = archetypeActivation.getActiveArchetype();
    expect(active).not.toBeNull();
    expect(active!.type).toBe(result.archetypeType);
  });

  // ── Test b ──

  it('Full 8-Dream cycle activates without errors', () => {
    dreamSequencer.startSession('cycle-seed');

    for (let i = 0; i < 8; i++) {
      const result = dreamSequencer.selectNextDream();
      archetypeActivation.activate(result.archetypeType, result.seedHash, mockScene);

      // Verify activation succeeded
      expect(archetypeActivation.getActiveArchetype()).not.toBeNull();

      mockNow += 60000; // Advance 60s per Dream
      dreamSequencer.recordDreamCompletion(0.5);
      archetypeActivation.deactivate();
    }

    const stats = dreamSequencer.getStats();
    expect(stats.totalDreams).toBe(8);
  });

  // ── Test c ──

  it('Primitive entities get configured by ArchetypeActivation', () => {
    dreamSequencer.startSession('config-seed');
    const result = dreamSequencer.selectNextDream();
    archetypeActivation.activate(result.archetypeType, result.seedHash, mockScene);

    const slots = archetypeActivation.getActiveSlots();
    expect(slots).not.toBeNull();

    // Check keycap configuration matches slots
    const keycapEntities = world.with('keycap');
    const activeKeycaps = keycapEntities.entities.filter((e) => e.keycap?.active === true);

    // The number of active keycaps should match the keycapSubset length
    expect(activeKeycaps.length).toBe(slots!.keycapSubset.length);

    // Each active keycap's letter should be in the keycapSubset
    for (const e of activeKeycaps) {
      expect(slots!.keycapSubset).toContain(e.keycap!.letter);
    }

    // Platter active state should match slots
    const platterEntities = world.with('platter');
    expect(platterEntities.entities.length).toBe(1);
    expect(platterEntities.entities[0].platter!.active).toBe(slots!.platterActive);
  });

  // ── Test d ──

  it('Deactivate resets all primitive entities to inactive', () => {
    dreamSequencer.startSession('deactivate-seed');
    const result = dreamSequencer.selectNextDream();
    archetypeActivation.activate(result.archetypeType, result.seedHash, mockScene);

    // Verify at least something was activated (system configures primitives)
    const activeArchetype = archetypeActivation.getActiveArchetype();
    expect(activeArchetype).not.toBeNull();

    // Deactivate
    archetypeActivation.deactivate();

    // Verify ALL keycaps are inactive
    const keycapEntities = world.with('keycap');
    for (const entity of keycapEntities) {
      expect(entity.keycap!.active).toBe(false);
    }

    // Verify lever is inactive
    const leverEntities = world.with('lever');
    for (const entity of leverEntities) {
      expect(entity.lever!.active).toBe(false);
    }

    // Verify platter is inactive
    const platterEntities = world.with('platter');
    for (const entity of platterEntities) {
      expect(entity.platter!.active).toBe(false);
    }

    // Verify sphere is inactive
    const sphereEntities = world.with('sphere');
    for (const entity of sphereEntities) {
      expect(entity.sphere!.active).toBe(false);
    }

    // Verify crystalline cube is inactive
    const crystallineEntities = world.with('crystallineCube');
    for (const entity of crystallineEntities) {
      expect(entity.crystallineCube!.active).toBe(false);
    }

    // Verify morph cube is inactive
    const morphEntities = world.with('morphCube');
    for (const entity of morphEntities) {
      expect(entity.morphCube!.active).toBe(false);
    }
  });

  // ── Test e ──

  it('Consecutive Dreams configure different primitive states', () => {
    dreamSequencer.startSession('consecutive-seed');

    // Dream 1 (opening)
    const result1 = dreamSequencer.selectNextDream();
    archetypeActivation.activate(result1.archetypeType, result1.seedHash, mockScene);

    const slots1 = archetypeActivation.getActiveSlots()!;
    const keycapSubset1 = [...slots1.keycapSubset];
    const platterActive1 = slots1.platterActive;
    const leverActive1 = slots1.leverActive;
    const sphereActive1 = slots1.sphereActive;

    mockNow += 60000;
    dreamSequencer.recordDreamCompletion(0.5);
    archetypeActivation.deactivate();

    // Dream 2 (still opening, but different archetype/seed)
    const result2 = dreamSequencer.selectNextDream();
    archetypeActivation.activate(result2.archetypeType, result2.seedHash, mockScene);

    const slots2 = archetypeActivation.getActiveSlots()!;
    const keycapSubset2 = [...slots2.keycapSubset];
    const platterActive2 = slots2.platterActive;
    const leverActive2 = slots2.leverActive;
    const sphereActive2 = slots2.sphereActive;

    // At least one aspect of the primitive configuration should differ
    // (different archetype type guarantees different seed-derived slots)
    const keycapsDiffer = JSON.stringify(keycapSubset1.sort()) !== JSON.stringify(keycapSubset2.sort());
    const platterDiffers = platterActive1 !== platterActive2;
    const leverDiffers = leverActive1 !== leverActive2;
    const sphereDiffers = sphereActive1 !== sphereActive2;
    const typeDiffers = result1.archetypeType !== result2.archetypeType;

    // Either a different archetype type was selected, or slot parameters differ
    expect(
      typeDiffers || keycapsDiffer || platterDiffers || leverDiffers || sphereDiffers,
    ).toBe(true);
  });

  // ── Test f ──

  it('Shatter records failure in DreamSequencer stats', () => {
    dreamSequencer.startSession('shatter-seed');

    // Complete one Dream to build a streak
    const result1 = dreamSequencer.selectNextDream();
    archetypeActivation.activate(result1.archetypeType, result1.seedHash, mockScene);
    mockNow += 30000;
    dreamSequencer.recordDreamCompletion(0.3);
    archetypeActivation.deactivate();

    expect(dreamSequencer.getStats().currentStreak).toBe(1);

    // Start another Dream and shatter
    const result2 = dreamSequencer.selectNextDream();
    archetypeActivation.activate(result2.archetypeType, result2.seedHash, mockScene);
    mockNow += 15000;
    dreamSequencer.recordDreamShatter(0.8);

    const stats = dreamSequencer.getStats();
    expect(stats.currentStreak).toBe(0);
    expect(stats.archetypeHistory.length).toBeGreaterThanOrEqual(2);

    const lastEntry = stats.archetypeHistory[stats.archetypeHistory.length - 1];
    expect(lastEntry.survived).toBe(false);
  });

  // ── Test g ──

  it('Tension carryover flows correctly through Dreams', () => {
    dreamSequencer.startSession('tension-flow-seed');

    // Dream 0 (opening, dreamIndex 0)
    const result0 = dreamSequencer.selectNextDream();
    expect(result0.carryoverTension).toBe(0); // First Dream = 0 carryover
    archetypeActivation.activate(result0.archetypeType, result0.seedHash, mockScene);
    mockNow += 60000;
    dreamSequencer.recordDreamCompletion(0.6);
    archetypeActivation.deactivate();

    // Dream 1 (opening, dreamIndex 1)
    const result1 = dreamSequencer.selectNextDream();
    expect(result1.pacingPhase).toBe('opening');
    // Opening caps carryover at 0.15: min(0.6 * 0.25, 0.15) = min(0.15, 0.15) = 0.15
    expect(result1.carryoverTension).toBeLessThanOrEqual(0.15);
    archetypeActivation.activate(result1.archetypeType, result1.seedHash, mockScene);
    mockNow += 60000;
    dreamSequencer.recordDreamCompletion(0.5);
    archetypeActivation.deactivate();

    // Dream 2 (development, dreamIndex 2)
    const result2 = dreamSequencer.selectNextDream();
    expect(result2.pacingPhase).toBe('development');
    // Development: base carryover = 0.5 * 0.25 = 0.125 (no cap/floor)
    expect(result2.carryoverTension).toBeCloseTo(0.5 * 0.25, 5);
  });

  // ── Test h ──

  it('Archetype entity exists in world during active Dream', () => {
    dreamSequencer.startSession('archetype-entity-seed');
    const result = dreamSequencer.selectNextDream();

    archetypeActivation.activate(result.archetypeType, result.seedHash, mockScene);

    // Verify exactly 1 archetype entity in world
    const archetypeEntities = world.with('archetype');
    expect(archetypeEntities.entities.length).toBe(1);

    archetypeActivation.deactivate();

    // Verify 0 archetype entities
    expect(archetypeEntities.entities.length).toBe(0);
  });

  // ── Test i ──

  it('Mock performance.now for consistent timing', () => {
    dreamSequencer.startSession('timing-seed');

    // Dream 0: starts at mockNow=0, complete at mockNow=45000
    mockNow = 0;
    dreamSequencer.selectNextDream();
    mockNow = 45000;
    dreamSequencer.recordDreamCompletion(0.3);

    // Dream 1: starts at mockNow=45000, complete at mockNow=95000
    mockNow = 45000;
    dreamSequencer.selectNextDream();
    mockNow = 95000;
    dreamSequencer.recordDreamCompletion(0.4);

    const stats = dreamSequencer.getStats();
    expect(stats.archetypeHistory).toHaveLength(2);
    expect(stats.archetypeHistory[0].durationMs).toBe(45000);
    expect(stats.archetypeHistory[1].durationMs).toBe(50000);
  });

  // ── Test j ──

  it('All 25 archetype types can be activated', () => {
    const allTypes = Object.keys(ARCHETYPE_METADATA) as ArchetypeType[];
    expect(allTypes.length).toBe(25);

    const seedHash = 42;

    for (const archetypeType of allTypes) {
      archetypeActivation.activate(archetypeType, seedHash, mockScene);

      const active = archetypeActivation.getActiveArchetype();
      expect(active).not.toBeNull();
      expect(active!.type).toBe(archetypeType);

      const slots = archetypeActivation.getActiveSlots();
      expect(slots).not.toBeNull();

      archetypeActivation.deactivate();

      expect(archetypeActivation.getActiveArchetype()).toBeNull();
    }
  });
});
