/**
 * Visual capture: post-process corruption (Three.js implementation).
 *
 * Renders a simple scene (colored cube), then applies the corruption pass
 * at two tension levels (calm and crisis). Screenshots capture the
 * post-processed output.
 *
 * Reference screenshots land in research/__tests__/__screenshots__/.
 */

import { AmbientLight, BoxGeometry, Color, Mesh, MeshStandardMaterial, PointLight, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createCorruptionPass } from '../shaders/post-process-corruption';
import { createThreeHarness, type ThreeHarness } from './helpers/three-harness';

describe('Three: post-process corruption', () => {
  let harness: ThreeHarness | null = null;

  beforeEach(() => {
    harness = createThreeHarness({
      width: 512,
      height: 512,
      cameraPosition: new Vector3(0, 0, 3),
      cameraTarget: new Vector3(0, 0, 0),
      background: new Color(0x111111),
    });
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  /**
   * Build a simple scene: a blue cube + point light.
   * The corruption pass needs something to corrupt.
   */
  function addSceneContent(h: ThreeHarness): Mesh {
    const geometry = new BoxGeometry(1.2, 1.2, 1.2);
    // High-intensity emissive so the cube reads even with strong vignette.
    const material = new MeshStandardMaterial({
      color: 0x2244cc,
      emissive: 0x1133aa,
      emissiveIntensity: 0.8,
    });
    const cube = new Mesh(geometry, material);
    cube.rotation.set(0.4, 0.6, 0); // 3/4 view of the cube
    h.scene.add(cube);

    h.scene.add(new AmbientLight(0xffffff, 0.4));
    const light = new PointLight(0xffffff, 4, 20);
    light.position.set(3, 4, 4);
    h.scene.add(light);

    return cube;
  }

  test('calm state (low tension=0.1)', async () => {
    if (!harness) throw new Error('harness not created');
    addSceneContent(harness);

    const corruption = createCorruptionPass(harness.renderer, harness.scene, harness.camera, {
      tension: 0.1,
      time: 0,
    });

    corruption.render();
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-corruption-calm');
    corruption.dispose();
  });

  test('crisis state (high tension=0.95)', async () => {
    if (!harness) throw new Error('harness not created');
    addSceneContent(harness);

    const corruption = createCorruptionPass(harness.renderer, harness.scene, harness.camera, {
      tension: 0.95,
      time: 3.0,
    });

    corruption.render();
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-corruption-crisis');
    corruption.dispose();
  });
});
