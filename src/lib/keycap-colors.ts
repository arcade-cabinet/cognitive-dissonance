import { Color } from 'three';

/**
 * Shared keycap-to-pattern color mapping.
 *
 * Legacy helper — retained so gameplay code that assigns pattern
 * `colorIndex` values can still resolve a concrete RGB. New level schemas
 * pass explicit hex strings directly via Level.inputSchema.
 */

export const KEYCAP_COUNT = 12;

export interface KeycapColor {
  /** HSL hue in degrees (0-360) */
  hue: number;
  /** three.js Color for mesh materials */
  color: Color;
  /** Hex string for CSS / shader uniforms / serialization */
  hex: string;
}

/**
 * Compute the color for a given keycap index.
 * Hue is evenly distributed: index 0 = 0°, index 6 = 180°, etc.
 */
export function getKeycapColor(index: number): KeycapColor {
  const safeIndex = ((index % KEYCAP_COUNT) + KEYCAP_COUNT) % KEYCAP_COUNT;
  const hue = (safeIndex / KEYCAP_COUNT) * 360;
  // Approximates HSV(h, 0.85, 0.75) → HSL(h, 0.75, 0.47).
  const color = new Color().setHSL(hue / 360, 0.75, 0.47);
  return { hue, color, hex: `#${color.getHexString()}` };
}

/** Pre-computed color array for hot-path usage in render loops. */
export const KEYCAP_COLORS: KeycapColor[] = Array.from({ length: KEYCAP_COUNT }, (_, i) => getKeycapColor(i));
