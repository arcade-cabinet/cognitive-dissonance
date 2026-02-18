import { World } from 'miniplex';

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

export const world = new World<GameEntity>();

// Archetypes for querying
export const enemies = world.with('enemy', 'position', 'health');
export const patterns = world.with('pattern', 'progress', 'speed', 'color');
