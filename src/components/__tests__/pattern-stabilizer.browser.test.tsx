/**
 * Visual isolation test for PatternStabilizer.
 *
 * Verifies patterns spawn when the game is in playing phase.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import PatternStabilizer from '@/components/pattern-stabilizer';
import { useGameStore } from '@/store/game-store';
import { useLevelStore } from '@/store/level-store';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('PatternStabilizer', () => {
  let harness: SceneHarness | null = null;

  beforeEach(() => {
    useGameStore.getState().setPhase('title');
    useLevelStore.getState().reset();
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
    useGameStore.getState().setPhase('title');
  });

  test('mounts without crashing', async () => {
    harness = await mountScene(<PatternStabilizer />);
    await harness.waitFrames(3);
    // If we got here, the component mounted successfully
    expect(harness.scene).toBeTruthy();
  });

  test('does not spawn particle systems during title phase', async () => {
    harness = await mountScene(<PatternStabilizer />);
    await harness.waitFrames(10);

    const patterns = harness.scene.particleSystems.filter((ps) => ps.name.startsWith('pattern'));
    expect(patterns.length).toBe(0);
  });

  test('spawns particle systems during playing phase', async () => {
    harness = await mountScene(<PatternStabilizer />);
    useGameStore.getState().setPhase('playing');
    await harness.waitFrames(120); // ~2s worth of frames to allow spawn

    const patterns = harness.scene.particleSystems.filter((ps) => ps.name.startsWith('pattern'));
    expect(patterns.length).toBeGreaterThan(0);
  });
});
