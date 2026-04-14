/**
 * Performance sanity tests — verify render loop hits reasonable frame times
 * for isolated components. Low FPS in CI is expected (software WebGL), but
 * we want to catch regressions like O(n²) per-frame work.
 */

import { afterEach, describe, expect, test } from 'vitest';
import AISphere from '@/components/ai-sphere';
import DiegeticGUI from '@/components/diegetic-gui';
import Platter from '@/components/platter';
import SPSEnemies from '@/components/sps-enemies';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('Performance sanity', () => {
  let harness: SceneHarness | null = null;

  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 50));
    harness?.dispose();
    harness = null;
  });

  test('AISphere renders 60 frames in reasonable time (< 3s)', async () => {
    harness = await mountScene(<AISphere reducedMotion={true} />);
    await harness.waitFrames(5); // warmup

    const start = performance.now();
    for (let i = 0; i < 60; i++) harness.scene.render();
    const elapsed = performance.now() - start;

    // 60 frames should take < 3s (avg < 50ms/frame) even in software WebGL
    expect(elapsed).toBeLessThan(3000);
  });

  test('Full scene renders 60 frames in reasonable time (< 5s)', async () => {
    harness = await mountScene(
      <>
        <AISphere reducedMotion={true} />
        <Platter />
        <DiegeticGUI coherence={50} />
        <SPSEnemies />
      </>,
    );
    await harness.waitFrames(5);

    const start = performance.now();
    for (let i = 0; i < 60; i++) harness.scene.render();
    const elapsed = performance.now() - start;

    // Full scene is heavier but should still cap at < 5s for 60 frames
    expect(elapsed).toBeLessThan(5000);
  });
});
