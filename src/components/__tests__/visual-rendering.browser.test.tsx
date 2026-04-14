/**
 * Visual rendering assertions: verify components produce visible pixels on
 * the canvas, not just mesh existence.
 *
 * This catches the class of bugs where meshes exist but aren't rendered
 * (bad camera, invisible materials, wrong layer, etc.)
 *
 * Note: Material-only components like Platter (PBR black metal) and
 * DiegeticGUI (glow ring) need async shader compilation + env texture
 * loading before they produce visible pixels. AISphere has a procedural
 * celestial shader that renders immediately. We test the AISphere case
 * (reliable) and an explicit "scene renders clear color only when empty"
 * assertion.
 */

import { afterEach, describe, expect, test } from 'vitest';
import AISphere from '@/components/ai-sphere';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('Visual rendering', () => {
  let harness: SceneHarness | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.waitFrames(2);
      harness.dispose();
      harness = null;
    }
  });

  test('AISphere renders visible pixels (celestial shader)', async () => {
    harness = await mountScene(<AISphere reducedMotion={true} />);
    await harness.waitFrames(30); // shader compile + GSAP settle
    harness.scene.render();

    const brightness = sampleBrightness(harness.canvas);
    expect(brightness.anyBright).toBe(true);
  });

  test('Empty scene renders only clear color (black)', async () => {
    harness = await mountScene(null);
    await harness.waitFrames(5);
    harness.scene.render();

    const brightness = sampleBrightness(harness.canvas);
    expect(brightness.anyBright).toBe(false);
    expect(brightness.maxBrightness).toBeLessThan(10);
  });
});

/**
 * Sample pixels from canvas at a grid of points, return whether any are bright
 * and the max brightness seen.
 */
function sampleBrightness(canvas: HTMLCanvasElement): {
  anyBright: boolean;
  maxBrightness: number;
} {
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) throw new Error('no webgl context');

  const w = canvas.width;
  const h = canvas.height;
  const samples = 16;
  let maxB = 0;
  for (let x = 1; x < samples; x++) {
    for (let y = 1; y < samples; y++) {
      const px = new Uint8Array(4);
      const sx = Math.floor((x / samples) * w);
      const sy = Math.floor((y / samples) * h);
      gl.readPixels(sx, sy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const b = px[0] + px[1] + px[2];
      if (b > maxB) maxB = b;
    }
  }

  return { anyBright: maxB > 10, maxBrightness: maxB };
}
