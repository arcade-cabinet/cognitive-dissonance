/**
 * Visual isolation test for AISphere.
 *
 * Verifies the glass outer sphere and celestial inner sphere mount correctly,
 * appear in the scene, and render to canvas.
 */

import { afterEach, describe, expect, test } from 'vitest';
import AISphere from '@/components/ai-sphere';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('AISphere', () => {
  let harness: SceneHarness | null = null;

  afterEach(async () => {
    // Allow async PBR env texture loads to complete before disposal
    await new Promise((r) => setTimeout(r, 50));
    harness?.dispose();
    harness = null;
  });

  test('creates aiSphereOuter and aiSphereInner meshes', async () => {
    harness = await mountScene(<AISphere reducedMotion={true} />);
    await harness.waitFrames(3);

    const meshNames = harness.scene.meshes.map((m) => m.name);
    expect(meshNames).toContain('aiSphereOuter');
    expect(meshNames).toContain('aiSphereInner');
  });

  test('spheres have materials attached', async () => {
    harness = await mountScene(<AISphere reducedMotion={true} />);
    await harness.waitFrames(3);

    const outer = harness.scene.getMeshByName('aiSphereOuter');
    const inner = harness.scene.getMeshByName('aiSphereInner');
    expect(outer?.material).toBeTruthy();
    expect(inner?.material).toBeTruthy();
  });

  test('spheres are positioned above origin', async () => {
    harness = await mountScene(<AISphere reducedMotion={true} />);
    await harness.waitFrames(3);

    const outer = harness.scene.getMeshByName('aiSphereOuter');
    expect(outer?.position.y).toBeGreaterThan(0);
  });
});
