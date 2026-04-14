/**
 * Compatibility shim: preserves the old `world.add({...})` / `world.remove(entity)`
 * API that components use, but routes everything through Koota so the single
 * Koota world (src/sim/world.ts) is the real source of truth.
 *
 * Each `world.add(bag)` spawns a Koota entity with the appropriate traits
 * derived from the bag's fields. The returned value is a plain object that
 * aliases the bag but with a hidden `__koota` field holding the Entity
 * reference; `world.remove(entity)` destroys it.
 *
 * This gives us the Koota benefits (single world, queryable entity data,
 * traits composable with singleton state) without rewriting every gameplay
 * system in one shot.
 */

import {
  Enemy,
  IsEnemy,
  IsPattern,
  IsSphere,
  world as kootaWorld,
  Pattern,
  Position,
  Sphere,
  Velocity,
} from '@/sim/world';

export interface GameEntity {
  // ── Entity type tags ──
  aiSphere?: boolean;
  enemy?: boolean;
  pattern?: boolean;

  // ── Shared properties ──
  position?: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };

  // ── AI Sphere ──
  tension?: number;
  coherence?: number;
  exploded?: boolean;
  crackLevel?: number;

  // ── Enemy ──
  health?: number;
  type?: 'seek' | 'zigzag' | 'split' | 'wander';
  isBoss?: boolean;

  // ── Pattern ──
  progress?: number;
  speed?: number;
  color?: string;
  colorIndex?: number;
}

// Hidden symbol used to stash the Koota entity handle on the bag.
const KOOTA_ENTITY = Symbol('koota-entity');

type BagWithKoota = GameEntity & { [KOOTA_ENTITY]?: ReturnType<typeof kootaWorld.spawn> };

export const world = {
  add(bag: GameEntity): GameEntity {
    const traits: unknown[] = [];

    if (bag.aiSphere) {
      traits.push(IsSphere);
      traits.push(
        Sphere({
          tension: bag.tension ?? 0,
          coherence: bag.coherence ?? 25,
          crackLevel: bag.crackLevel ?? 0,
          exploded: bag.exploded ?? false,
        }),
      );
    }
    if (bag.enemy) {
      traits.push(IsEnemy);
      traits.push(
        Enemy({
          health: bag.health ?? 1,
          isBoss: bag.isBoss ?? false,
          kind: bag.type ?? 'seek',
        }),
      );
    }
    if (bag.pattern) {
      traits.push(IsPattern);
      traits.push(
        Pattern({
          progress: bag.progress ?? 0,
          speed: bag.speed ?? 0.5,
          colorIndex: bag.colorIndex ?? 0,
          color: bag.color ?? '#ffffff',
        }),
      );
    }
    if (bag.position) {
      traits.push(Position({ x: bag.position.x, y: bag.position.y, z: bag.position.z }));
    }
    if (bag.velocity) {
      traits.push(Velocity({ x: bag.velocity.x, y: bag.velocity.y, z: bag.velocity.z }));
    }

    const entity = kootaWorld.spawn(
      // biome-ignore lint/suspicious/noExplicitAny: variadic ConfigurableTrait tuple
      ...(traits as any),
    );
    const result = bag as BagWithKoota;
    result[KOOTA_ENTITY] = entity;
    return result;
  },

  remove(bag: GameEntity): void {
    const entity = (bag as BagWithKoota)[KOOTA_ENTITY];
    if (entity) {
      entity.destroy();
      delete (bag as BagWithKoota)[KOOTA_ENTITY];
    }
  },
};

// Legacy archetype helpers are not used anywhere in src/components/ — provided
// here as empty-stub exports in case any consumer still references them.
export const enemies = { entities: [] as GameEntity[] };
export const patterns = { entities: [] as GameEntity[] };
