/**
 * Visual isolation test for SPSEnemies (decorative SolidParticleSystem).
 */

import { afterEach, describe, expect, test } from 'vitest';
import SPSEnemies from '@/components/sps-enemies';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('SPSEnemies', () => {
  let harness: SceneHarness | null = null;

  afterEach(() => {
    harness?.dispose();
    harness = null;
  });

  test('creates enemiesSPS mesh', async () => {
    harness = await mountScene(<SPSEnemies />);
    await harness.waitFrames(3);

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('enemiesSPS');
  });
});
