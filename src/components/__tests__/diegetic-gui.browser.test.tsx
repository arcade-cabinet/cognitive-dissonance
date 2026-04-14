/**
 * Visual isolation test for DiegeticGUI (coherence ring).
 *
 * DiegeticGUI reads coherence from the Koota world, so each test sets the
 * Level trait before mount and resets it after.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import DiegeticGUI from '@/components/diegetic-gui';
import { useLevelStore } from '@/store/level-store';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('DiegeticGUI', () => {
  let harness: SceneHarness | null = null;

  beforeEach(() => {
    useLevelStore.getState().reset();
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
    useLevelStore.getState().reset();
  });

  test('creates coherence background ring', async () => {
    useLevelStore.setState({ coherence: 50 });
    harness = await mountScene(<DiegeticGUI />);
    await harness.waitFrames(3);

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('coherenceBgRing');
  });

  test('creates coherence arc at non-zero coherence', async () => {
    useLevelStore.setState({ coherence: 50 });
    harness = await mountScene(<DiegeticGUI />);
    await harness.waitFrames(3);

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('coherenceFgArc');
  });

  test('arc mesh reflects coherence 100', async () => {
    useLevelStore.setState({ coherence: 100 });
    harness = await mountScene(<DiegeticGUI />);
    await harness.waitFrames(3);

    const arc = harness.scene.getMeshByName('coherenceFgArc');
    expect(arc).toBeTruthy();
    expect(arc?.isEnabled()).toBe(true);
  });
});
