/**
 * Visual isolation test for EnemySpawner.
 *
 * Verifies the phase-gating fix: enemies MUST NOT spawn during title phase
 * (otherwise they shatter the sphere before the player sees the title),
 * and MUST spawn once the phase transitions to 'playing'.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import EnemySpawner from '@/components/enemy-spawner';
import { useGameStore } from '@/store/game-store';
import { useLevelStore } from '@/store/level-store';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('EnemySpawner', () => {
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
    harness = await mountScene(<EnemySpawner />);
    await harness.waitFrames(3);
    expect(harness.scene).toBeTruthy();
  });

  test('does not raise tension during title phase', async () => {
    harness = await mountScene(<EnemySpawner />);
    const startTension = useLevelStore.getState().tension;
    await harness.waitFrames(60); // 1s

    const endTension = useLevelStore.getState().tension;
    // Tension must NOT increase during title — this is the bug we fixed
    expect(endTension).toBeLessThanOrEqual(startTension);
  });

  test('does not spawn enemy meshes during title phase', async () => {
    harness = await mountScene(<EnemySpawner />);
    await harness.waitFrames(60);

    // Enemy meshes are named `enemy{id}`
    const enemies = harness.scene.meshes.filter((m) => /^enemy\d+$/.test(m.name));
    expect(enemies.length).toBe(0);
  });

  test('spawns enemy meshes during playing phase', async () => {
    harness = await mountScene(<EnemySpawner />);
    useGameStore.getState().setPhase('playing');
    await harness.waitFrames(150); // 2.5s — enough for initial spawn wave

    const enemies = harness.scene.meshes.filter((m) => /^enemy\d+$/.test(m.name));
    expect(enemies.length).toBeGreaterThan(0);
  });
});
