/**
 * Visual capture: industrial platter (Three.js MeshPhysicalMaterial with anisotropy).
 * Spec: research/visuals/07-industrial-platter.md
 *
 * Renders the bare platter in isolation — no sphere, no controls, no rain —
 * so we can judge the brushed-metal chassis on its own. Three tension states
 * to see how the rim emissive reads (calm dark → crisis red-hot).
 *
 * A RoomEnvironment is used for reflections so the brushed anisotropy catches
 * real highlights rather than sitting flat.
 */

import {
  Color,
  DirectionalLight,
  PMREMGenerator,
  PointLight,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createIndustrialPlatter } from '../shaders/industrial-platter';
import { createThreeHarness, type ThreeHarness } from './helpers/three-harness';

describe('Three: industrial platter', () => {
  let harness: ThreeHarness | null = null;

  beforeEach(() => {
    harness = createThreeHarness({
      width: 512,
      height: 512,
      // Three-quarter top-down view, camera on the +Z axis so the disc centres.
      cameraPosition: new Vector3(0, 2.2, 3.6),
      cameraTarget: new Vector3(0, 0.15, 0),
      background: new Color(0x08080c),
    });

    const pmrem = new PMREMGenerator(harness.renderer);
    harness.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Key light — hard, side-angled so the anisotropic brushed grain catches
    // a rim highlight on the base disc.
    const key = new DirectionalLight(0xffffff, 2.5);
    key.position.set(4, 5, 2);
    harness.scene.add(key);

    // Secondary warm point light — reads the rim emissive color without killing it
    const fill = new PointLight(0x334466, 1.2, 10);
    fill.position.set(-3, 2, -2);
    harness.scene.add(fill);
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('calm (tension=0) — cold brushed metal, rim barely lit', async () => {
    if (!harness) throw new Error('harness not created');
    const platter = createIndustrialPlatter(harness.scene, { tension: 0 });
    harness.renderFrames(3);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot(
      'three-industrial-platter-calm',
    );
    platter.dispose();
  });

  test('warning (tension=0.5) — rim emissive warming, metal holding', async () => {
    if (!harness) throw new Error('harness not created');
    const platter = createIndustrialPlatter(harness.scene, { tension: 0.5 });
    harness.renderFrames(3);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot(
      'three-industrial-platter-warning',
    );
    platter.dispose();
  });

  test('crisis (tension=1) — rim glowing red-hot, metal stressed', async () => {
    if (!harness) throw new Error('harness not created');
    const platter = createIndustrialPlatter(harness.scene, { tension: 1 });
    harness.renderFrames(3);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot(
      'three-industrial-platter-crisis',
    );
    platter.dispose();
  });
});
