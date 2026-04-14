/**
 * Visual capture: neon raymarcher (Three.js implementation).
 *
 * Renders the standalone Three port from research/shaders/neon-raymarcher.ts
 * at two states (idle and high-tension) and captures screenshots.
 *
 * Reference screenshots land in research/__tests__/__screenshots__/.
 */

import { Color, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createNeonRaymarcher } from '../shaders/neon-raymarcher';
import { createThreeHarness, type ThreeHarness } from './helpers/three-harness';

describe('Three: neon raymarcher', () => {
  let harness: ThreeHarness | null = null;

  beforeEach(() => {
    harness = createThreeHarness({
      width: 512,
      height: 512,
      cameraPosition: new Vector3(0, 0, 1.5),
      cameraTarget: new Vector3(0, 0, 0),
      background: new Color(0x000000),
    });
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('idle (low tension, t=0)', async () => {
    if (!harness) throw new Error('harness not created');
    const raymarcher = createNeonRaymarcher(harness.scene);
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-neon-idle');
    raymarcher.dispose();
  });

  test('high tension (t=2s, boosted brightness)', async () => {
    if (!harness) throw new Error('harness not created');
    const raymarcher = createNeonRaymarcher(harness.scene);
    raymarcher.uniforms.u_tension.value = 0.9;
    raymarcher.update(2.0);
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-neon-tension');
    raymarcher.dispose();
  });
});
