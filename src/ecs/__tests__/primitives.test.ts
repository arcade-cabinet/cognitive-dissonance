/**
 * Tests for Primitive Entity Factories — Cognitive Dissonance v3.0
 *
 * Covers all spawn/despawn functions in primitives.ts:
 * - spawnKeycapEntities: 14 keycap entities with correct letters
 * - spawnLeverEntity: single lever with default component values
 * - spawnPlatterEntity: single platter with default component values
 * - spawnSphereEntity: single sphere with default component values
 * - spawnCrystallineCubeEntity: cube with 'boss' role default
 * - spawnMorphCubeEntity: morph cube with 'mirror' role default
 * - spawnArchetypeEntity: archetype with seed-derived slots
 * - despawnPrimitiveEntities: batch removal by tag
 * - despawnArchetypeEntity: archetype removal
 */

import { World } from 'miniplex';
import type { GameEntity } from '../../types';
import {
  spawnKeycapEntities,
  spawnLeverEntity,
  spawnPlatterEntity,
  spawnSphereEntity,
  spawnCrystallineCubeEntity,
  spawnMorphCubeEntity,
  spawnArchetypeEntity,
  despawnPrimitiveEntities,
  despawnArchetypeEntity,
} from '../primitives';

// ── Mock Mesh Factory ──

function createMockMesh(name = 'mockMesh'): {
  dispose: jest.Mock;
  name: string;
  position: { x: number; y: number; z: number };
} {
  return {
    dispose: jest.fn(),
    name,
    position: { x: 0, y: 0, z: 0 },
  };
}

function createMockMeshes(count: number, prefix = 'keycap'): ReturnType<typeof createMockMesh>[] {
  return Array.from({ length: count }, (_, i) => createMockMesh(`${prefix}_${i}`));
}

// ── Test Suite ──

describe('Primitive Entity Factories', () => {
  let world: World<GameEntity>;

  beforeEach(() => {
    world = new World<GameEntity>();
  });

  afterEach(() => {
    for (const entity of [...world.entities]) {
      world.remove(entity);
    }
  });

  // ── spawnKeycapEntities ──

  describe('spawnKeycapEntities', () => {
    const EXPECTED_LETTERS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];

    it('creates 14 keycap entities from mesh array', () => {
      const meshes = createMockMeshes(14);
      const entities = spawnKeycapEntities(world, meshes);

      expect(entities).toHaveLength(14);
      expect(world.entities.length).toBe(14);
    });

    it('assigns correct letters to each keycap entity', () => {
      const meshes = createMockMeshes(14);
      const entities = spawnKeycapEntities(world, meshes);

      for (let i = 0; i < 14; i++) {
        expect(entities[i].keycap?.letter).toBe(EXPECTED_LETTERS[i]);
      }
    });

    it('sets default component values for all keycap entities', () => {
      const meshes = createMockMeshes(14);
      const entities = spawnKeycapEntities(world, meshes);

      for (const entity of entities) {
        expect(entity.keycap?.active).toBe(false);
        expect(entity.keycap?.emerged).toBe(false);
        expect(entity.keycap?.glowIntensity).toBe(0);
        expect(entity.keycap?.holdProgress).toBe(0);
      }
    });

    it('attaches the correct mesh to each entity', () => {
      const meshes = createMockMeshes(14);
      const entities = spawnKeycapEntities(world, meshes);

      for (let i = 0; i < 14; i++) {
        expect(entities[i].mesh).toBe(meshes[i]);
      }
    });

    it('tags all entities with primitiveTag "keycap"', () => {
      const meshes = createMockMeshes(14);
      const entities = spawnKeycapEntities(world, meshes);

      for (const entity of entities) {
        expect(entity.primitiveTag).toBe('keycap');
      }
    });

    it('handles fewer than 14 meshes gracefully', () => {
      const meshes = createMockMeshes(5);
      const entities = spawnKeycapEntities(world, meshes);

      expect(entities).toHaveLength(5);
      expect(entities[0].keycap?.letter).toBe('Q');
      expect(entities[4].keycap?.letter).toBe('T');
    });

    it('handles more than 14 meshes with fallback keys', () => {
      const meshes = createMockMeshes(16);
      const entities = spawnKeycapEntities(world, meshes);

      expect(entities).toHaveLength(16);
      // First 14 get standard letters
      expect(entities[13].keycap?.letter).toBe('C');
      // Extras get fallback names
      expect(entities[14].keycap?.letter).toBe('KEY_14');
      expect(entities[15].keycap?.letter).toBe('KEY_15');
    });

    it('is queryable via world.with("keycap")', () => {
      const meshes = createMockMeshes(14);
      spawnKeycapEntities(world, meshes);

      const query = world.with('keycap');
      expect(query.entities.length).toBe(14);
    });
  });

  // ── spawnLeverEntity ──

  describe('spawnLeverEntity', () => {
    it('creates a single lever entity', () => {
      const mesh = createMockMesh('lever');
      const entity = spawnLeverEntity(world, mesh);

      expect(entity.lever).toBeDefined();
      expect(world.entities.length).toBe(1);
    });

    it('sets default lever component values', () => {
      const mesh = createMockMesh('lever');
      const entity = spawnLeverEntity(world, mesh);

      expect(entity.lever?.position).toBe(0);
      expect(entity.lever?.active).toBe(false);
      expect(entity.lever?.resistance).toBe(0.5);
      expect(entity.lever?.locked).toBe(false);
    });

    it('attaches the mesh and tags as "lever"', () => {
      const mesh = createMockMesh('lever');
      const entity = spawnLeverEntity(world, mesh);

      expect(entity.mesh).toBe(mesh);
      expect(entity.primitiveTag).toBe('lever');
    });

    it('is queryable via world.with("lever")', () => {
      const mesh = createMockMesh('lever');
      spawnLeverEntity(world, mesh);

      const query = world.with('lever');
      expect(query.entities.length).toBe(1);
    });
  });

  // ── spawnPlatterEntity ──

  describe('spawnPlatterEntity', () => {
    it('creates a single platter entity', () => {
      const mesh = createMockMesh('platter');
      const entity = spawnPlatterEntity(world, mesh);

      expect(entity.platter).toBeDefined();
      expect(world.entities.length).toBe(1);
    });

    it('sets default platter component values', () => {
      const mesh = createMockMesh('platter');
      const entity = spawnPlatterEntity(world, mesh);

      expect(entity.platter?.rotationRPM).toBe(0);
      expect(entity.platter?.direction).toBe(1);
      expect(entity.platter?.active).toBe(false);
      expect(entity.platter?.locked).toBe(false);
    });

    it('attaches the mesh and tags as "platter"', () => {
      const mesh = createMockMesh('platter');
      const entity = spawnPlatterEntity(world, mesh);

      expect(entity.mesh).toBe(mesh);
      expect(entity.primitiveTag).toBe('platter');
    });

    it('is queryable via world.with("platter")', () => {
      const mesh = createMockMesh('platter');
      spawnPlatterEntity(world, mesh);

      const query = world.with('platter');
      expect(query.entities.length).toBe(1);
    });
  });

  // ── spawnSphereEntity ──

  describe('spawnSphereEntity', () => {
    it('creates a single sphere entity', () => {
      const mesh = createMockMesh('sphere');
      const entity = spawnSphereEntity(world, mesh);

      expect(entity.sphere).toBeDefined();
      expect(world.entities.length).toBe(1);
    });

    it('sets default sphere component values', () => {
      const mesh = createMockMesh('sphere');
      const entity = spawnSphereEntity(world, mesh);

      expect(entity.sphere?.active).toBe(false);
      expect(entity.sphere?.angularSpeed).toBe(0);
      expect(entity.sphere?.driftEnabled).toBe(false);
      expect(entity.sphere?.driftSpeed).toBe(0);
    });

    it('attaches the mesh and tags as "sphere"', () => {
      const mesh = createMockMesh('sphere');
      const entity = spawnSphereEntity(world, mesh);

      expect(entity.mesh).toBe(mesh);
      expect(entity.primitiveTag).toBe('sphere');
    });

    it('is queryable via world.with("sphere")', () => {
      const mesh = createMockMesh('sphere');
      spawnSphereEntity(world, mesh);

      const query = world.with('sphere');
      expect(query.entities.length).toBe(1);
    });
  });

  // ── spawnCrystallineCubeEntity ──

  describe('spawnCrystallineCubeEntity', () => {
    it('creates a crystalline cube entity', () => {
      const mesh = createMockMesh('crystallineCube');
      const entity = spawnCrystallineCubeEntity(world, mesh);

      expect(entity.crystallineCube).toBeDefined();
      expect(world.entities.length).toBe(1);
    });

    it('defaults to "boss" role', () => {
      const mesh = createMockMesh('crystallineCube');
      const entity = spawnCrystallineCubeEntity(world, mesh);

      expect(entity.crystallineCube?.role).toBe('boss');
    });

    it('sets default component values', () => {
      const mesh = createMockMesh('crystallineCube');
      const entity = spawnCrystallineCubeEntity(world, mesh);

      expect(entity.crystallineCube?.active).toBe(false);
      expect(entity.crystallineCube?.health).toBe(1.0);
      expect(entity.crystallineCube?.facetCount).toBe(6);
      expect(entity.crystallineCube?.velocity).toEqual({ x: 0, y: 0, z: 0 });
      expect(entity.crystallineCube?.orbitRadius).toBe(0);
      expect(entity.crystallineCube?.orbitSpeed).toBe(0);
    });

    it('uses provided position', () => {
      const mesh = createMockMesh('crystallineCube');
      const pos = { x: 1, y: 2, z: 3 };
      const entity = spawnCrystallineCubeEntity(world, mesh, pos);

      expect(entity.crystallineCube?.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(entity.crystallineCube?.altitude).toBe(2);
    });

    it('defaults position to origin when not provided', () => {
      const mesh = createMockMesh('crystallineCube');
      const entity = spawnCrystallineCubeEntity(world, mesh);

      expect(entity.crystallineCube?.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(entity.crystallineCube?.altitude).toBe(0);
    });

    it('does not mutate the provided position object', () => {
      const mesh = createMockMesh('crystallineCube');
      const pos = { x: 1, y: 2, z: 3 };
      const entity = spawnCrystallineCubeEntity(world, mesh, pos);

      // Mutate the entity position
      entity.crystallineCube!.position.x = 99;
      expect(pos.x).toBe(1);
    });

    it('tags as "crystallineCube"', () => {
      const mesh = createMockMesh('crystallineCube');
      const entity = spawnCrystallineCubeEntity(world, mesh);

      expect(entity.primitiveTag).toBe('crystallineCube');
    });

    it('is queryable via world.with("crystallineCube")', () => {
      const mesh = createMockMesh('crystallineCube');
      spawnCrystallineCubeEntity(world, mesh);

      const query = world.with('crystallineCube');
      expect(query.entities.length).toBe(1);
    });
  });

  // ── spawnMorphCubeEntity ──

  describe('spawnMorphCubeEntity', () => {
    it('creates a morph cube entity', () => {
      const mesh = createMockMesh('morphCube');
      const entity = spawnMorphCubeEntity(world, mesh);

      expect(entity.morphCube).toBeDefined();
      expect(world.entities.length).toBe(1);
    });

    it('defaults to "mirror" role', () => {
      const mesh = createMockMesh('morphCube');
      const entity = spawnMorphCubeEntity(world, mesh);

      expect(entity.morphCube?.role).toBe('mirror');
    });

    it('sets default component values', () => {
      const mesh = createMockMesh('morphCube');
      const entity = spawnMorphCubeEntity(world, mesh);

      expect(entity.morphCube?.active).toBe(false);
      expect(entity.morphCube?.morphProgress).toBe(0);
      expect(entity.morphCube?.currentTrait).toBe('NeonRaymarcher');
      expect(entity.morphCube?.velocity).toEqual({ x: 0, y: 0, z: 0 });
      expect(entity.morphCube?.orbitRadius).toBe(0);
      expect(entity.morphCube?.orbitSpeed).toBe(0);
    });

    it('uses provided position', () => {
      const mesh = createMockMesh('morphCube');
      const pos = { x: 5, y: 10, z: -3 };
      const entity = spawnMorphCubeEntity(world, mesh, pos);

      expect(entity.morphCube?.position).toEqual({ x: 5, y: 10, z: -3 });
      expect(entity.morphCube?.altitude).toBe(10);
    });

    it('defaults position to origin when not provided', () => {
      const mesh = createMockMesh('morphCube');
      const entity = spawnMorphCubeEntity(world, mesh);

      expect(entity.morphCube?.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(entity.morphCube?.altitude).toBe(0);
    });

    it('does not mutate the provided position object', () => {
      const mesh = createMockMesh('morphCube');
      const pos = { x: 1, y: 2, z: 3 };
      const entity = spawnMorphCubeEntity(world, mesh, pos);

      entity.morphCube!.position.x = 99;
      expect(pos.x).toBe(1);
    });

    it('tags as "morphCube"', () => {
      const mesh = createMockMesh('morphCube');
      const entity = spawnMorphCubeEntity(world, mesh);

      expect(entity.primitiveTag).toBe('morphCube');
    });

    it('is queryable via world.with("morphCube")', () => {
      const mesh = createMockMesh('morphCube');
      spawnMorphCubeEntity(world, mesh);

      const query = world.with('morphCube');
      expect(query.entities.length).toBe(1);
    });
  });

  // ── spawnArchetypeEntity ──

  describe('spawnArchetypeEntity', () => {
    it('creates an archetype entity with correct type', () => {
      const entity = spawnArchetypeEntity(world, 'PlatterRotation', 12345);

      expect(entity.archetype).toBeDefined();
      expect(entity.archetype?.type).toBe('PlatterRotation');
      expect(world.entities.length).toBe(1);
    });

    it('stores the seedHash on the archetype component', () => {
      const entity = spawnArchetypeEntity(world, 'LeverTension', 42);

      expect(entity.archetype?.seedHash).toBe(42);
    });

    it('derives valid slots from seed', () => {
      const entity = spawnArchetypeEntity(world, 'PlatterRotation', 12345);
      const slots = entity.archetype?.slots;

      expect(slots).toBeDefined();
      // PlatterRotation slots should have platter-specific fields
      expect('rotationRPM' in slots!).toBe(true);
      expect('reachZoneArc' in slots!).toBe(true);
      expect('direction' in slots!).toBe(true);
    });

    it('derives slots with base slot fields', () => {
      const entity = spawnArchetypeEntity(world, 'KeySequence', 99999);
      const slots = entity.archetype?.slots;

      expect(slots).toBeDefined();
      expect(slots!.keycapSubset).toBeInstanceOf(Array);
      expect(typeof slots!.leverActive).toBe('boolean');
      expect(typeof slots!.platterActive).toBe('boolean');
      expect(typeof slots!.sphereActive).toBe('boolean');
      expect(typeof slots!.crystallineCubeActive).toBe('boolean');
      expect(typeof slots!.morphCubeActive).toBe('boolean');
    });

    it('sets pacing and cognitiveLoad from metadata', () => {
      const entity = spawnArchetypeEntity(world, 'CrystallineCubeBoss', 100);

      expect(entity.archetype?.pacing).toBe('intense');
      expect(entity.archetype?.cognitiveLoad).toBe('high');
    });

    it('produces deterministic results for the same seed', () => {
      const entity1 = spawnArchetypeEntity(world, 'MorphMirror', 777);
      const entity2 = spawnArchetypeEntity(world, 'MorphMirror', 777);

      expect(entity1.archetype?.slots).toEqual(entity2.archetype?.slots);
      expect(entity1.archetype?.pacing).toBe(entity2.archetype?.pacing);
    });

    it('produces different results for different seeds', () => {
      const entity1 = spawnArchetypeEntity(world, 'PlatterRotation', 1);
      const entity2 = spawnArchetypeEntity(world, 'PlatterRotation', 999999);

      // While theoretically possible to collide, extremely unlikely with mulberry32
      const slots1 = entity1.archetype?.slots;
      const slots2 = entity2.archetype?.slots;
      expect(slots1).not.toEqual(slots2);
    });

    it('tags as "archetype"', () => {
      const entity = spawnArchetypeEntity(world, 'ZenDrift', 50);

      expect(entity.primitiveTag).toBe('archetype');
    });

    it('is queryable via world.with("archetype")', () => {
      spawnArchetypeEntity(world, 'Survival', 200);

      const query = world.with('archetype');
      expect(query.entities.length).toBe(1);
    });

    it('works for all 25 archetype types', () => {
      const allTypes = [
        'PlatterRotation', 'LeverTension', 'KeySequence', 'CrystallineCubeBoss',
        'FacetAlign', 'OrbitalCatch', 'RefractionAim', 'Labyrinth',
        'TurntableScratch', 'RhythmGate', 'WhackAMole', 'ChordHold',
        'MorphMirror', 'Conductor', 'LockPick', 'CubeJuggle',
        'ZenDrift', 'Pinball', 'TendrilDodge', 'Escalation',
        'Resonance', 'Survival', 'CubeStack', 'GhostChase', 'SphereSculpt',
      ] as const;

      for (const type of allTypes) {
        const entity = spawnArchetypeEntity(world, type, 42);
        expect(entity.archetype?.type).toBe(type);
        expect(entity.archetype?.slots).toBeDefined();
        expect(entity.archetype?.seedHash).toBe(42);
      }

      expect(world.entities.length).toBe(25);
    });
  });

  // ── despawnPrimitiveEntities ──

  describe('despawnPrimitiveEntities', () => {
    it('removes all entities with a given tag', () => {
      const meshes = createMockMeshes(14);
      spawnKeycapEntities(world, meshes);
      expect(world.entities.length).toBe(14);

      const removed = despawnPrimitiveEntities(world, 'keycap');
      expect(removed).toBe(14);
      expect(world.entities.length).toBe(0);
    });

    it('only removes entities matching the specified tag', () => {
      const keycapMeshes = createMockMeshes(14);
      spawnKeycapEntities(world, keycapMeshes);
      spawnLeverEntity(world, createMockMesh('lever'));
      spawnPlatterEntity(world, createMockMesh('platter'));
      expect(world.entities.length).toBe(16);

      const removed = despawnPrimitiveEntities(world, 'keycap');
      expect(removed).toBe(14);
      expect(world.entities.length).toBe(2);

      // Verify lever and platter remain
      const leverQuery = world.with('lever');
      expect(leverQuery.entities.length).toBe(1);
      const platterQuery = world.with('platter');
      expect(platterQuery.entities.length).toBe(1);
    });

    it('returns 0 when no entities match the tag', () => {
      spawnLeverEntity(world, createMockMesh('lever'));

      const removed = despawnPrimitiveEntities(world, 'nonexistent');
      expect(removed).toBe(0);
      expect(world.entities.length).toBe(1);
    });

    it('returns 0 when world is empty', () => {
      const removed = despawnPrimitiveEntities(world, 'keycap');
      expect(removed).toBe(0);
    });

    it('can despawn each primitive type by tag', () => {
      spawnLeverEntity(world, createMockMesh('lever'));
      spawnPlatterEntity(world, createMockMesh('platter'));
      spawnSphereEntity(world, createMockMesh('sphere'));
      spawnCrystallineCubeEntity(world, createMockMesh('cube'));
      spawnMorphCubeEntity(world, createMockMesh('morph'));
      expect(world.entities.length).toBe(5);

      expect(despawnPrimitiveEntities(world, 'lever')).toBe(1);
      expect(despawnPrimitiveEntities(world, 'platter')).toBe(1);
      expect(despawnPrimitiveEntities(world, 'sphere')).toBe(1);
      expect(despawnPrimitiveEntities(world, 'crystallineCube')).toBe(1);
      expect(despawnPrimitiveEntities(world, 'morphCube')).toBe(1);
      expect(world.entities.length).toBe(0);
    });
  });

  // ── despawnArchetypeEntity ──

  describe('despawnArchetypeEntity', () => {
    it('removes the archetype entity from the world', () => {
      spawnArchetypeEntity(world, 'PlatterRotation', 100);
      expect(world.entities.length).toBe(1);

      const removed = despawnArchetypeEntity(world);
      expect(removed).toBe(1);
      expect(world.entities.length).toBe(0);
    });

    it('returns 0 when no archetype entity exists', () => {
      const removed = despawnArchetypeEntity(world);
      expect(removed).toBe(0);
    });

    it('does not remove non-archetype entities', () => {
      spawnArchetypeEntity(world, 'ZenDrift', 50);
      spawnLeverEntity(world, createMockMesh('lever'));
      spawnSphereEntity(world, createMockMesh('sphere'));
      expect(world.entities.length).toBe(3);

      const removed = despawnArchetypeEntity(world);
      expect(removed).toBe(1);
      expect(world.entities.length).toBe(2);

      const leverQuery = world.with('lever');
      expect(leverQuery.entities.length).toBe(1);
    });

    it('removes multiple archetype entities if present', () => {
      // Edge case: two archetype entities (should not happen in practice)
      spawnArchetypeEntity(world, 'PlatterRotation', 1);
      spawnArchetypeEntity(world, 'LeverTension', 2);
      expect(world.entities.length).toBe(2);

      const removed = despawnArchetypeEntity(world);
      expect(removed).toBe(2);
      expect(world.entities.length).toBe(0);
    });
  });

  // ── Integration: spawn and despawn full scene ──

  describe('Integration: full scene lifecycle', () => {
    it('spawns all primitives and archetype, then despawns all', () => {
      const keycapMeshes = createMockMeshes(14);
      spawnKeycapEntities(world, keycapMeshes);
      spawnLeverEntity(world, createMockMesh('lever'));
      spawnPlatterEntity(world, createMockMesh('platter'));
      spawnSphereEntity(world, createMockMesh('sphere'));
      spawnCrystallineCubeEntity(world, createMockMesh('cube'));
      spawnMorphCubeEntity(world, createMockMesh('morph'));
      spawnArchetypeEntity(world, 'Escalation', 42);

      // 14 keycaps + 1 lever + 1 platter + 1 sphere + 1 cube + 1 morph + 1 archetype = 20
      expect(world.entities.length).toBe(20);

      // Despawn all by tag
      despawnPrimitiveEntities(world, 'keycap');
      despawnPrimitiveEntities(world, 'lever');
      despawnPrimitiveEntities(world, 'platter');
      despawnPrimitiveEntities(world, 'sphere');
      despawnPrimitiveEntities(world, 'crystallineCube');
      despawnPrimitiveEntities(world, 'morphCube');
      despawnArchetypeEntity(world);

      expect(world.entities.length).toBe(0);
    });

    it('respawns entities after despawning', () => {
      const meshes = createMockMeshes(14);
      spawnKeycapEntities(world, meshes);
      expect(world.entities.length).toBe(14);

      despawnPrimitiveEntities(world, 'keycap');
      expect(world.entities.length).toBe(0);

      // Respawn with new meshes
      const newMeshes = createMockMeshes(14, 'new_keycap');
      const newEntities = spawnKeycapEntities(world, newMeshes);
      expect(world.entities.length).toBe(14);
      expect(newEntities[0].mesh?.name).toBe('new_keycap_0');
    });
  });
});
