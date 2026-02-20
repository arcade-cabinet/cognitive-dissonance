import { World } from 'miniplex';
import type { GameEntity } from '../types';

// Consolidated Miniplex World
export const world = new World<GameEntity>();

// Hand Archetypes (XR hand tracking — 26 joints each)
export const LeftHand = world.with('xrHand', 'left', 'joints', 'gripStrength', 'pinchStrength', 'contactPoints');
export const RightHand = world.with('xrHand', 'right', 'joints', 'gripStrength', 'pinchStrength', 'contactPoints');
