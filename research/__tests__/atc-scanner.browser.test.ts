/**
 * Visual capture: ATC scanner (Three.js implementation).
 *
 * Renders the standalone Three port from research/shaders/atc-scanner.ts
 * at two time points (t=0 and t=5s) and captures screenshots.
 *
 * Reference screenshots land in research/__tests__/__screenshots__/.
 */

import { Color, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createATCScanner, DEFAULT_ATC_SCANNER_UNIFORMS } from '../shaders/atc-scanner';
import { createThreeHarness, type ThreeHarness } from './helpers/three-harness';

describe('Three: ATC scanner', () => {
  let harness: ThreeHarness | null = null;

  beforeEach(() => {
    harness = createThreeHarness({
      width: 512,
      height: 512,
      // Orthographic-style front view — camera looks straight at the quad
      cameraPosition: new Vector3(0, 0, 5),
      cameraTarget: new Vector3(0, 0, 0),
      background: new Color(0x000000),
      fov: 45,
    });
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('initial state (t=0)', async () => {
    if (!harness) throw new Error('harness not created');
    const uniforms = DEFAULT_ATC_SCANNER_UNIFORMS(512, 512);
    uniforms.u_time.value = 0;
    const scanner = createATCScanner(harness.scene, 10, new Vector3(0, 0, 0), uniforms);
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-atc-t0');
    scanner.dispose();
  });

  test('animated state (t=5s)', async () => {
    if (!harness) throw new Error('harness not created');
    const uniforms = DEFAULT_ATC_SCANNER_UNIFORMS(512, 512);
    const scanner = createATCScanner(harness.scene, 10, new Vector3(0, 0, 0), uniforms);
    scanner.update(5.0);
    harness.renderFrames(2);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-atc-t5');
    scanner.dispose();
  });
});
