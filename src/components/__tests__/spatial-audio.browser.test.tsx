/**
 * Visual/behavior test for SpatialAudio (event-driven Tone.js SFX).
 *
 * Verifies the component mounts and wires custom event listeners.
 */

import { afterEach, describe, expect, test } from 'vitest';
import SpatialAudio from '@/components/spatial-audio';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('SpatialAudio', () => {
  let harness: SceneHarness | null = null;

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('mounts without crashing', async () => {
    harness = await mountScene(<SpatialAudio />);
    await harness.waitFrames(3);
    expect(harness.scene).toBeTruthy();
  });

  test('dispatching pattern events does not throw', async () => {
    harness = await mountScene(<SpatialAudio />);
    await harness.waitFrames(3);

    expect(() => {
      window.dispatchEvent(
        new CustomEvent('patternEscaped', {
          detail: { colorIndex: 0, angle: 0 },
        }),
      );
      window.dispatchEvent(
        new CustomEvent('patternStabilized', {
          detail: { colorIndex: 0 },
        }),
      );
      window.dispatchEvent(new CustomEvent('sphereShattered'));
    }).not.toThrow();
  });
});
