/**
 * The Koota world — single source of truth for game state and entities.
 *
 * Singleton traits (Game, Level, Seed, Input, Audio) are attached to the
 * world entity at construction, so `world.get(Trait)` returns a record and
 * `world.set(Trait, {...})` triggers reactivity to subscribed React components.
 *
 * Entity traits (IsSphere, IsEnemy, IsPattern, Position, Velocity, Enemy,
 * Pattern, Sphere) get attached to spawned entities.
 */

import { createWorld } from 'koota';
import { Audio, Game, Input, Level, Seed } from './traits';

export const world = createWorld(Game, Level, Seed, Input, Audio);

// Re-export traits so consumers can import from one place.
export * from './traits';
