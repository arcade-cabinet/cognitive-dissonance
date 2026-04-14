/**
 * Visual capture: celestial nebula (Three.js implementation).
 *
 * Renders the standalone Three port from research/shaders/celestial-nebula.ts
 * at three time points (t=0, t=2s, t=8s) and captures screenshots for
 * comparison against the Babylon original.
 *
 * Reference screenshots land in research/__tests__/__screenshots__/.
 */

import { Color, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createCelestialNebula } from '../shaders/celestial-nebula';
import { createThreeHarness, type ThreeHarness } from './helpers/three-harness';

describe('Three: celestial nebula', () => {
  let harness: ThreeHarness | null = null;

  beforeEach(() => {
    harness = createThreeHarness({
      width: 512,
      height: 512,
      cameraPosition: new Vector3(0, 0, 1.2), // close-up frontal
      cameraTarget: new Vector3(0, 0, 0),
      background: new Color(0x000000),
    });
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('calm state (t=0, default uniforms)', async () => {
    if (!harness) throw new Error('harness not created');
    const nebula = createCelestialNebula(harness.scene);
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-celestial-calm');
    nebula.dispose();
  });

  test('mid-tension (t=2s, denser clouds)', async () => {
    if (!harness) throw new Error('harness not created');
    const nebula = createCelestialNebula(harness.scene);
    nebula.uniforms.u_cloud_density.value = 4.0;
    nebula.uniforms.u_glow_intensity.value = 2.5;
    nebula.uniforms.u_color1.value.set('#5a3a3a'); // muddied red-blue
    nebula.uniforms.u_color2.value.set('#c84a4a'); // crisis red
    nebula.update(2.0); // advance time 2s
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-celestial-mid-tension');
    nebula.dispose();
  });

  test('crisis (t=8s, max chaos)', async () => {
    if (!harness) throw new Error('harness not created');
    const nebula = createCelestialNebula(harness.scene);
    nebula.uniforms.u_cloud_density.value = 6.0;
    nebula.uniforms.u_glow_intensity.value = 4.0;
    nebula.uniforms.u_color1.value.set('#8e2a2a');
    nebula.uniforms.u_color2.value.set('#ff4444');
    nebula.update(8.0);
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-celestial-crisis');
    nebula.dispose();
  });
});
