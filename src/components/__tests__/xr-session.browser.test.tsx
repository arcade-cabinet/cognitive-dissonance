/**
 * Visual/behavior test for XRSession.
 *
 * Verifies the component mounts without crashing when WebXR is not available
 * (default Chromium headless environment).
 */

import { afterEach, describe, expect, test } from 'vitest';
import XRSession from '@/components/xr-session';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('XRSession', () => {
  let harness: SceneHarness | null = null;

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('mounts gracefully when WebXR is unavailable', async () => {
    harness = await mountScene(<XRSession />);
    await harness.waitFrames(3);
    expect(harness.scene).toBeTruthy();
  });
});
