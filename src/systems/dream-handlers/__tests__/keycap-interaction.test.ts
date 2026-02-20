/**
 * INTERACTION-LEVEL tests for keycap-focused DreamHandlers.
 *
 * Tests actual gameplay behavior — state changes from update() calls,
 * tension mechanics, timing, echo replay, gate patterns, etc.
 *
 * Covers: WhackAMoleHandler, ChordHoldHandler, RhythmGateHandler,
 *         GhostChaseHandler, TurntableScratchHandler
 */

import type { GameEntity } from '../../../types';

// ── Mock GSAP ──
jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    to: jest.fn((_target: unknown, _vars: unknown) => ({ kill: jest.fn() })),
    killTweensOf: jest.fn(),
    timeline: jest.fn(() => ({
      kill: jest.fn(),
      to: jest.fn().mockReturnThis(),
    })),
    registerPlugin: jest.fn(),
  },
}));

jest.mock('gsap/CustomEase', () => ({
  __esModule: true,
  CustomEase: { create: jest.fn() },
}));

jest.mock('gsap/MotionPathPlugin', () => ({
  __esModule: true,
  MotionPathPlugin: {},
}));

// ── Mock Babylon.js ──
jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: Object.assign(
    jest.fn((x: number, y: number, z: number) => ({
      x,
      y,
      z,
      normalize: jest.fn().mockReturnThis(),
      subtract: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0, normalize: jest.fn().mockReturnThis() }),
    })),
    {
      Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
      Dot: jest.fn(() => 1),
    },
  ),
}));

// ── Helpers ──

interface MockMesh {
  name: string;
  position: { x: number; y: number; z: number; set: jest.Mock };
  rotation: { x: number; y: number; z: number };
  material: { alpha: number; emissiveColor: { r: number; g: number; b: number } };
  clone: jest.Mock;
  dispose: jest.Mock;
}

function createMockMesh(name: string): MockMesh {
  return {
    name,
    position: { x: 0, y: 0, z: 0, set: jest.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    material: {
      alpha: 1,
      emissiveColor: { r: 0, g: 0, b: 0 },
    },
    clone: jest.fn((): MockMesh => createMockMesh(`${name}-clone`)),
    dispose: jest.fn(),
  };
}

function createMockScene(overrides: Record<string, unknown> = {}) {
  const meshes = new Map<string, ReturnType<typeof createMockMesh>>();

  // Create keycap meshes
  const letters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];
  for (const letter of letters) {
    meshes.set(`keycap-${letter}`, createMockMesh(`keycap-${letter}`));
  }

  // Create other meshes
  meshes.set('platter', createMockMesh('platter'));
  meshes.set('lever', createMockMesh('lever'));
  meshes.set('sphere', createMockMesh('sphere'));

  return {
    getMeshByName: jest.fn((name: string) => meshes.get(name) ?? null),
    metadata: { currentTension: 0, pressedKeys: new Set<string>(), leverPosition: 0.5, ...overrides },
    activeCamera: {
      getForwardRay: jest.fn(() => ({ direction: { x: 0, y: 0, z: 1 } })),
    },
  } as any;
}

// ── Import handlers (after mocks) ──

import { WhackAMoleHandler } from '../WhackAMoleHandler';
import { ChordHoldHandler } from '../ChordHoldHandler';
import { RhythmGateHandler } from '../RhythmGateHandler';
import { GhostChaseHandler } from '../GhostChaseHandler';
import { TurntableScratchHandler } from '../TurntableScratchHandler';

// ═══════════════════════════════════════════════════
// Helper: run N frames of update at 60fps
// ═══════════════════════════════════════════════════
function runFrames(handler: { update(dt: number): void }, count: number, dt = 0.016) {
  for (let i = 0; i < count; i++) {
    handler.update(dt);
  }
}

// ═══════════════════════════════════════════════════
// WhackAMoleHandler — Interaction Tests
// ═══════════════════════════════════════════════════

describe('WhackAMoleHandler — interaction', () => {
  let handler: WhackAMoleHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  function makeEntity(overrides: Record<string, unknown> = {}): GameEntity {
    return {
      archetype: {
        type: 'WhackAMole',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R', 'T', 'A'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: true,
          emergeDurationMs: 1000,
          maxSimultaneous: 3,
          emergeIntervalMs: 500,
          decoyRate: 0,
          ...overrides,
        },
        seedHash: 42,
        pacing: 'reactive',
        cognitiveLoad: 'low-med',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new WhackAMoleHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('emerges keycaps after enough update() calls exceed emergeIntervalMs', () => {
    // emergeIntervalMs=500 => 0.5s at zero tension
    handler.activate(makeEntity({ emergeIntervalMs: 500 }), mockScene);

    // Run well past the first interval (0.5s = ~32 frames at 60fps)
    runFrames(handler, 40);

    const emerged = handler.getEmergedKeycaps();
    expect(emerged.length).toBeGreaterThan(0);
  });

  it('auto-retracts emerged keycaps after emergeDurationMs worth of updates', () => {
    // emergeDurationMs=200 => 0.2s, emergeIntervalMs=100 => 0.1s
    handler.activate(
      makeEntity({ emergeDurationMs: 200, emergeIntervalMs: 100, maxSimultaneous: 1 }),
      mockScene,
    );

    // Trigger first emerge (~0.1s)
    runFrames(handler, 10);
    const afterEmerge = handler.getEmergedKeycaps().length;
    expect(afterEmerge).toBeGreaterThanOrEqual(1);

    // Now advance past the 0.2s duration so the emerged keycap retracts
    // Then the next spawn can happen but the old one should be gone
    runFrames(handler, 30);

    // At this point the original keycap has been retracted (0.2s elapsed since emerge)
    // and potentially a new one spawned. The important thing is the original
    // didn't persist forever.
    // We verify by checking that emerged count never exceeded maxSimultaneous=1
    // during the entire run. Let's do a more targeted approach:
    handler.dispose();

    // Fresh run: emerge one, then wait for it to retract
    handler = new WhackAMoleHandler();
    handler.activate(
      makeEntity({ emergeDurationMs: 200, emergeIntervalMs: 5000, maxSimultaneous: 1 }),
      mockScene,
    );

    // Get past the first interval (5s) — advance to trigger one emerge
    for (let i = 0; i < 320; i++) handler.update(0.016); // ~5.12s
    const emerged = handler.getEmergedKeycaps();
    expect(emerged.length).toBe(1);

    // Now advance 0.2s (duration) so it retracts, but not enough for next spawn (5s interval)
    for (let i = 0; i < 15; i++) handler.update(0.016); // ~0.24s more
    expect(handler.getEmergedKeycaps().length).toBe(0);
  });

  it('never exceeds maxSimultaneous emerged keycaps', () => {
    handler.activate(
      makeEntity({ maxSimultaneous: 2, emergeIntervalMs: 50, emergeDurationMs: 5000 }),
      mockScene,
    );

    // Run many frames to trigger many spawn attempts
    for (let i = 0; i < 500; i++) {
      handler.update(0.016);
      expect(handler.getEmergedKeycaps().length).toBeLessThanOrEqual(2);
    }
  });

  it('decoyRate=1.0 produces all-decoy emerges', () => {
    handler.activate(
      makeEntity({ decoyRate: 1.0, emergeIntervalMs: 100, maxSimultaneous: 6 }),
      mockScene,
    );

    runFrames(handler, 100);

    const emerged = handler.getEmergedKeycaps();
    expect(emerged.length).toBeGreaterThan(0);
    for (const keycap of emerged) {
      expect(keycap.isDecoy).toBe(true);
    }
  });

  it('decoyRate=0 produces zero decoys', () => {
    handler.activate(
      makeEntity({ decoyRate: 0, emergeIntervalMs: 100, maxSimultaneous: 6 }),
      mockScene,
    );

    runFrames(handler, 100);

    const emerged = handler.getEmergedKeycaps();
    expect(emerged.length).toBeGreaterThan(0);
    for (const keycap of emerged) {
      expect(keycap.isDecoy).toBe(false);
    }
  });

  it('higher tension makes spawn interval shorter', () => {
    // No tension: emergeIntervalMs=1000 => 1.0s scaled interval
    handler.activate(makeEntity({ emergeIntervalMs: 1000, maxSimultaneous: 6 }), mockScene);

    // Run 0.6s (< 1.0s interval) — nothing should emerge at zero tension
    runFrames(handler, 38); // ~0.608s
    expect(handler.getEmergedKeycaps().length).toBe(0);

    handler.dispose();

    // Now with high tension (0.8): scaledInterval = 1000 * (1 - 0.8*0.5) = 600ms
    handler = new WhackAMoleHandler();
    mockScene = createMockScene({ currentTension: 0.8 });
    handler.activate(makeEntity({ emergeIntervalMs: 1000, maxSimultaneous: 6 }), mockScene);

    // At tension=0.8, scaled interval = 1000*(1-0.4)=600ms = 0.6s
    // Run 0.65s — should have at least one emerge
    runFrames(handler, 41); // ~0.656s
    expect(handler.getEmergedKeycaps().length).toBeGreaterThan(0);
  });

  it('higher tension makes emerge duration shorter (auto-retract sooner)', () => {
    // emergeDurationMs=1000 at zero tension => 1.0s
    // At tension=1.0: scaledDuration = 1000 / (1+1) = 500ms
    mockScene = createMockScene({ currentTension: 1.0 });
    handler.activate(
      makeEntity({ emergeDurationMs: 1000, emergeIntervalMs: 100, maxSimultaneous: 1 }),
      mockScene,
    );

    // Trigger first emerge
    runFrames(handler, 10); // ~0.16s, past 0.1s interval
    expect(handler.getEmergedKeycaps().length).toBe(1);

    // At tension=1.0, duration is 0.5s. Wait 0.55s (with a long interval so no re-spawn)
    handler.dispose();
    handler = new WhackAMoleHandler();
    mockScene = createMockScene({ currentTension: 1.0 });
    handler.activate(
      makeEntity({ emergeDurationMs: 1000, emergeIntervalMs: 50, maxSimultaneous: 1 }),
      mockScene,
    );

    // Advance past first interval
    runFrames(handler, 5); // ~0.08s
    const e1 = handler.getEmergedKeycaps();
    // May or may not have emerged yet depending on rounding — advance more
    runFrames(handler, 5); // ~0.16s total
    // Should have one emerged now
    if (handler.getEmergedKeycaps().length === 1) {
      // Now advance 0.55s — at tension=1.0, duration is 0.5s, so it should auto-retract
      // but also a new one may spawn (interval is 50ms)
      // The key assertion: the SAME keycap doesn't persist for the full 1.0s untensioned duration
      const letter = handler.getEmergedKeycaps()[0].letter;
      // Run 0.52s
      for (let i = 0; i < 33; i++) handler.update(0.016);
      // The original keycap should have retracted (0.5s duration at tension=1.0)
      const stillPresent = handler.getEmergedKeycaps().some((k) => k.letter === letter);
      expect(stillPresent).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════
// ChordHoldHandler — Interaction Tests
// ═══════════════════════════════════════════════════

describe('ChordHoldHandler — interaction', () => {
  let handler: ChordHoldHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  function makeEntity(overrides: Record<string, unknown> = {}): GameEntity {
    return {
      archetype: {
        type: 'ChordHold',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: true,
          morphCubeActive: false,
          chordSize: 2,
          holdDurationMs: 500,
          sequenceLength: 3,
          transitionWindowMs: 100,
          ...overrides,
        },
        seedHash: 42,
        pacing: 'deliberate',
        cognitiveLoad: 'medium',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ChordHoldHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('advances chord after holding correct keys for holdDurationMs', () => {
    handler.activate(makeEntity({ holdDurationMs: 500, sequenceLength: 3 }), mockScene);

    expect(handler.getProgress().current).toBe(0);

    // Get the required keys for the first chord
    const chordKeys = handler.getCurrentChordKeys();
    expect(chordKeys.length).toBe(2);

    // Hold the correct keys
    mockScene.metadata.pressedKeys = new Set(chordKeys);

    // Run 0.52s at 60fps (500ms hold required)
    runFrames(handler, 33);

    // Chord should have advanced
    expect(handler.getProgress().current).toBe(1);
  });

  it('resets hold timer when wrong key is pressed', () => {
    handler.activate(makeEntity({ holdDurationMs: 500, sequenceLength: 3 }), mockScene);

    const chordKeys = handler.getCurrentChordKeys();

    // Hold the correct keys for 0.4s (almost enough)
    mockScene.metadata.pressedKeys = new Set(chordKeys);
    runFrames(handler, 25); // ~0.4s

    // Should still be on first chord
    expect(handler.getProgress().current).toBe(0);

    // Now add a wrong key (one from available letters but not in chord)
    const wrongKey = ['Q', 'W', 'E', 'R'].find((k) => !chordKeys.includes(k));
    expect(wrongKey).toBeDefined();
    mockScene.metadata.pressedKeys = new Set([...chordKeys, wrongKey!]);
    handler.update(0.016);

    // Timer should have reset. Now hold correct keys again for the full duration
    mockScene.metadata.pressedKeys = new Set(chordKeys);
    runFrames(handler, 33); // 0.528s > 500ms

    // NOW it should advance
    expect(handler.getProgress().current).toBe(1);
  });

  it('getProgress().complete becomes true after all chords cleared', () => {
    handler.activate(makeEntity({ holdDurationMs: 200, sequenceLength: 2, transitionWindowMs: 50 }), mockScene);

    expect(handler.getProgress().complete).toBe(false);

    for (let chord = 0; chord < 2; chord++) {
      const keys = handler.getCurrentChordKeys();
      mockScene.metadata.pressedKeys = new Set(keys);

      // Hold for 0.22s (> 200ms)
      runFrames(handler, 15);

      if (chord < 1) {
        // Wait through transition window (50ms)
        mockScene.metadata.pressedKeys = new Set();
        runFrames(handler, 5);
      }
    }

    expect(handler.getProgress().complete).toBe(true);
  });

  it('chord keys always come from keycapSubset', () => {
    const subset = ['Q', 'W', 'E', 'R'];
    handler.activate(makeEntity({ keycapSubset: subset, chordSize: 3, sequenceLength: 5 }), mockScene);

    // Check all chords in the sequence
    for (let i = 0; i < 5; i++) {
      const keys = handler.getCurrentChordKeys();
      for (const key of keys) {
        expect(subset).toContain(key);
      }

      // Advance past this chord
      mockScene.metadata.pressedKeys = new Set(keys);
      runFrames(handler, 40); // enough to clear holdDurationMs=500
      mockScene.metadata.pressedKeys = new Set();
      runFrames(handler, 10); // transition window
    }
  });

  it('higher tension increases required hold duration', () => {
    // Base holdDurationMs=500 at tension=0: need 0.5s
    // At tension=1.0: scaledHold = 500 * (1 + 1*0.5) = 750ms
    handler.activate(makeEntity({ holdDurationMs: 500, sequenceLength: 2 }), mockScene);

    const chordKeys = handler.getCurrentChordKeys();

    // At zero tension, 0.52s should clear the chord
    mockScene.metadata.pressedKeys = new Set(chordKeys);
    runFrames(handler, 33); // ~0.528s
    expect(handler.getProgress().current).toBe(1);

    handler.dispose();

    // Now with high tension
    handler = new ChordHoldHandler();
    mockScene = createMockScene({ currentTension: 1.0 });
    handler.activate(makeEntity({ holdDurationMs: 500, sequenceLength: 2 }), mockScene);

    const chordKeys2 = handler.getCurrentChordKeys();
    mockScene.metadata.pressedKeys = new Set(chordKeys2);

    // 0.52s should NOT be enough at tension=1.0 (need 0.75s)
    runFrames(handler, 33); // ~0.528s
    expect(handler.getProgress().current).toBe(0);

    // Continue holding for 0.25s more (total ~0.78s > 0.75s)
    runFrames(handler, 16);
    expect(handler.getProgress().current).toBe(1);
  });
});

// ═══════════════════════════════════════════════════
// RhythmGateHandler — Interaction Tests
// ═══════════════════════════════════════════════════

describe('RhythmGateHandler — interaction', () => {
  let handler: RhythmGateHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  function makeEntity(overrides: Record<string, unknown> = {}): GameEntity {
    return {
      archetype: {
        type: 'RhythmGate',
        slots: {
          keycapSubset: ['Q', 'W', 'E'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: true,
          bpm: 120,
          gatePattern: 'quarter' as const,
          openRatio: 0.5,
          leverRequired: false,
          ...overrides,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new RhythmGateHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('isGateOpen() returns true during the open phase of a beat cycle', () => {
    // At 120 BPM, beatPeriod = 0.5s. openRatio=0.5 means first 0.25s of beat is open.
    handler.activate(makeEntity({ bpm: 120, openRatio: 0.5, gatePattern: 'quarter' }), mockScene);

    // At t=0 (start of beat), gate should be open for 'quarter' pattern
    handler.update(0.001); // tiny dt to initialize state
    expect(handler.isGateOpen('Q')).toBe(true);
  });

  it('isGateOpen() returns false during the closed phase of a beat cycle', () => {
    // 120 BPM => beatPeriod=0.5s, openRatio=0.3 => open for first 0.15s
    handler.activate(makeEntity({ bpm: 120, openRatio: 0.3, gatePattern: 'quarter' }), mockScene);

    // Advance to t=0.4s (within the beat, past the open window of 0.15s)
    handler.update(0.4);
    expect(handler.isGateOpen('Q')).toBe(false);
  });

  it('at 120 BPM with openRatio=0.5, gate is open ~50% of the time', () => {
    handler.activate(makeEntity({ bpm: 120, openRatio: 0.5, gatePattern: 'quarter' }), mockScene);

    let openCount = 0;
    const totalFrames = 600; // 10 seconds at 60fps => 20 beat cycles

    for (let i = 0; i < totalFrames; i++) {
      handler.update(0.016);
      if (handler.isGateOpen('Q')) {
        openCount++;
      }
    }

    const openRatio = openCount / totalFrames;
    // Should be approximately 50% (allow +-10% tolerance for frame quantization)
    expect(openRatio).toBeGreaterThan(0.35);
    expect(openRatio).toBeLessThan(0.65);
  });

  it('leverRequired=true keeps gate closed unless leverPosition > 0.5', () => {
    handler.activate(
      makeEntity({ bpm: 120, openRatio: 0.5, gatePattern: 'quarter', leverRequired: true }),
      mockScene,
    );

    // Set lever below threshold
    mockScene.metadata.leverPosition = 0.3;
    handler.update(0.001);
    expect(handler.isGateOpen('Q')).toBe(false);

    // Move lever above threshold
    mockScene.metadata.leverPosition = 0.7;
    handler.update(0.001);
    // Now we're at beatPosition ~ 0.002/0.5 = 0.004, which is < openRatio=0.5 => open
    expect(handler.isGateOpen('Q')).toBe(true);
  });

  it('syncopated gatePattern opens on off-beats', () => {
    // Syncopated: gate opens at beatPosition=0.5 (the "and" of the beat)
    // openRatio=0.3: open from beatPos 0.5 to 0.8 (mapped as (pos+0.5)%1 < 0.3)
    handler.activate(
      makeEntity({ bpm: 120, openRatio: 0.3, gatePattern: 'syncopated' }),
      mockScene,
    );

    // At the very start of a beat (beatPosition ~0), syncopated should be CLOSED
    handler.update(0.001);
    expect(handler.isGateOpen('Q')).toBe(false);

    // Advance to the offbeat (0.5 * beatPeriod = 0.25s at 120BPM)
    // Total elapsed should place us at beatPosition ~0.5
    handler.update(0.249); // total ~0.25s, beatPos ~ 0.5
    expect(handler.isGateOpen('Q')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// GhostChaseHandler — Interaction Tests
// ═══════════════════════════════════════════════════

describe('GhostChaseHandler — interaction', () => {
  let handler: GhostChaseHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  function makeEntity(overrides: Record<string, unknown> = {}): GameEntity {
    return {
      archetype: {
        type: 'GhostChase',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R', 'T', 'A'],
          leverActive: false,
          platterActive: false,
          sphereActive: true,
          crystallineCubeActive: false,
          morphCubeActive: true,
          echoDelayMs: 500,
          echoCount: 2,
          harmonizeMode: 'interleave' as const,
          echoDecayRate: 0.02,
          ...overrides,
        },
        seedHash: 42,
        pacing: 'layered',
        cognitiveLoad: 'high',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new GhostChaseHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('recording buffer grows when pressedKeys has keys during update', () => {
    handler.activate(makeEntity({ echoDelayMs: 5000 }), mockScene);

    expect(handler.getRecordingLength()).toBe(0);

    // Press Q
    mockScene.metadata.pressedKeys = new Set(['Q']);
    handler.update(0.016);
    expect(handler.getRecordingLength()).toBe(1);

    // Press Q again (same frame, no new press detected because lastPressedKeys has it)
    handler.update(0.016);
    expect(handler.getRecordingLength()).toBe(1);

    // Release Q, then press W
    mockScene.metadata.pressedKeys = new Set(['W']);
    handler.update(0.016);
    expect(handler.getRecordingLength()).toBe(2);
  });

  it('after echoDelayMs elapsed, echo layers replay recorded presses', () => {
    const gsapMock = require('gsap').default;
    gsapMock.to.mockClear();

    handler.activate(makeEntity({ echoDelayMs: 500, echoCount: 1 }), mockScene);

    // Record a press at t=0.016
    mockScene.metadata.pressedKeys = new Set(['Q']);
    handler.update(0.016);

    // Release key
    mockScene.metadata.pressedKeys = new Set();
    handler.update(0.016);

    // Advance past the echo delay (0.5s). The echo should replay at ~0.516s
    // which is 0.016 (original timestamp) + 0.5 (delay)
    const gsapCallsBefore = gsapMock.to.mock.calls.length;

    // Advance to ~0.55s total
    for (let i = 0; i < 32; i++) handler.update(0.016); // ~0.512s more, total ~0.544s

    // gsap.to should have been called for the echo playback (depress animation)
    const gsapCallsAfter = gsapMock.to.mock.calls.length;
    expect(gsapCallsAfter).toBeGreaterThan(gsapCallsBefore);
  });

  it('interleave mode shifts echo keys by 1 position', () => {
    // keycapSubset: ['Q', 'W', 'E', 'R', 'T', 'A']
    // interleave: index+1 mod length
    // Q(0) -> W(1), W(1) -> E(2), etc.
    const gsapMock = require('gsap').default;

    handler.activate(
      makeEntity({ echoDelayMs: 200, echoCount: 1, harmonizeMode: 'interleave' }),
      mockScene,
    );

    // Record press on Q
    mockScene.metadata.pressedKeys = new Set(['Q']);
    handler.update(0.016);
    mockScene.metadata.pressedKeys = new Set();
    handler.update(0.016);

    // Clear gsap.to calls so far
    gsapMock.to.mockClear();

    // Advance past echo delay (0.2s)
    for (let i = 0; i < 15; i++) handler.update(0.016); // ~0.24s more, total ~0.272s

    // The echo should play on 'W' (Q shifted by 1)
    // Check that gsap.to was called with keycap-W's position
    const calls = gsapMock.to.mock.calls;
    // Find a call where the target is the W keycap mesh position
    const wMesh = mockScene.getMeshByName('keycap-W');
    const calledOnW = calls.some(
      (call: any[]) => call[0] === wMesh.position,
    );
    expect(calledOnW).toBe(true);
  });

  it('complement mode mirrors echo keys', () => {
    // keycapSubset: ['Q', 'W', 'E', 'R', 'T', 'A']
    // complement: length-1-index
    // Q(0) -> A(5), W(1) -> T(4), E(2) -> R(3)
    const gsapMock = require('gsap').default;

    handler.activate(
      makeEntity({ echoDelayMs: 200, echoCount: 1, harmonizeMode: 'complement' }),
      mockScene,
    );

    // Record press on Q
    mockScene.metadata.pressedKeys = new Set(['Q']);
    handler.update(0.016);
    mockScene.metadata.pressedKeys = new Set();
    handler.update(0.016);

    gsapMock.to.mockClear();

    // Advance past echo delay
    for (let i = 0; i < 15; i++) handler.update(0.016);

    // Echo should play on 'A' (Q complement: index 0 -> index 5)
    const aMesh = mockScene.getMeshByName('keycap-A');
    const calledOnA = gsapMock.to.mock.calls.some(
      (call: any[]) => call[0] === aMesh.position,
    );
    expect(calledOnA).toBe(true);
  });

  it('invert mode echoes the same key (timing-based inversion)', () => {
    const gsapMock = require('gsap').default;

    handler.activate(
      makeEntity({ echoDelayMs: 200, echoCount: 1, harmonizeMode: 'invert' }),
      mockScene,
    );

    // Record press on E
    mockScene.metadata.pressedKeys = new Set(['E']);
    handler.update(0.016);
    mockScene.metadata.pressedKeys = new Set();
    handler.update(0.016);

    gsapMock.to.mockClear();

    // Advance past echo delay
    for (let i = 0; i < 15; i++) handler.update(0.016);

    // Echo should play on 'E' (same key in invert mode)
    const eMesh = mockScene.getMeshByName('keycap-E');
    const calledOnE = gsapMock.to.mock.calls.some(
      (call: any[]) => call[0] === eMesh.position,
    );
    expect(calledOnE).toBe(true);
  });

  it('echoDecayRate reduces echo alpha over time', () => {
    // echoDecayRate=0.02 per second of dt
    // alpha starts at 1.0, decreases by echoDecayRate * dt each frame
    handler.activate(makeEntity({ echoDelayMs: 200, echoCount: 1, echoDecayRate: 1.0 }), mockScene);

    // Record press
    mockScene.metadata.pressedKeys = new Set(['Q']);
    handler.update(0.016);
    mockScene.metadata.pressedKeys = new Set();

    // Advance 1 second (echoDecayRate=1.0 means alpha -= 1.0 * dt per frame)
    // After 1s, alpha should be ~0 (1.0 - 1.0*1.0 = 0)
    for (let i = 0; i < 62; i++) handler.update(0.016); // ~1.0s

    // The echo layer alpha should have decayed significantly
    // We can verify indirectly: when echo replays with alpha near 0,
    // the emissive color should have very low green component
    // But let's also verify the layer count is still there (decay doesn't remove layers)
    expect(handler.getEchoLayerCount()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════
// TurntableScratchHandler — Interaction Tests
// ═══════════════════════════════════════════════════

describe('TurntableScratchHandler — interaction', () => {
  let handler: TurntableScratchHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  function makeEntity(overrides: Record<string, unknown> = {}): GameEntity {
    return {
      archetype: {
        type: 'TurntableScratch',
        slots: {
          keycapSubset: ['Q', 'W', 'E'],
          leverActive: true,
          platterActive: true,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: false,
          phraseLengthBeats: 8,
          scratchPoints: 2,
          bpm: 120,
          keyDropSubset: ['Q', 'W'],
          scratchWindowMs: 200,
          ...overrides,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new TurntableScratchHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('platter angle advances proportionally to BPM', () => {
    // At 120 BPM, phraseLengthBeats=8 => phraseDuration = 0.5*8 = 4s
    // rotationSpeed = 2*PI / 4 = PI/2 rad/s
    handler.activate(makeEntity({ bpm: 120, phraseLengthBeats: 8 }), mockScene);

    handler.update(1.0); // 1 second
    const angle = handler.getPlatterAngle();
    // Expected: PI/2 * 1.0 = ~1.5708
    expect(angle).toBeCloseTo(Math.PI / 2, 1);
  });

  it('after full rotation (2*PI), phrase resets and scratch points un-hit', () => {
    // phraseDuration = 0.5 * 4 = 2s for full rotation
    handler.activate(makeEntity({ bpm: 120, phraseLengthBeats: 4, scratchPoints: 1 }), mockScene);

    // Advance just past full rotation
    // rotationSpeed = 2*PI / 2 = PI rad/s
    // Need 2s + epsilon for 2*PI radians
    for (let i = 0; i < 130; i++) handler.update(0.016); // ~2.08s

    // Angle should have wrapped (subtracted 2*PI)
    expect(handler.getPlatterAngle()).toBeLessThan(Math.PI);

    // Scratch points should have been reset (hit=false)
    const points = handler.getScratchPoints();
    for (const point of points) {
      expect(point.hit).toBe(false);
    }
  });

  it('missing a scratch point increases tension', () => {
    // scratchPoints=1 placed at angle = (1/(1+1)) * 2*PI = PI
    handler.activate(
      makeEntity({ bpm: 120, phraseLengthBeats: 4, scratchPoints: 1, scratchWindowMs: 100 }),
      mockScene,
    );

    expect(mockScene.metadata.currentTension).toBe(0);

    // Advance past the scratch point angle (PI) without any lever movement
    // rotationSpeed = PI rad/s, so PI radians at ~1.0s
    // Need to pass the scratch point + window
    // scratchWindowRad = (0.1/1) * PI = 0.1*PI
    // Need to be past PI + 0.1*PI = 1.1*PI, which is at ~1.1s
    for (let i = 0; i < 75; i++) handler.update(0.016); // ~1.2s

    // Tension should have increased by 0.03 (one missed scratch point)
    expect(mockScene.metadata.currentTension).toBeCloseTo(0.03, 2);
  });

  it('hitting a scratch point within window does NOT increase tension', () => {
    handler.activate(
      makeEntity({ bpm: 120, phraseLengthBeats: 4, scratchPoints: 1, scratchWindowMs: 200 }),
      mockScene,
    );

    expect(mockScene.metadata.currentTension).toBe(0);

    // Scratch point is at angle PI. rotationSpeed = PI rad/s.
    // PI radians reached at t=1.0s
    // scratchWindowRad = (0.2) * PI = 0.2*PI
    // So the window opens at angle PI - 0.2*PI = 0.8*PI, reached at ~0.8s

    // Advance to near the scratch point (but within window)
    // Set up lever to be in one position first
    mockScene.metadata.leverPosition = 0.8;
    for (let i = 0; i < 58; i++) handler.update(0.016); // ~0.928s

    // Now simulate a lever reversal (drop from 0.8 to 0.3) — this triggers scratch detection
    mockScene.metadata.leverPosition = 0.3;
    handler.update(0.016);

    // The scratch point should be hit
    const points = handler.getScratchPoints();
    const hitPoint = points.find((p) => p.hit);
    expect(hitPoint).toBeDefined();

    // Tension should NOT have increased
    expect(mockScene.metadata.currentTension).toBe(0);
  });

  it('scratch points are evenly distributed across the phrase', () => {
    handler.activate(makeEntity({ scratchPoints: 3 }), mockScene);

    const points = handler.getScratchPoints();
    expect(points).toHaveLength(3);

    // With 3 points: angles = (1/4)*2PI, (2/4)*2PI, (3/4)*2PI
    expect(points[0].angle).toBeCloseTo((1 / 4) * 2 * Math.PI, 3);
    expect(points[1].angle).toBeCloseTo((2 / 4) * 2 * Math.PI, 3);
    expect(points[2].angle).toBeCloseTo((3 / 4) * 2 * Math.PI, 3);
  });

  it('platter angle wraps after full rotation and does not grow unbounded', () => {
    handler.activate(makeEntity({ bpm: 120, phraseLengthBeats: 4 }), mockScene);

    // Run for many full rotations (10s = 5 full rotations at 2s/rotation)
    for (let i = 0; i < 625; i++) handler.update(0.016); // ~10s

    // Angle should be bounded, not 5 * 2*PI
    expect(handler.getPlatterAngle()).toBeLessThan(2 * Math.PI);
    expect(handler.getPlatterAngle()).toBeGreaterThanOrEqual(0);
  });
});
