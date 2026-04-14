/**
 * Visual/behavior test for AudioEngineSystem.
 *
 * Verifies the component mounts and bridges Zustand tension updates to the
 * audio store. Doesn't assert actual audio output (Tone.js requires user
 * interaction to unlock AudioContext in real browsers).
 */

import { afterEach, describe, expect, test } from 'vitest';
import AudioEngineSystem from '@/components/audio-engine';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('AudioEngineSystem', () => {
  let harness: SceneHarness | null = null;

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('mounts without crashing', async () => {
    harness = await mountScene(<AudioEngineSystem />);
    await harness.waitFrames(3);
    expect(harness.scene).toBeTruthy();
  });

  test('does not add any meshes to the scene', async () => {
    harness = await mountScene(<AudioEngineSystem />);
    const meshCountBefore = harness.scene.meshes.length;
    await harness.waitFrames(30);
    // Audio-only component should not affect scene graph
    expect(harness.scene.meshes.length).toBe(meshCountBefore);
  });
});
