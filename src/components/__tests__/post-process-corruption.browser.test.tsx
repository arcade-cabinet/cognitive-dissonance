/**
 * Visual isolation test for PostProcessCorruption.
 *
 * Verifies the post-process chain mounts and applies to the active camera.
 */

import { afterEach, describe, expect, test } from 'vitest';
import PostProcessCorruption from '@/components/post-process-corruption';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('PostProcessCorruption', () => {
  let harness: SceneHarness | null = null;

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('mounts without crashing', async () => {
    harness = await mountScene(<PostProcessCorruption reducedMotion={true} />);
    await harness.waitFrames(3);
    expect(harness.scene).toBeTruthy();
  });

  test('attaches post-processes to active camera', async () => {
    harness = await mountScene(<PostProcessCorruption reducedMotion={false} />);
    await harness.waitFrames(3);

    const camera = harness.scene.activeCamera;
    expect(camera).toBeTruthy();
    // PostProcesses are attached as observers on the camera
    expect(camera?._postProcesses.length ?? 0).toBeGreaterThan(0);
  });
});
