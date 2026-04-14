/**
 * Visual isolation test for DiegeticGUI (coherence ring).
 */

import { afterEach, describe, expect, test } from 'vitest';
import DiegeticGUI from '@/components/diegetic-gui';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('DiegeticGUI', () => {
  let harness: SceneHarness | null = null;

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('creates coherence background ring', async () => {
    harness = await mountScene(<DiegeticGUI coherence={50} />);
    await harness.waitFrames(3);

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('coherenceBgRing');
  });

  test('creates coherence arc at non-zero coherence', async () => {
    harness = await mountScene(<DiegeticGUI coherence={50} />);
    await harness.waitFrames(3);

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('coherenceFgArc');
  });

  test('arc mesh reflects coherence 100', async () => {
    harness = await mountScene(<DiegeticGUI coherence={100} />);
    await harness.waitFrames(3);

    const arc = harness.scene.getMeshByName('coherenceFgArc');
    expect(arc).toBeTruthy();
    expect(arc?.isEnabled()).toBe(true);
  });
});
