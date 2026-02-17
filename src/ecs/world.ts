/**
 * ECS World - Miniplex entity definitions
 *
 * Central entity world for all game objects. Each entity is a plain object
 * with optional component "tags". Miniplex queries (archetypes) let systems
 * efficiently iterate only the entities they care about.
 *
 * Keeps rendering concerns (Three.js refs) separate from game data.
 */

import { World } from 'miniplex';
import type * as THREE from 'three';

/** Core position + movement shared by most entities */
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Velocity {
  vx: number;
  vy: number;
  vz: number;
}

/** Enemy-specific data synced from game worker */
export interface EnemyData {
  gameId: number;
  word: string;
  shape: string;
  color: string;
  counter: string;
  encrypted: boolean;
  variant?: string;
}

/** Particle effect data */
export interface ParticleData {
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/** Trail ring data (expanding circle on counter) */
export interface TrailData {
  life: number;
  radius: number;
  color: string;
}

/** Confetti piece data */
export interface ConfettiData {
  life: number;
  color: string;
  width: number;
  height: number;
  rotationSpeed: number;
}

/** Power-up floating item */
export interface PowerUpData {
  icon: string;
  color: string;
  dur: number;
}

/** Boss entity data */
export interface BossData {
  hp: number;
  maxHp: number;
  name: string;
  iFrame: number;
}

/** Three.js object ref - attached when the entity gets rendered */
export interface ThreeRef {
  object: THREE.Object3D;
}

/**
 * Entity type: union of all possible components.
 * Each entity only has the components relevant to it.
 * Miniplex archetypes filter by which components are present.
 */
export interface Entity {
  // Spatial
  position?: Position;
  velocity?: Velocity;

  // Game data (mutually exclusive tags)
  enemy?: EnemyData;
  particle?: ParticleData;
  trail?: TrailData;
  confetti?: ConfettiData;
  powerUp?: PowerUpData;
  boss?: BossData;

  // Rendering
  threeRef?: ThreeRef;
}

/** The single ECS world instance */
export const world = new World<Entity>();

/**
 * Pre-built archetypes (queries) for each system to iterate.
 * These are reactive - entities auto-join/leave as components change.
 */
export const enemies = world.with('position', 'enemy');
export const particles = world.with('position', 'velocity', 'particle');
export const trails = world.with('position', 'trail');
export const confettis = world.with('position', 'velocity', 'confetti');
export const powerUps = world.with('position', 'velocity', 'powerUp');
export const bosses = world.with('position', 'boss');
