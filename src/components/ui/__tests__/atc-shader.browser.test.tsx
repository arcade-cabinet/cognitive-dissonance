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

  afterEach(() => {
    root?.unmount();
    container?.remove();
    container = null;
    root = null;
  });

  test('creates a canvas element', async () => {
    container = document.createElement('div');
    container.style.width = '512px';
    container.style.height = '384px';
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(<ATCShader />);

    await new Promise((r) => setTimeout(r, 100));

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  test('canvas has non-zero dimensions after mount', async () => {
    container = document.createElement('div');
    container.style.width = '512px';
    container.style.height = '384px';
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(<ATCShader />);

    // Wait for resize to fire
    await new Promise((r) => setTimeout(r, 100));

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  test('canvas has working webgl2 context', async () => {
    container = document.createElement('div');
    container.style.width = '512px';
    container.style.height = '384px';
    document.body.appendChild(container);

    root = createRoot(container);
    root.render(<ATCShader />);

    await new Promise((r) => setTimeout(r, 100));

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2');
    expect(gl).toBeTruthy();
  });
});
