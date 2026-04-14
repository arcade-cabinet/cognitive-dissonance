/**
 * Standalone Three.js render harness for visual isolation tests.
 *
 * Pure Three.js — no React, no game state, no Babylon. Used by
 * research/__tests__/*.browser.test.ts to render each isolated visual
 * piece, then `expect(canvas).toMatchScreenshot()` saves a baseline PNG
 * to research/__tests__/__screenshots__/.
 */

import { Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';

export interface ThreeHarness {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  canvas: HTMLCanvasElement;
  /** Render N frames serially. Used to advance shader time uniforms. */
  renderFrames(n: number): void;
  dispose(): void;
}

export interface ThreeHarnessOptions {
  width?: number;
  height?: number;
  /** Camera position (default 3/4 view). */
  cameraPosition?: Vector3;
  /** Camera target (default origin). */
  cameraTarget?: Vector3;
  /** Background color (default near-black to match game). */
  background?: Color;
  /** FOV in degrees (default 50). */
  fov?: number;
}

export function createThreeHarness(opts: ThreeHarnessOptions = {}): ThreeHarness {
  const width = opts.width ?? 512;
  const height = opts.height ?? 512;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  // Append to body so vitest's screenshot locator can find it.
  document.body.appendChild(canvas);

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false,
  });
  renderer.setSize(width, height, false);

  const scene = new Scene();
  scene.background = opts.background ?? new Color(0x0a0a0f);

  const camera = new PerspectiveCamera(opts.fov ?? 50, width / height, 0.1, 100);
  camera.position.copy(opts.cameraPosition ?? new Vector3(2, 2, 3));
  camera.lookAt(opts.cameraTarget ?? new Vector3(0, 0, 0));

  function renderFrames(n: number): void {
    for (let i = 0; i < n; i++) {
      renderer.render(scene, camera);
    }
  }

  function dispose(): void {
    renderer.dispose();
    canvas.remove();
  }

  return { scene, camera, renderer, canvas, renderFrames, dispose };
}
