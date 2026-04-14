/**
 * Helper for mounting a Reactylon Scene with a game component in isolation
 * for visual component tests. Returns a harness with access to the canvas,
 * scene, and a helper to read pixels after frames render.
 */

import * as BABYLON from '@babylonjs/core';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Scene } from 'reactylon';
import { Engine } from 'reactylon/web';

export interface SceneHarness {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  scene: BABYLON.Scene;
  engine: BABYLON.AbstractEngine;
  /** Render N frames synchronously and return center pixel RGBA */
  readCenterPixel(frames?: number): { r: number; g: number; b: number; a: number };
  /** Wait for N animation frames to elapse */
  waitFrames(n: number): Promise<void>;
  dispose(): void;
}

/**
 * Mount a Reactylon scene containing the given children. Creates a camera
 * procedurally (workaround for Reactylon "No active camera after first commit"
 * warning when cameras are declared in JSX).
 */
export async function mountScene(children: ReactNode): Promise<SceneHarness> {
  const container = document.createElement('div');
  container.style.width = '512px';
  container.style.height = '384px';
  document.body.appendChild(container);

  let capturedScene: BABYLON.Scene | null = null;

  const root = createRoot(container);

  root.render(
    <Engine
      forceWebGL={true}
      engineOptions={{
        antialias: false,
        adaptToDeviceRatio: false,
        audioEngine: false,
        preserveDrawingBuffer: true,
      }}
    >
      <Scene
        onSceneReady={(s) => {
          capturedScene = s;
          s.clearColor = new BABYLON.Color4(0, 0, 0, 1);
          const cam = new BABYLON.ArcRotateCamera('cam', Math.PI / 4, Math.PI / 3, 8, BABYLON.Vector3.Zero(), s);
          s.activeCamera = cam;
        }}
      >
        {children}
      </Scene>
    </Engine>,
  );

  // Wait for engine to mount and scene to be ready. If setup fails, clean up
  // the mounted root + DOM so the failure doesn't leak state into sibling tests.
  let scene: BABYLON.Scene;
  let canvas: HTMLCanvasElement;
  try {
    scene = await waitForScene(() => capturedScene);
    const maybeCanvas = container.querySelector('canvas');
    if (!maybeCanvas) throw new Error('Canvas not created by Reactylon');
    canvas = maybeCanvas;
  } catch (err) {
    try {
      root.unmount();
    } catch {
      // ignore — we're already in an error path
    }
    container.remove();
    throw err;
  }

  return {
    container,
    canvas,
    scene,
    engine: scene.getEngine(),
    readCenterPixel(frames = 1) {
      for (let i = 0; i < frames; i++) scene.render();
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) throw new Error('no webgl context');
      const px = new Uint8Array(4);
      gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return { r: px[0], g: px[1], b: px[2], a: px[3] };
    },
    async waitFrames(n: number) {
      for (let i = 0; i < n; i++) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        scene.render();
      }
    },
    dispose() {
      const engine = scene.getEngine();
      root.unmount();
      scene.dispose();
      engine.dispose(); // Prevents WebGL context leak across tests
      container.remove();
    },
  };
}

async function waitForScene(getter: () => BABYLON.Scene | null, timeout = 2000): Promise<BABYLON.Scene> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const s = getter();
    if (s) return s;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Scene did not become ready within timeout');
}
