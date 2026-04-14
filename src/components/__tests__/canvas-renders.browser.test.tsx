/**
 * Canary test for the Vitest browser mode infrastructure.
 *
 * Verifies that:
 * 1. A Babylon.js Engine + Scene can be created in a real browser
 * 2. WebGL2 is available and functional
 * 3. The scene clear color renders to the canvas
 *
 * If this fails, none of the component visual tests will work.
 */

import '@babylonjs/core/Materials/standardMaterial';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

describe('Babylon browser canary', () => {
  let canvas: HTMLCanvasElement;
  let engine: Engine;
  let scene: Scene;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    document.body.appendChild(canvas);

    engine = new Engine(canvas, true);
    scene = new Scene(engine);
    scene.clearColor = new Color4(0.8, 0.2, 0.4, 1);

    // Camera required for any render
    const cam = new FreeCamera('cam', new Vector3(0, 0, -5), scene);
    cam.setTarget(Vector3.Zero());
    scene.activeCamera = cam;
  });

  afterEach(() => {
    scene?.dispose();
    engine?.dispose();
    canvas?.remove();
  });

  test('canvas exists in DOM', () => {
    expect(canvas).toBeTruthy();
    expect(canvas.getContext('webgl2')).toBeTruthy();
  });

  test('scene renders the clear color to canvas', () => {
    scene.render();
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('no webgl2');

    const pixels = new Uint8Array(4);
    gl.readPixels(256, 192, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Clear color (0.8, 0.2, 0.4) * 255 ≈ (204, 51, 102) — allow 5 unit tolerance
    expect(pixels[0]).toBeGreaterThan(190);
    expect(pixels[0]).toBeLessThan(220);
    expect(pixels[1]).toBeLessThan(70);
    expect(pixels[2]).toBeGreaterThan(80);
    expect(pixels[2]).toBeLessThan(120);
    expect(pixels[3]).toBe(255);
  });
});
