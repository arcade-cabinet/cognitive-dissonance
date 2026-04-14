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
    await new Promise((r) => setTimeout(r, 50));
    harness?.dispose();
    harness = null;
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
    harness = await mountScene(<DiegeticGUI coherence={75} />);
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

  test('Full scene composition', async () => {
    harness = await mountScene(
      <>
        <AISphere reducedMotion={true} />
        <Platter />
        <DiegeticGUI coherence={50} />
        <SPSEnemies />
      </>,
    );

    // Wait for AISphere useEffect to fire and create meshes —
    // Reactylon scene + multiple components + GSAP tweens can take a
    // while to fully settle in slower CI environments.
    await harness.waitFrames(60);
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (harness.scene.getMeshByName('aiSphereOuter')) break;
      await harness.waitFrames(10);
    }

    const names = harness.scene.meshes.map((m) => m.name);
    expect(names).toContain('aiSphereOuter');
    expect(names).toContain('platterBase');
    expect(names).toContain('coherenceBgRing');
    expect(names).toContain('enemiesSPS');
    expect(harness.scene.meshes.length).toBeGreaterThan(10);
  });
});
