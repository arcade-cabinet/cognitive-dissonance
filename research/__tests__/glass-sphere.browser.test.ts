/**
 * Visual capture: glass sphere material (Three.js MeshPhysicalMaterial).
 * Spec: research/visuals/06-glass-sphere.md
 *
 * Uses RoomEnvironment (a PMREMGenerator-processed procedural scene) as the
 * env map, so we don't need an HDR asset in the repo and we still get
 * believable reflections + transmission through the glass.
 */

import {
  AmbientLight,
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PointLight,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createGlassSphere } from '../shaders/glass-sphere';
import { createThreeHarness, type ThreeHarness } from './helpers/three-harness';

describe('Three: glass sphere', () => {
  let harness: ThreeHarness | null = null;

  beforeEach(() => {
    harness = createThreeHarness({
      width: 512,
      height: 512,
      cameraPosition: new Vector3(0, 0.3, 3.5),
      cameraTarget: new Vector3(0, 0, 0),
      background: new Color(0x0a0a0f),
    });

    // Build an env map so transmission has something to refract against.
    const pmrem = new PMREMGenerator(harness.renderer);
    harness.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // A colored cube behind the sphere gives refraction a visible subject.
    const cube = new Mesh(
      new BoxGeometry(0.8, 0.8, 0.8),
      new MeshStandardMaterial({ color: 0x6633aa, roughness: 0.5 }),
    );
    cube.position.set(0, 0, -2.0); // behind the sphere relative to camera
    harness.scene.add(cube);

    // Key light so specular highlights read on the sphere surface.
    harness.scene.add(new AmbientLight(0xffffff, 0.4));
    const key = new PointLight(0xffffff, 6, 20);
    key.position.set(2, 3, 3);
    harness.scene.add(key);
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('calm (tension=0) — clear glass, blue tint', async () => {
    if (!harness) throw new Error('harness not created');
    const sphere = createGlassSphere(harness.scene, { radius: 1, tension: 0 });
    harness.renderFrames(3);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot('three-glass-sphere-calm');
    sphere.dispose();
  });

  test('stressed (tension=0.6) — partial frost + iridescence onset', async () => {
    if (!harness) throw new Error('harness not created');
    const sphere = createGlassSphere(harness.scene, { radius: 1, tension: 0.6 });
    harness.renderFrames(3);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot(
      'three-glass-sphere-stressed',
    );
    sphere.dispose();
  });

  test('crisis (tension=1) — frosted + red tint + iridescent stress', async () => {
    if (!harness) throw new Error('harness not created');
    const sphere = createGlassSphere(harness.scene, { radius: 1, tension: 1 });
    harness.renderFrames(3);
    await expect(page.elementLocator(harness.canvas)).toMatchScreenshot(
      'three-glass-sphere-crisis',
    );
    sphere.dispose();
  });
});
