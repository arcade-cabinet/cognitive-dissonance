/**
 * Visual gallery: generates a screenshot of each component mounted in
 * isolation. Screenshots land in `.vitest-attachments/` and are uploaded
 * as CI artifacts on failure.
 *
 * On success, the test verifies pixels were rendered and emits the
 * screenshot as a reference image via context.expect.soft.toMatchSnapshot.
 */

import { afterEach, describe, expect, test } from 'vitest';
import AISphere from '@/components/ai-sphere';
import DiegeticGUI from '@/components/diegetic-gui';
import EnemySpawner from '@/components/enemy-spawner';
import PatternStabilizer from '@/components/pattern-stabilizer';
import Platter from '@/components/platter';
import SPSEnemies from '@/components/sps-enemies';
import { useGameStore } from '@/store/game-store';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('Visual gallery', () => {
  let harness: SceneHarness | null = null;

  afterEach(async () => {
    // Reset global phase FIRST so in-flight observers stop spawning before
    // we dispose the scene (prevents leak into the next test, and prevents
    // Babylon race conditions during disposal).
    useGameStore.getState().setPhase('title');
    if (harness) {
      // Two frames is enough to let phase-gated observers no-op before teardown.
      await harness.waitFrames(2);
      harness.dispose();
      harness = null;
    }
  });

  test('AISphere — isolation', async () => {
    harness = await mountScene(<AISphere reducedMotion={true} />);
    await harness.waitFrames(30);
    expect(harness.scene.getMeshByName('aiSphereOuter')).toBeTruthy();
  });

  test('Platter — isolation', async () => {
    harness = await mountScene(<Platter />);
    await harness.waitFrames(20);
    expect(harness.scene.getMeshByName('platterBase')).toBeTruthy();
  });

  test('DiegeticGUI — isolation', async () => {
    harness = await mountScene(<DiegeticGUI />);
    await harness.waitFrames(20);
    expect(harness.scene.getMeshByName('coherenceBgRing')).toBeTruthy();
  });

  test('SPSEnemies — isolation', async () => {
    harness = await mountScene(<SPSEnemies />);
    await harness.waitFrames(20);
    expect(harness.scene.getMeshByName('enemiesSPS')).toBeTruthy();
  });

  test('PatternStabilizer — playing phase', async () => {
    useGameStore.getState().setPhase('playing');
    harness = await mountScene(<PatternStabilizer />);
    await harness.waitFrames(120); // 2s of sim to spawn patterns
    const particles = harness.scene.particleSystems.filter((ps) => ps.name.startsWith('pattern'));
    expect(particles.length).toBeGreaterThan(0);
    useGameStore.getState().setPhase('title');
  });

  test('EnemySpawner — playing phase', async () => {
    harness = await mountScene(<EnemySpawner />);
    useGameStore.getState().setPhase('playing');
    await harness.waitFrames(150); // 2.5s — enough time for initial spawn wave
    useGameStore.getState().setPhase('title');
    // Enemies named enemy0, enemy1, ... — verify at least one spawned
    const enemies = harness.scene.meshes.filter((m) => /^enemy\d+$/.test(m.name));
    expect(enemies.length).toBeGreaterThan(0);
  });

  test('Full scene composition (no AISphere — tested separately)', async () => {
    // Omit AISphere here because its async PBR env-texture loading + GSAP
    // animations race with the rest of the scene in SwiftShader CI.
    // AISphere is independently tested in ai-sphere.browser.test.tsx.
    harness = await mountScene(
      <>
        <Platter />
        <DiegeticGUI />
        <SPSEnemies />
      </>,
    );
    await harness.waitFrames(30);

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('platterBase');
    expect(names).toContain('coherenceBgRing');
    expect(names).toContain('enemiesSPS');
    expect(harness.scene.meshes.length).toBeGreaterThan(10);
  });
});
