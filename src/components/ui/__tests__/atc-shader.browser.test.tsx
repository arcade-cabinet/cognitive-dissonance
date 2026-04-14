/**
 * Visual isolation test for ATCShader — the WebGL2 fullscreen tanh raymarcher
 * background. Runs independently of Babylon (own WebGL context).
 */

import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import ATCShader from '@/components/ui/atc-shader';

describe('ATCShader', () => {
  let container: HTMLElement | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: React Root has no public type export
  let root: any = null;

  /** Mount ATCShader and wait for the canvas to appear (polling, max 2s). */
  async function mountAndWait(): Promise<HTMLCanvasElement> {
    container = document.createElement('div');
    container.style.width = '512px';
    container.style.height = '384px';
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(<ATCShader />);

    // Poll for canvas — replaces a fragile fixed sleep that flaked under CI load.
    const start = Date.now();
    while (Date.now() - start < 2000) {
      const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas && canvas.width > 0 && canvas.height > 0) return canvas;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    throw new Error('ATCShader canvas did not appear within 2s');
  }

  afterEach(() => {
    root?.unmount();
    container?.remove();
    container = null;
    root = null;
  });

  test('creates a canvas element', async () => {
    const canvas = await mountAndWait();
    expect(canvas).toBeTruthy();
  });

  test('canvas has non-zero dimensions after mount', async () => {
    const canvas = await mountAndWait();
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  test('canvas has working webgl2 context', async () => {
    const canvas = await mountAndWait();
    const gl = canvas.getContext('webgl2');
    expect(gl).toBeTruthy();
  });
});
