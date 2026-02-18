import * as BABYLON from '@babylonjs/core';

/**
 * Shared keycap-to-pattern color mapping.
 *
 * 12 keycap slots around the platter rim, each with a unique color
 * evenly spaced across the HSL hue wheel. Used by:
 *   - platter.tsx   → colors each decorative keycap
 *   - pattern-stabilizer.tsx → assigns a colorIndex to each pattern
 *
 * The buried seed picks a colorIndex (0-11) for each spawned pattern.
 * Only the keycap with the matching index pulls that pattern back.
 */

export const KEYCAP_COUNT = 12;

export interface KeycapColor {
  /** HSL hue in degrees (0-360) */
  hue: number;
  /** Babylon Color3 for mesh materials */
  color3: BABYLON.Color3;
  /** Babylon Color4 for particle systems (alpha = 1) */
  color4: BABYLON.Color4;
}

/**
 * Compute the color for a given keycap index.
 * Hue is evenly distributed: index 0 = 0°, index 6 = 180°, etc.
 */
export function getKeycapColor(index: number): KeycapColor {
  const safeIndex = ((index % KEYCAP_COUNT) + KEYCAP_COUNT) % KEYCAP_COUNT;
  const hue = (safeIndex / KEYCAP_COUNT) * 360;
  const color3 = BABYLON.Color3.FromHSV(hue, 0.85, 0.75);
  const color4 = new BABYLON.Color4(color3.r, color3.g, color3.b, 1.0);
  return { hue, color3, color4 };
}

/** Pre-computed color array for hot-path usage in render loops. */
export const KEYCAP_COLORS: KeycapColor[] = Array.from({ length: KEYCAP_COUNT }, (_, i) => getKeycapColor(i));
