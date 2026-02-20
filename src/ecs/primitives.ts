/**
 * Primitive Entity Factories — Cognitive Dissonance v3.0
 *
 * Factory functions to spawn and despawn ECS entities for each of the
 * six interaction primitives and the archetype configuration entity.
 *
 * Each factory creates a Miniplex entity with the correct component
 * structure. Despawn functions query by tag or component and remove
 * matching entities from the world.
 *
 * Design: LEVEL_ARCHETYPES.md, components.ts
 */

import type { World } from 'miniplex';
import type { GameEntity } from '../types';
import type {
  ArchetypeType,
  CrystallineCubeComponent,
  KeycapComponent,
  LeverComponent,
  MorphCubeComponent,
  PlatterComponent,
  SphereComponent,
} from './components';
import { ARCHETYPE_METADATA } from './components';
import { deriveArchetypeSlots } from './archetypeSlots';

// The 14 keycap letters in layout order
const KEYCAP_LETTERS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'] as const;

/** Mesh-like interface for factory parameters (compatible with Babylon.js Mesh) */
interface MeshLike {
  dispose: () => void;
  name: string;
  position: { x: number; y: number; z: number };
}

// ── Keycap Entities ──

/**
 * Spawn 14 keycap entities, one per mesh in the array.
 * Each entity gets the corresponding letter from KEYCAP_LETTERS.
 *
 * @param world - The Miniplex world
 * @param keycapMeshes - Array of 14 keycap meshes in layout order
 * @returns Array of created keycap entities
 */
export function spawnKeycapEntities(
  world: World<GameEntity>,
  keycapMeshes: MeshLike[],
): GameEntity[] {
  return keycapMeshes.map((mesh, index) => {
    const letter = KEYCAP_LETTERS[index] ?? `KEY_${index}`;
    const keycap: KeycapComponent = {
      letter,
      active: false,
      emerged: false,
      glowIntensity: 0,
      holdProgress: 0,
    };
    return world.add({
      keycap,
      mesh,
      primitiveTag: 'keycap',
    } as GameEntity);
  });
}

// ── Lever Entity ──

/**
 * Spawn a single lever entity.
 *
 * @param world - The Miniplex world
 * @param leverMesh - The lever mesh
 * @returns The created lever entity
 */
export function spawnLeverEntity(
  world: World<GameEntity>,
  leverMesh: MeshLike,
): GameEntity {
  const lever: LeverComponent = {
    position: 0,
    active: false,
    resistance: 0.5,
    locked: false,
  };
  return world.add({
    lever,
    mesh: leverMesh,
    primitiveTag: 'lever',
  } as GameEntity);
}

// ── Platter Entity ──

/**
 * Spawn a single platter entity.
 *
 * @param world - The Miniplex world
 * @param platterMesh - The platter mesh
 * @returns The created platter entity
 */
export function spawnPlatterEntity(
  world: World<GameEntity>,
  platterMesh: MeshLike,
): GameEntity {
  const platter: PlatterComponent = {
    rotationRPM: 0,
    direction: 1,
    active: false,
    locked: false,
  };
  return world.add({
    platter,
    mesh: platterMesh,
    primitiveTag: 'platter',
  } as GameEntity);
}

// ── Sphere Entity ──

/**
 * Spawn a single sphere entity.
 *
 * @param world - The Miniplex world
 * @param sphereMesh - The sphere mesh
 * @returns The created sphere entity
 */
export function spawnSphereEntity(
  world: World<GameEntity>,
  sphereMesh: MeshLike,
): GameEntity {
  const sphere: SphereComponent = {
    active: false,
    angularSpeed: 0,
    driftEnabled: false,
    driftSpeed: 0,
  };
  return world.add({
    sphere,
    mesh: sphereMesh,
    primitiveTag: 'sphere',
  } as GameEntity);
}

// ── Crystalline Cube Entity ──

/**
 * Spawn a crystalline cube entity with configurable position.
 *
 * @param world - The Miniplex world
 * @param mesh - The cube mesh
 * @param position - Initial 3D position (defaults to origin)
 * @returns The created crystalline cube entity
 */
export function spawnCrystallineCubeEntity(
  world: World<GameEntity>,
  mesh: MeshLike,
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): GameEntity {
  const crystallineCube: CrystallineCubeComponent = {
    active: false,
    role: 'boss',
    health: 1.0,
    facetCount: 6,
    position: { ...position },
    velocity: { x: 0, y: 0, z: 0 },
    orbitRadius: 0,
    orbitSpeed: 0,
    altitude: position.y,
  };
  return world.add({
    crystallineCube,
    mesh,
    primitiveTag: 'crystallineCube',
  } as GameEntity);
}

// ── Morph Cube Entity ──

/**
 * Spawn a morph cube entity with configurable position.
 *
 * @param world - The Miniplex world
 * @param mesh - The morph cube mesh
 * @param position - Initial 3D position (defaults to origin)
 * @returns The created morph cube entity
 */
export function spawnMorphCubeEntity(
  world: World<GameEntity>,
  mesh: MeshLike,
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): GameEntity {
  const morphCube: MorphCubeComponent = {
    active: false,
    role: 'mirror',
    morphProgress: 0,
    currentTrait: 'NeonRaymarcher',
    position: { ...position },
    velocity: { x: 0, y: 0, z: 0 },
    orbitRadius: 0,
    orbitSpeed: 0,
    altitude: position.y,
  };
  return world.add({
    morphCube,
    mesh,
    primitiveTag: 'morphCube',
  } as GameEntity);
}

// ── Archetype Entity ──

/**
 * Spawn an archetype configuration entity.
 * Uses deriveArchetypeSlots() to generate seed-driven slot parameters.
 *
 * @param world - The Miniplex world
 * @param archetypeType - Which of the 25 archetypes to configure
 * @param seedHash - Seed hash for deterministic slot derivation
 * @returns The created archetype entity
 */
export function spawnArchetypeEntity(
  world: World<GameEntity>,
  archetypeType: ArchetypeType,
  seedHash: number,
): GameEntity {
  const slots = deriveArchetypeSlots(archetypeType, seedHash);
  const metadata = ARCHETYPE_METADATA[archetypeType];

  return world.add({
    archetype: {
      type: archetypeType,
      slots,
      seedHash,
      pacing: metadata.pacing,
      cognitiveLoad: metadata.cognitiveLoad,
    },
    primitiveTag: 'archetype',
  } as GameEntity);
}

// ── Despawn Functions ──

/**
 * Remove all entities with a given primitiveTag from the world.
 *
 * @param world - The Miniplex world
 * @param tag - The primitiveTag value to match
 * @returns Number of entities removed
 */
export function despawnPrimitiveEntities(
  world: World<GameEntity>,
  tag: string,
): number {
  const query = world.with('primitiveTag');
  const toRemove = [...query.entities].filter((e) => e.primitiveTag === tag);
  for (const entity of toRemove) {
    world.remove(entity);
  }
  return toRemove.length;
}

/**
 * Remove the active archetype entity from the world.
 * There should be at most one archetype entity at any time.
 *
 * @param world - The Miniplex world
 * @returns Number of entities removed (0 or 1)
 */
export function despawnArchetypeEntity(
  world: World<GameEntity>,
): number {
  const query = world.with('archetype');
  const toRemove = [...query.entities];
  for (const entity of toRemove) {
    world.remove(entity);
  }
  return toRemove.length;
}
