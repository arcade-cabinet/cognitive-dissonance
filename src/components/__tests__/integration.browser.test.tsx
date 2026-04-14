/**
 * Integration tests that mount multiple game components together to catch
 * issues that only appear when components interact (camera becoming active,
 * pattern + keycap interaction, shader materials coexisting, etc.)
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import AISphere from '@/components/ai-sphere';
import DiegeticGUI from '@/components/diegetic-gui';
import Platter from '@/components/platter';
import { useGameStore } from '@/store/game-store';
import { useLevelStore } from '@/store/level-store';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('Scene integration', () => {
  let harness: SceneHarness | null = null;

  beforeEach(() => {
    useGameStore.getState().setPhase('title');
    useLevelStore.getState().reset();
  });

  afterEach(async () => {
    // Give async Babylon.js texture loaders time to complete before tearing
    // down the scene (prevents postProcessManager null-access rejection)
    await new Promise((r) => setTimeout(r, 50));
    harness?.dispose();
    harness = null;
  });

  test('sphere + platter + gui render together without errors', async () => {
    harness = await mountScene(
      <>
        <AISphere reducedMotion={true} />
        <Platter />
        <DiegeticGUI coherence={50} />
      </>,
    );
    await harness.waitFrames(3);

    // All three component meshes should coexist
    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('aiSphereOuter');
    expect(names).toContain('platterBase');
    expect(names).toContain('coherenceBgRing');
  });

  test('scene has an active camera after mount', async () => {
    harness = await mountScene(
      <>
        <AISphere reducedMotion={true} />
        <Platter />
      </>,
    );
    await harness.waitFrames(3);

    expect(harness.scene.activeCamera).toBeTruthy();
    expect(harness.scene.activeCamera?.name).toBe('cam');
  });

  test('canvas is sized and has webgl2 context', async () => {
    harness = await mountScene(<AISphere reducedMotion={true} />);
    await harness.waitFrames(3);

    expect(harness.canvas.width).toBeGreaterThan(0);
    expect(harness.canvas.height).toBeGreaterThan(0);
    const gl = harness.canvas.getContext('webgl2');
    expect(gl).toBeTruthy();
  });

  test('engine renders frames without throwing', async () => {
    harness = await mountScene(
      <>
        <AISphere reducedMotion={true} />
        <Platter />
        <DiegeticGUI coherence={50} />
      </>,
    );

    // Render 30 frames manually - if anything throws, this fails
    expect(() => {
      for (let i = 0; i < 30; i++) harness!.scene.render();
    }).not.toThrow();
  });
});
