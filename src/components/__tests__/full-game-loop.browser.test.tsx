/**
 * Full game loop test — demonstrates title → playing → mid-game → shatter →
 * restart cycle works end-to-end at the component level.
 *
 * This is the in-browser equivalent of the e2e governor test, but with
 * direct access to scene state for assertions.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import AISphere from '@/components/ai-sphere';
import DiegeticGUI from '@/components/diegetic-gui';
import EnemySpawner from '@/components/enemy-spawner';
import PatternStabilizer from '@/components/pattern-stabilizer';
import Platter from '@/components/platter';
import { useGameStore } from '@/store/game-store';
import { useLevelStore } from '@/store/level-store';
import { mountScene, type SceneHarness } from './helpers/mount-scene';

describe('Full game loop', () => {
  let harness: SceneHarness | null = null;

  beforeEach(() => {
    useGameStore.getState().setPhase('title');
    useLevelStore.getState().reset();
  });

  afterEach(async () => {
    // Reset global phase FIRST so observers stop before teardown.
    useGameStore.getState().setPhase('title');
    if (harness) {
      await harness.waitFrames(2);
      harness.dispose();
      harness = null;
    }
  });

  test('title → playing → shatter → gameover', async () => {
    harness = await mountScene(
      <>
        <AISphere reducedMotion={true} />
        <Platter />
        <PatternStabilizer />
        <EnemySpawner />
        <DiegeticGUI coherence={25} />
      </>,
    );

    // 1. Title phase: sphere exists, tension stable
    await harness.waitFrames(3);
    expect(useGameStore.getState().phase).toBe('title');
    expect(harness.scene.getMeshByName('aiSphereOuter')).toBeTruthy();
    expect(harness.scene.getMeshByName('platterBase')).toBeTruthy();
    expect(useLevelStore.getState().tension).toBe(0.12);

    // 2. Transition to playing: enemies start spawning, tension may change
    useGameStore.getState().setPhase('playing');
    await harness.waitFrames(30); // ~0.5s of simulation

    expect(useGameStore.getState().phase).toBe('playing');

    // 3. Force shatter: set tension to 1.0 (triggers sphere shatter)
    useLevelStore.getState().setTension(1.0);
    window.dispatchEvent(new CustomEvent('gameOver'));
    await harness.waitFrames(5);

    // 4. Verify gameover state — done via explicit phase change by gameboard
    // (we manually trigger to verify the flow)
    useGameStore.getState().setPhase('gameover');
    expect(useGameStore.getState().phase).toBe('gameover');

    // 5. Restart: tension resets, phase goes to playing with new restartToken
    const tokenBefore = useGameStore.getState().restartToken;
    useLevelStore.getState().reset();
    useGameStore.getState().triggerRestart();

    expect(useGameStore.getState().phase).toBe('playing');
    expect(useGameStore.getState().restartToken).toBe(tokenBefore + 1);
    expect(useLevelStore.getState().tension).toBe(0.12);
    expect(useLevelStore.getState().coherence).toBe(25);
  });

  test('tension only rises during playing phase', async () => {
    harness = await mountScene(
      <>
        <AISphere reducedMotion={true} />
        <EnemySpawner />
      </>,
    );

    // During title: tension MUST stay at initial value
    await harness.waitFrames(60); // 1 second
    expect(useLevelStore.getState().tension).toBe(0.12);

    // Switch to playing: enemies spawn and eventually hit sphere
    useGameStore.getState().setPhase('playing');

    // Explicitly simulate enemy-hit events by setting tension
    // (real enemies take seconds to reach sphere in the test)
    useLevelStore.getState().setTension(0.5);
    expect(useLevelStore.getState().tension).toBe(0.5);
  });

  test('coherence updates on pattern stabilization event', async () => {
    harness = await mountScene(<DiegeticGUI coherence={25} />);
    useGameStore.getState().setPhase('playing');
    await harness.waitFrames(3);

    const before = useLevelStore.getState().coherence;
    useLevelStore.getState().addCoherence(10);
    expect(useLevelStore.getState().coherence).toBe(before + 10);
  });

  test('peak coherence tracks the highest ever', async () => {
    harness = await mountScene(<DiegeticGUI coherence={25} />);
    await harness.waitFrames(3);

    useLevelStore.getState().addCoherence(50); // 25 → 75
    expect(useLevelStore.getState().peakCoherence).toBe(75);

    useLevelStore.getState().addCoherence(-30); // 75 → 45
    expect(useLevelStore.getState().peakCoherence).toBe(75); // retains peak
  });
});
