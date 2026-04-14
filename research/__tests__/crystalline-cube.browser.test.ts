/**
 * Visual capture: crystalline cube enemy material (Three.js).
 * Spec: research/visuals/02-crystalline-cube.md
 */

import { Color, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createCrystallineCube } from '../shaders/crystalline-cube';
import { createThreeHarness, type ThreeHarness } from './helpers/three-harness';

describe('Three: crystalline cube', () => {
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
    if (!harness) throw new Error();
    const cube = createCrystallineCube(harness.scene);
    cube.update(1.5); // small time offset so it's not perfectly aligned
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-crystalline-idle');
    cube.dispose();
  });

  test('high complexity + tension', async () => {
    if (!harness) throw new Error();
    const cube = createCrystallineCube(harness.scene);
    cube.uniforms.u_complexity.value = 9.0;
    cube.uniforms.u_colorShift.value = 0.7;
    cube.uniforms.u_tension.value = 0.9;
    cube.update(3.0);
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-crystalline-stressed');
    cube.dispose();
  });
});
