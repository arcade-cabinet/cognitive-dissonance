import { World } from 'miniplex';

export interface GameEntity {
  aiSphere?: boolean;
  enemy?: boolean;
  pattern?: boolean;
  tension?: number;
  coherence?: number;
  position?: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
  health?: number;
  color?: string;
  progress?: number;
  speed?: number;
  type?: 'seek' | 'zigzag' | 'split' | 'wander';
  isBoss?: boolean;
  exploded?: boolean;
  crackLevel?: number;
}

export const world = new World<GameEntity>();

// Archetypes
export const enemies = world.with('enemy', 'position', 'health');
export const patterns = world.with('pattern', 'progress', 'speed', 'color');
