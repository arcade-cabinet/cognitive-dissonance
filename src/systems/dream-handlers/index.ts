/**
 * Dream Handler Registry — Cognitive Dissonance v3.0
 *
 * Maps ArchetypeType -> DreamHandler constructor for clean dispatch.
 * Each handler implements activate/update/dispose for its archetype's
 * per-frame gameplay logic.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { ArchetypeType } from '../../ecs/components';
import type { GameEntity } from '../../types';

/** Interface all dream handlers implement */
export interface DreamHandler {
  activate(entity: GameEntity, scene: Scene): void;
  update(dt: number): void;
  dispose(): void;
}

/** Handler constructor type */
export type DreamHandlerFactory = new () => DreamHandler;

/** Registry mapping archetype type -> handler factory */
const HANDLER_REGISTRY = new Map<ArchetypeType, DreamHandlerFactory>();

/** Register a handler for an archetype type */
export function registerHandler(type: ArchetypeType, factory: DreamHandlerFactory): void {
  HANDLER_REGISTRY.set(type, factory);
}

/** Get handler factory for an archetype type (null if not registered) */
export function getHandlerFactory(type: ArchetypeType): DreamHandlerFactory | null {
  return HANDLER_REGISTRY.get(type) ?? null;
}

/** Check if a handler is registered for an archetype type */
export function hasHandler(type: ArchetypeType): boolean {
  return HANDLER_REGISTRY.has(type);
}

/** Get all registered archetype types */
export function getRegisteredTypes(): ArchetypeType[] {
  return [...HANDLER_REGISTRY.keys()];
}

// Re-export the interface for handler implementations
export type { ArchetypeType };
