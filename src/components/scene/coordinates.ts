/**
 * Coordinate conversion utilities for 3D scene rendering.
 *
 * Converts game-space coordinates (800x600) to Three.js scene-space.
 * Game origin (0,0) is top-left; scene origin (0,0,0) is center.
 */

import { GAME_HEIGHT, GAME_WIDTH } from '../../lib/constants';

/** Convert game X (0-800) to scene X (-4 to 4) */
export function gx(x: number): number {
  return (x - GAME_WIDTH / 2) / 100;
}

/** Convert game Y (0-600) to scene Y (3 to -3) */
export function gy(y: number): number {
  return -(y - GAME_HEIGHT / 2) / 100;
}
