/**
 * Visual isolation test for Platter.
 *
 * Verifies the industrial platter base, rim, track, and 12 keycaps all mount
 * correctly.
 */

import { afterEach, describe, expect, test } from 'vitest';
import Platter from '@/components/platter';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('Platter', () => {
  let harness: SceneHarness | null = null;

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('creates platter base, rim, and track', async () => {
    harness = await mountScene(<Platter />);
    await harness.waitFrames(3);

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('platterBase');
    expect(names).toContain('rim');
    expect(names).toContain('track');
  });

  test('creates 12 decorative keycaps', async () => {
    harness = await mountScene(<Platter />);
    await harness.waitFrames(3);

    const decorKeys = harness.scene.meshes.filter((m) => m.name.startsWith('decorKey'));
    expect(decorKeys).toHaveLength(12);
  });

  test('creates play, continue, and pause keys', async () => {
    harness = await mountScene(<Platter />);
    await harness.waitFrames(3);

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('playKeycap');
    expect(names).toContain('continueKeycap');
    expect(names).toContain('pauseKey');
  });
});
