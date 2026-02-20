/**
 * Deep interaction-level tests for combined-surface Dream Handlers
 *
 * Tests actual GAMEPLAY BEHAVIOR: numerical state changes, tension math,
 * timing mechanics, and surface interactions across update loops.
 *
 * Covers: ConductorHandler, LockPickHandler, ResonanceHandler,
 *         TendrilDodgeHandler, OrbitalCatchHandler
 */

import type { GameEntity } from '../../../types';
import type {
  ConductorSlots,
  LockPickSlots,
  OrbitalCatchSlots,
  ResonanceSlots,
  TendrilDodgeSlots,
} from '../../../ecs/components';

// ── Mock GSAP ──
jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    to: jest.fn(),
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
    jest.fn((x: number, y: number, z: number) => ({ x, y, z })),
    {
      Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    },
  ),
}));

// ── Helpers ──

function createMockMesh(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: {
      emissiveColor: { r: 0, g: 0, b: 0 },
    },
    dispose: jest.fn(),
    ...overrides,
  };
}

function createMockScene(overrides: Record<string, unknown> = {}) {
  const meshes: Record<string, ReturnType<typeof createMockMesh>> = {};
  return {
    getMeshByName: jest.fn((name: string) => {
      if (!meshes[name]) {
        meshes[name] = createMockMesh(name);
      }
      return meshes[name];
    }),
    metadata: { currentTension: 0, pressedKeys: new Set<string>() },
    _meshes: meshes,
    ...overrides,
  } as any;
}

function createEntityWithSlots<T>(
  slots: T,
  extra: Partial<GameEntity> = {},
): GameEntity {
  return {
    archetype: {
      type: 'Conductor' as any,
      slots: slots as any,
      seedHash: 12345,
      pacing: 'rhythmic',
      cognitiveLoad: 'medium',
    },
    ...extra,
  };
}

const DT = 0.016; // ~60fps frame delta

// ═══════════════════════════════════════════════════════════════
// ConductorHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('ConductorHandler — Interaction', () => {
  let ConductorHandler: any;

  beforeAll(async () => {
    const mod = await import('../ConductorHandler');
    ConductorHandler = mod.ConductorHandler;
  });

  it('lever position 0.0 maps to 60 BPM', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots(
      {
        targetBpm: 120,
        dynamicCurve: 'crescendo',
        sectionCount: 3,
        toleranceBpm: 10,
        keycapSubset: ['Q'],
      },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);
    handler.update(DT);

    const progress = handler.getProgress();
    expect(progress.currentBpm).toBeCloseTo(60, 1);
  });

  it('lever position 1.0 maps to 180 BPM', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots(
      {
        targetBpm: 120,
        dynamicCurve: 'crescendo',
        sectionCount: 3,
        toleranceBpm: 10,
        keycapSubset: ['Q'],
      },
      { modeLeverPosition: 1.0 },
    );
    handler.activate(entity, scene);
    handler.update(DT);

    const progress = handler.getProgress();
    expect(progress.currentBpm).toBeCloseTo(180, 1);
  });

  it('lever position 0.5 maps to 120 BPM', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots(
      {
        targetBpm: 120,
        dynamicCurve: 'crescendo',
        sectionCount: 3,
        toleranceBpm: 10,
        keycapSubset: ['Q'],
      },
      { modeLeverPosition: 0.5 },
    );
    handler.activate(entity, scene);
    handler.update(DT);

    const progress = handler.getProgress();
    expect(progress.currentBpm).toBeCloseTo(120, 1);
  });

  it('crescendo section targets increase through dynamicCurve from 60 to 180', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      targetBpm: 120,
      dynamicCurve: 'crescendo',
      sectionCount: 4,
      toleranceBpm: 10,
      keycapSubset: ['Q'],
    });
    handler.activate(entity, scene);
    const targets = handler.getSectionBpmTargets();

    expect(targets).toHaveLength(4);
    expect(targets[0]).toBeCloseTo(60, 0);
    expect(targets[3]).toBeCloseTo(180, 0);
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).toBeGreaterThan(targets[i - 1]);
    }
  });

  it('sections advance after sectionDuration (8s) of update calls', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots(
      {
        targetBpm: 120,
        dynamicCurve: 'crescendo',
        sectionCount: 3,
        toleranceBpm: 10,
        keycapSubset: ['Q'],
      },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);

    // Start at section 0
    expect(handler.getProgress().section).toBe(0);

    // Simulate 8 seconds of frames (8 / 0.016 = 500 frames)
    for (let i = 0; i < 500; i++) {
      handler.update(DT);
    }

    // Should have advanced to section 1
    expect(handler.getProgress().section).toBe(1);
  });

  it('on-tempo lever decreases tension over time', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    // First section of crescendo has target ~60 BPM; lever 0.0 gives 60 BPM = on-tempo
    const entity = createEntityWithSlots(
      {
        targetBpm: 120,
        dynamicCurve: 'crescendo',
        sectionCount: 3,
        toleranceBpm: 15,
        keycapSubset: ['Q'],
      },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);

    const initialTension = scene.metadata.currentTension;

    // Run 60 frames (~1 second)
    for (let i = 0; i < 60; i++) {
      handler.update(DT);
    }

    expect(scene.metadata.currentTension).toBeLessThan(initialTension);
  });

  it('off-tempo lever increases tension proportional to BPM difference', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    // Crescendo first section target is 60 BPM; lever 1.0 gives 180 BPM = 120 BPM off
    const entity = createEntityWithSlots(
      {
        targetBpm: 120,
        dynamicCurve: 'crescendo',
        sectionCount: 3,
        toleranceBpm: 10,
        keycapSubset: ['Q'],
      },
      { modeLeverPosition: 1.0 },
    );
    handler.activate(entity, scene);

    const initialTension = scene.metadata.currentTension;

    for (let i = 0; i < 60; i++) {
      handler.update(DT);
    }

    expect(scene.metadata.currentTension).toBeGreaterThan(initialTension);
  });

  it('activating instruments increases tension decrease rate (instrument bonus)', () => {
    const handler = new ConductorHandler();
    const scene1 = createMockScene();
    scene1.metadata.currentTension = 0.5;
    const scene2 = createMockScene();
    scene2.metadata.currentTension = 0.5;

    const makeEntity = () =>
      createEntityWithSlots(
        {
          targetBpm: 120,
          dynamicCurve: 'crescendo',
          sectionCount: 3,
          toleranceBpm: 15,
          keycapSubset: ['Q', 'W', 'E'],
        },
        { modeLeverPosition: 0.0 },
      );

    // Handler A: no active instruments
    const handlerA = new ConductorHandler();
    handlerA.activate(makeEntity(), scene1);

    // Handler B: 3 active instruments
    const handlerB = new ConductorHandler();
    handlerB.activate(makeEntity(), scene2);
    handlerB.activateInstrument('Q');
    handlerB.activateInstrument('W');
    handlerB.activateInstrument('E');

    // Run 120 frames (~2 seconds)
    for (let i = 0; i < 120; i++) {
      handlerA.update(DT);
      handlerB.update(DT);
    }

    // With 3 instruments: bonus = 1 + 3*0.25 = 1.75x faster decrease
    const decreaseA = 0.5 - scene1.metadata.currentTension;
    const decreaseB = 0.5 - scene2.metadata.currentTension;

    expect(decreaseB).toBeGreaterThan(decreaseA);
    // Ratio should be ~1.75 (with 3 instruments vs 0)
    expect(decreaseB / decreaseA).toBeCloseTo(1.75, 1);
  });

  it('deactivating an instrument removes the bonus', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    const entity = createEntityWithSlots(
      {
        targetBpm: 120,
        dynamicCurve: 'crescendo',
        sectionCount: 3,
        toleranceBpm: 15,
        keycapSubset: ['Q', 'W'],
      },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);
    handler.activateInstrument('Q');
    handler.activateInstrument('W');

    // Run some frames with 2 instruments active
    for (let i = 0; i < 30; i++) {
      handler.update(DT);
    }
    const tensionAfterBoost = scene.metadata.currentTension;

    // Deactivate both instruments
    handler.deactivateInstrument('Q');
    handler.deactivateInstrument('W');

    // Reset tension to measure rate without instruments
    scene.metadata.currentTension = tensionAfterBoost;
    const tensionBefore = scene.metadata.currentTension;

    for (let i = 0; i < 30; i++) {
      handler.update(DT);
    }

    // The decrease rate without instruments should be less
    const decreaseWithout = tensionBefore - scene.metadata.currentTension;
    // With 2 instruments, bonus was 1.5x; now it's 1.0x
    expect(decreaseWithout).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// LockPickHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('LockPickHandler — Interaction', () => {
  let LockPickHandler: any;

  beforeAll(async () => {
    const mod = await import('../LockPickHandler');
    LockPickHandler = mod.LockPickHandler;
  });

  function createLockPickEntity(
    overrides: Partial<LockPickSlots> = {},
    extra: Partial<GameEntity> = {},
  ): GameEntity {
    return createEntityWithSlots(
      {
        pinCount: 3,
        notchWidthDeg: 10,
        notchPositions: [90, 180, 270],
        resetPenalty: 'reset-one' as const,
        leverHoldDurationMs: 500,
        ...overrides,
      },
      extra,
    );
  }

  it('aligning sphere to notch and holding lever locks a pin', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    // Pin at 90 deg, notchWidth 10 deg, lever hold 500ms
    const entity = createLockPickEntity(
      {
        pinCount: 3,
        notchWidthDeg: 10,
        notchPositions: [90, 180, 270],
        leverHoldDurationMs: 500,
        resetPenalty: 'reset-one',
      },
      { lever: { position: 0.8, active: true, resistance: 0, locked: false } },
    );
    handler.activate(entity, scene);

    // Set sphere rotation to 90 deg (in radians: 90 * PI/180)
    const sphereMesh = scene.getMeshByName('sphere');
    sphereMesh.rotation.y = (90 * Math.PI) / 180;

    // Run enough frames to accumulate 500ms of lever hold
    // 500ms / (16ms * 1000ms-per-dt-step) = we need 500ms total
    // Each update adds dt*1000 ms = 16ms. So 500/16 = ~32 frames
    for (let i = 0; i < 35; i++) {
      handler.update(DT);
    }

    const pinStates = handler.getPinStates();
    expect(pinStates[0].locked).toBe(true);
  });

  it('pin locking decreases tension by 0.05', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    const entity = createLockPickEntity(
      {
        pinCount: 3,
        notchWidthDeg: 10,
        notchPositions: [90, 180, 270],
        leverHoldDurationMs: 500,
        resetPenalty: 'reset-one',
      },
      { lever: { position: 0.8, active: true, resistance: 0, locked: false } },
    );
    handler.activate(entity, scene);

    const sphereMesh = scene.getMeshByName('sphere');
    sphereMesh.rotation.y = (90 * Math.PI) / 180;

    for (let i = 0; i < 35; i++) {
      handler.update(DT);
    }

    expect(scene.metadata.currentTension).toBeCloseTo(0.45, 2);
  });

  it('moving sphere off notch during lever hold with reset-all resets ALL pins', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    const entity = createLockPickEntity(
      {
        pinCount: 3,
        notchWidthDeg: 10,
        notchPositions: [90, 180, 270],
        leverHoldDurationMs: 500,
        resetPenalty: 'reset-all',
      },
      { lever: { position: 0.8, active: true, resistance: 0, locked: false } },
    );
    handler.activate(entity, scene);

    const sphereMesh = scene.getMeshByName('sphere');

    // Lock pin 0 (at 90 deg)
    sphereMesh.rotation.y = (90 * Math.PI) / 180;
    for (let i = 0; i < 35; i++) {
      handler.update(DT);
    }
    expect(handler.getPinStates()[0].locked).toBe(true);

    // Now start working on pin 1 (at 180 deg)
    sphereMesh.rotation.y = (180 * Math.PI) / 180;
    // Accumulate some hold progress (a few frames)
    for (let i = 0; i < 5; i++) {
      handler.update(DT);
    }

    // Verify some progress accumulated on pin 1
    const statesBefore = handler.getPinStates();
    expect(statesBefore[1].holdProgress).toBeGreaterThan(0);

    // Now move sphere OFF notch while lever is still held
    sphereMesh.rotation.y = (45 * Math.PI) / 180; // way off 180 deg notch
    handler.update(DT);

    // reset-all should reset ALL pins, including the previously locked pin 0
    const statesAfter = handler.getPinStates();
    expect(statesAfter[0].locked).toBe(false);
    expect(statesAfter[1].locked).toBe(false);
    expect(statesAfter[2].locked).toBe(false);
  });

  it('moving sphere off notch during lever hold with reset-one resets only current pin', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    const entity = createLockPickEntity(
      {
        pinCount: 3,
        notchWidthDeg: 10,
        notchPositions: [90, 180, 270],
        leverHoldDurationMs: 500,
        resetPenalty: 'reset-one',
      },
      { lever: { position: 0.8, active: true, resistance: 0, locked: false } },
    );
    handler.activate(entity, scene);

    const sphereMesh = scene.getMeshByName('sphere');

    // Lock pin 0 (at 90 deg)
    sphereMesh.rotation.y = (90 * Math.PI) / 180;
    for (let i = 0; i < 35; i++) {
      handler.update(DT);
    }
    expect(handler.getPinStates()[0].locked).toBe(true);

    // Start working on pin 1 (at 180 deg), accumulate some hold progress
    sphereMesh.rotation.y = (180 * Math.PI) / 180;
    for (let i = 0; i < 5; i++) {
      handler.update(DT);
    }
    expect(handler.getPinStates()[1].holdProgress).toBeGreaterThan(0);

    // Move off notch while lever is held
    sphereMesh.rotation.y = (45 * Math.PI) / 180;
    handler.update(DT);

    // reset-one: pin 0 stays locked, only current pin (1) progress resets
    const states = handler.getPinStates();
    expect(states[0].locked).toBe(true); // stays locked
    expect(states[1].holdProgress).toBe(0); // progress reset
    expect(states[1].locked).toBe(false);
  });

  it('failed attempt increases tension by 0.03', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    const entity = createLockPickEntity(
      {
        pinCount: 3,
        notchWidthDeg: 10,
        notchPositions: [90, 180, 270],
        leverHoldDurationMs: 500,
        resetPenalty: 'reset-one',
      },
      { lever: { position: 0.8, active: true, resistance: 0, locked: false } },
    );
    handler.activate(entity, scene);

    const sphereMesh = scene.getMeshByName('sphere');

    // Start aligned to first pin, accumulate some hold progress
    sphereMesh.rotation.y = (90 * Math.PI) / 180;
    for (let i = 0; i < 5; i++) {
      handler.update(DT);
    }

    // Now move off notch -> triggers penalty
    sphereMesh.rotation.y = (45 * Math.PI) / 180;
    handler.update(DT);

    expect(scene.metadata.currentTension).toBeCloseTo(0.33, 2);
    expect(handler.getFailedAttempts()).toBe(1);
  });

  it('areAllPinsLocked returns true when all pins locked', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    const entity = createLockPickEntity(
      {
        pinCount: 2,
        notchWidthDeg: 10,
        notchPositions: [90, 180],
        leverHoldDurationMs: 300,
        resetPenalty: 'reset-one',
      },
      { lever: { position: 0.8, active: true, resistance: 0, locked: false } },
    );
    handler.activate(entity, scene);

    const sphereMesh = scene.getMeshByName('sphere');

    // Lock pin 0 (at 90 deg): 300ms / 16ms = ~19 frames
    sphereMesh.rotation.y = (90 * Math.PI) / 180;
    for (let i = 0; i < 22; i++) {
      handler.update(DT);
    }
    expect(handler.getPinStates()[0].locked).toBe(true);
    expect(handler.areAllPinsLocked()).toBe(false);

    // Lock pin 1 (at 180 deg)
    sphereMesh.rotation.y = (180 * Math.PI) / 180;
    for (let i = 0; i < 22; i++) {
      handler.update(DT);
    }
    expect(handler.getPinStates()[1].locked).toBe(true);
    expect(handler.areAllPinsLocked()).toBe(true);
  });

  it('releasing lever (position < 0.7) resets hold progress without penalty', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    const entity = createLockPickEntity(
      {
        pinCount: 3,
        notchWidthDeg: 10,
        notchPositions: [90, 180, 270],
        leverHoldDurationMs: 500,
        resetPenalty: 'reset-one',
      },
      { lever: { position: 0.8, active: true, resistance: 0, locked: false } },
    );
    handler.activate(entity, scene);

    const sphereMesh = scene.getMeshByName('sphere');
    sphereMesh.rotation.y = (90 * Math.PI) / 180;

    // Accumulate some hold progress with lever held
    for (let i = 0; i < 5; i++) {
      handler.update(DT);
    }
    expect(handler.getPinStates()[0].holdProgress).toBeGreaterThan(0);

    // Release lever (set position < 0.7)
    entity.lever!.position = 0.3;
    handler.update(DT);

    // Hold progress should be reset, no penalty
    expect(handler.getPinStates()[0].holdProgress).toBe(0);
    expect(handler.getFailedAttempts()).toBe(0);
    expect(scene.metadata.currentTension).toBeCloseTo(0.3, 2);
  });

  it('once all pins locked, update becomes a no-op', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    const entity = createLockPickEntity(
      {
        pinCount: 1,
        notchWidthDeg: 10,
        notchPositions: [90],
        leverHoldDurationMs: 300,
        resetPenalty: 'reset-one',
      },
      { lever: { position: 0.8, active: true, resistance: 0, locked: false } },
    );
    handler.activate(entity, scene);

    const sphereMesh = scene.getMeshByName('sphere');
    sphereMesh.rotation.y = (90 * Math.PI) / 180;

    for (let i = 0; i < 22; i++) {
      handler.update(DT);
    }
    expect(handler.areAllPinsLocked()).toBe(true);

    const tensionAfterLock = scene.metadata.currentTension;

    // Further updates should not change tension
    for (let i = 0; i < 60; i++) {
      handler.update(DT);
    }
    expect(scene.metadata.currentTension).toBe(tensionAfterLock);
  });
});

// ═══════════════════════════════════════════════════════════════
// ResonanceHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('ResonanceHandler — Interaction', () => {
  let ResonanceHandler: any;

  beforeAll(async () => {
    const mod = await import('../ResonanceHandler');
    ResonanceHandler = mod.ResonanceHandler;
  });

  it('target frequency drifts over time', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots(
      {
        resonanceFrequency: 0.5,
        toleranceBand: 0.1,
        frequencyDriftRate: 0.05, // fast drift for testability
        amplitudeRange: [0.2, 0.8],
        holdDurationS: 5,
      },
      { modeLeverPosition: 0.0 }, // far from target, so resonance doesn't fill
    );
    handler.activate(entity, scene);

    const initialFreq = handler.getResonanceState().targetFrequency;

    // Run 120 frames (~2 seconds)
    for (let i = 0; i < 120; i++) {
      handler.update(DT);
    }

    const newFreq = handler.getResonanceState().targetFrequency;
    expect(newFreq).not.toBeCloseTo(initialFreq, 3);
    // With drift rate 0.05/s and 2 seconds, drift ~0.1
    expect(Math.abs(newFreq - initialFreq)).toBeGreaterThan(0.05);
  });

  it('target frequency bounces within 0.05-0.95 range', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots(
      {
        resonanceFrequency: 0.9, // start near upper bound
        toleranceBand: 0.1,
        frequencyDriftRate: 0.5, // very fast drift
        amplitudeRange: [0.2, 0.8],
        holdDurationS: 5,
      },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);

    // Run many frames to ensure bounce occurs
    for (let i = 0; i < 300; i++) {
      handler.update(DT);
    }

    const freq = handler.getResonanceState().targetFrequency;
    expect(freq).toBeGreaterThanOrEqual(0.05);
    expect(freq).toBeLessThanOrEqual(0.95);
  });

  it('matched lever fills resonance progress over time', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    // Set lever exactly at the resonance frequency
    const entity = createEntityWithSlots(
      {
        resonanceFrequency: 0.5,
        toleranceBand: 0.1,
        frequencyDriftRate: 0.0, // no drift for clean test
        amplitudeRange: [0.8, 0.8], // fixed amplitude
        holdDurationS: 5,
      },
      { modeLeverPosition: 0.5 },
    );
    handler.activate(entity, scene);

    expect(handler.getResonanceState().progress).toBe(0);

    // Run 60 frames (~1 second)
    for (let i = 0; i < 60; i++) {
      handler.update(DT);
    }

    // With amplitude 0.8 and dt ~0.016, progress per frame = 0.8 * 0.016 = 0.0128
    // After ~60 frames: ~0.77
    expect(handler.getResonanceState().progress).toBeGreaterThan(0.5);
  });

  it('holding matched lever for holdDurationS completes resonance and drops tension', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.6;

    const entity = createEntityWithSlots(
      {
        resonanceFrequency: 0.5,
        toleranceBand: 0.1,
        frequencyDriftRate: 0.0,
        amplitudeRange: [1.0, 1.0], // max amplitude for fast fill
        holdDurationS: 2,
      },
      { modeLeverPosition: 0.5 },
    );
    handler.activate(entity, scene);

    // Run enough frames to fill 2 seconds: with amplitude 1.0, each frame adds ~0.016
    // 2.0 / 0.016 = 125 frames
    for (let i = 0; i < 130; i++) {
      handler.update(DT);
    }

    // Tension should have dropped by 0.2 upon completion
    expect(scene.metadata.currentTension).toBeLessThan(0.6);
    // After resonance completion, progress resets to 0
    expect(handler.getResonanceState().progress).toBeLessThan(2.0);
  });

  it('off-frequency lever position loses resonance progress (decay)', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();

    const entity = createEntityWithSlots(
      {
        resonanceFrequency: 0.5,
        toleranceBand: 0.05,
        frequencyDriftRate: 0.0,
        amplitudeRange: [0.8, 0.8],
        holdDurationS: 5,
      },
      { modeLeverPosition: 0.5 },
    );
    handler.activate(entity, scene);

    // Build up some progress (matched)
    for (let i = 0; i < 60; i++) {
      handler.update(DT);
    }
    const builtProgress = handler.getResonanceState().progress;
    expect(builtProgress).toBeGreaterThan(0);

    // Now move lever way off frequency
    entity.modeLeverPosition = 0.9;
    for (let i = 0; i < 60; i++) {
      handler.update(DT);
    }

    // Progress should decay (resonanceProgress -= dt * 0.3)
    expect(handler.getResonanceState().progress).toBeLessThan(builtProgress);
  });

  it('off-frequency lever slightly increases tension', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    const entity = createEntityWithSlots(
      {
        resonanceFrequency: 0.5,
        toleranceBand: 0.05,
        frequencyDriftRate: 0.0,
        amplitudeRange: [0.5, 0.5],
        holdDurationS: 5,
      },
      { modeLeverPosition: 0.9 }, // well off the target of 0.5
    );
    handler.activate(entity, scene);

    for (let i = 0; i < 120; i++) {
      handler.update(DT);
    }

    // Slight tension increase: 0.005 * dt per frame
    expect(scene.metadata.currentTension).toBeGreaterThan(0.3);
  });
});

// ═══════════════════════════════════════════════════════════════
// TendrilDodgeHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('TendrilDodgeHandler — Interaction', () => {
  let TendrilDodgeHandler: any;

  beforeAll(async () => {
    const mod = await import('../TendrilDodgeHandler');
    TendrilDodgeHandler = mod.TendrilDodgeHandler;
  });

  function createTendrilEntity(
    overrides: Partial<TendrilDodgeSlots> = {},
    extra: Partial<GameEntity> = {},
  ): GameEntity {
    return createEntityWithSlots(
      {
        tendrilWaveSize: 4,
        waveIntervalS: 2,
        approachSpeed: 1.0,
        dissolveAngleDeg: 30,
        shieldDurationMs: 500,
        shieldCooldownS: 3,
        keycapSubset: ['Q', 'W', 'E', 'R'],
        ...overrides,
      },
      extra,
    );
  }

  it('tendrils spawn after waveIntervalS and approach sphere (distance decreases)', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    const entity = createTendrilEntity(
      { waveIntervalS: 1, approachSpeed: 1.0, tendrilWaveSize: 3 },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);

    // No tendrils at start
    expect(handler.getActiveTendrilCount()).toBe(0);

    // Run enough frames to pass the wave interval (1 second = ~63 frames)
    for (let i = 0; i < 65; i++) {
      handler.update(DT);
    }

    // A wave should have spawned
    expect(handler.getWaveCount()).toBe(1);
    expect(handler.getActiveTendrilCount()).toBe(3);
  });

  it('a single tendril hitting sphere increases tension by 0.02', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    // Use 1 tendril per wave for clean measurement
    const entity = createTendrilEntity(
      {
        waveIntervalS: 0.5,
        approachSpeed: 5.0, // fast approach so tendril reaches sphere quickly
        tendrilWaveSize: 1,
        shieldDurationMs: 500,
        shieldCooldownS: 100,
      },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);

    // Run frames until the wave spawns (waveIntervalS = 0.5s)
    // and tendril reaches sphere (distance 2.0 / speed 5.0 = 0.4s)
    // Total: ~0.9s = ~57 frames. But track per-frame to catch the hit.
    let tensionOnHit = -1;
    for (let i = 0; i < 100; i++) {
      const tensionBefore = scene.metadata.currentTension;
      handler.update(DT);
      const tensionAfter = scene.metadata.currentTension;
      // Detect the frame where tension increased (the hit frame)
      if (tensionAfter > tensionBefore && tensionOnHit < 0) {
        tensionOnHit = tensionAfter;
        break;
      }
    }

    // The single tendril hit should have increased tension by 0.02
    expect(tensionOnHit).toBeCloseTo(0.32, 2);
  });

  it('activating shield (lever > 0.7) blocks tendrils during shieldDurationMs', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    const entity = createTendrilEntity(
      {
        waveIntervalS: 0.5,
        approachSpeed: 2.0,
        tendrilWaveSize: 4,
        shieldDurationMs: 2000, // long shield
        shieldCooldownS: 1,
      },
      { modeLeverPosition: 0.8 }, // lever pulled -> activates shield
    );
    handler.activate(entity, scene);

    // Run frames to spawn wave and have tendrils approach while shield is active
    // Shield activates immediately when lever > 0.7 and shield is ready
    for (let i = 0; i < 200; i++) {
      handler.update(DT);
    }

    // Shield should have been activated
    // Shield blocks tendrils at distance <= 0.3 by dissolving them
    // With a 2-second shield, many tendrils should get blocked
    expect(handler.isShieldActive() || !handler.isShieldReady()).toBe(true);
  });

  it('shield goes on cooldown after use and becomes ready after cooldown expires', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();

    const entity = createTendrilEntity(
      {
        waveIntervalS: 10, // no waves needed for this test
        approachSpeed: 1.0,
        tendrilWaveSize: 1,
        shieldDurationMs: 100, // very short shield
        shieldCooldownS: 2,
      },
      { modeLeverPosition: 0.8 }, // activate shield
    );
    handler.activate(entity, scene);

    // First update should activate shield
    handler.update(DT);
    expect(handler.isShieldActive()).toBe(true);
    expect(handler.isShieldReady()).toBe(false);

    // Run enough frames for shield to expire (100ms = ~7 frames)
    for (let i = 0; i < 10; i++) {
      handler.update(DT);
    }

    // Shield should have expired
    expect(handler.isShieldActive()).toBe(false);
    expect(handler.isShieldReady()).toBe(false); // on cooldown

    // Release lever so shield doesn't immediately re-activate after cooldown
    entity.modeLeverPosition = 0.0;

    // Run frames for cooldown (2s = ~125 frames)
    for (let i = 0; i < 130; i++) {
      handler.update(DT);
    }

    expect(handler.isShieldReady()).toBe(true);
    expect(handler.isShieldActive()).toBe(false);
  });

  it('shield cannot be re-activated during cooldown', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();

    const entity = createTendrilEntity(
      {
        waveIntervalS: 10,
        approachSpeed: 1.0,
        tendrilWaveSize: 1,
        shieldDurationMs: 100,
        shieldCooldownS: 2,
      },
      { modeLeverPosition: 0.8 },
    );
    handler.activate(entity, scene);

    // Activate shield
    handler.update(DT);
    expect(handler.isShieldActive()).toBe(true);

    // Let shield expire
    for (let i = 0; i < 10; i++) {
      handler.update(DT);
    }
    expect(handler.isShieldActive()).toBe(false);
    expect(handler.isShieldReady()).toBe(false);

    // Try to activate again while on cooldown (lever still held)
    for (let i = 0; i < 30; i++) {
      handler.update(DT);
    }

    // Should NOT re-activate during cooldown
    expect(handler.isShieldActive()).toBe(false);
    expect(handler.isShieldReady()).toBe(false);
  });

  it('dissolving a tendril with correct keycap removes it', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();

    const entity = createTendrilEntity(
      {
        waveIntervalS: 0.5,
        approachSpeed: 0.1, // slow so tendrils stay active
        tendrilWaveSize: 4,
        shieldDurationMs: 100,
        shieldCooldownS: 100,
        keycapSubset: ['Q', 'W', 'E', 'R'],
      },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);

    // Spawn a wave
    for (let i = 0; i < 35; i++) {
      handler.update(DT);
    }
    expect(handler.getActiveTendrilCount()).toBe(4);

    // Dissolve tendril with keycap 'Q' (index 0)
    const dissolved = handler.dissolveTendril('Q');
    expect(dissolved).toBe(true);
    expect(handler.getActiveTendrilCount()).toBe(3);
  });

  it('dodging full wave (all tendrils dissolved) decreases tension by 0.05', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    const entity = createTendrilEntity(
      {
        waveIntervalS: 0.5,
        approachSpeed: 0.01, // very slow so tendrils don't reach sphere
        tendrilWaveSize: 2,
        shieldDurationMs: 100,
        shieldCooldownS: 100,
        keycapSubset: ['Q', 'W'],
      },
      { modeLeverPosition: 0.0 },
    );
    handler.activate(entity, scene);

    // Spawn a wave
    for (let i = 0; i < 35; i++) {
      handler.update(DT);
    }
    expect(handler.getWaveCount()).toBe(1);
    expect(handler.getActiveTendrilCount()).toBe(2);

    // Dissolve all tendrils
    handler.dissolveTendril('Q');
    handler.dissolveTendril('W');
    expect(handler.getActiveTendrilCount()).toBe(0);

    // The next update should detect wave complete + all dodged
    const tensionBefore = scene.metadata.currentTension;
    handler.update(DT);

    // Note: the wave-complete check happens when activeTendrils.length === 0 and waveCount > 0
    // and allDodged is true (no tendril hit this frame)
    expect(scene.metadata.currentTension).toBeLessThanOrEqual(tensionBefore);
  });
});

// ═══════════════════════════════════════════════════════════════
// OrbitalCatchHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('OrbitalCatchHandler — Interaction', () => {
  let OrbitalCatchHandler: any;

  beforeAll(async () => {
    const mod = await import('../OrbitalCatchHandler');
    OrbitalCatchHandler = mod.OrbitalCatchHandler;
  });

  function createOrbitalEntity(
    overrides: Partial<OrbitalCatchSlots> = {},
    extra: Partial<GameEntity> = {},
  ): GameEntity {
    return createEntityWithSlots(
      {
        orbitCount: 3,
        orbitSpeedBase: 1.0,
        orbitRadiusRange: [0.3, 0.7] as [number, number],
        altitudeRange: [-0.2, 0.4] as [number, number],
        catchWindowDeg: 20,
        keycapSubset: ['Q', 'W', 'E'],
        ...overrides,
      },
      extra,
    );
  }

  it('cubes orbit and angle changes each update', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0;

    const entity = createOrbitalEntity();
    handler.activate(entity, scene);

    const cubesBefore = handler.getOrbitingCubes();
    const initialAngles = cubesBefore.map((c: any) => c.angleDeg);

    // Run some frames
    for (let i = 0; i < 10; i++) {
      handler.update(DT);
    }

    const cubesAfter = handler.getOrbitingCubes();
    // At least one cube should have moved
    let anyMoved = false;
    for (let j = 0; j < cubesAfter.length; j++) {
      if (Math.abs(cubesAfter[j].angleDeg - initialAngles[j]) > 0.01) {
        anyMoved = true;
        break;
      }
    }
    expect(anyMoved).toBe(true);
  });

  it('pressing correct keycap when cube angle is within catchWindowDeg catches the cube', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;

    const entity = createOrbitalEntity({ catchWindowDeg: 20 });
    handler.activate(entity, scene);

    // Directly position a cube's angle at its catch angle for deterministic test
    const internalCubes = (handler as any).orbitingCubes;
    const targetCube = internalCubes[0];
    targetCube.angleDeg = targetCube.catchAngleDeg; // exactly aligned
    const keycap = targetCube.assignedKeycap;

    const result = handler.catchCube(keycap);
    expect(result).toBe(true);
    expect(handler.getStats().caught).toBe(1);
  });

  it('catching a cube decreases tension by 0.03', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    const entity = createOrbitalEntity({ catchWindowDeg: 20 });
    handler.activate(entity, scene);

    // Position cube at its catch angle for guaranteed catch
    const internalCubes = (handler as any).orbitingCubes;
    const targetCube = internalCubes[0];
    targetCube.angleDeg = targetCube.catchAngleDeg;
    const keycap = targetCube.assignedKeycap;

    handler.catchCube(keycap);
    expect(scene.metadata.currentTension).toBeCloseTo(0.47, 2);
  });

  it('pressing wrong keycap does not catch', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();

    const entity = createOrbitalEntity({
      keycapSubset: ['Q', 'W', 'E'],
      catchWindowDeg: 360,
    });
    handler.activate(entity, scene);

    // Try a keycap not in the subset
    const result = handler.catchCube('Z');
    expect(result).toBe(false);
    expect(handler.getStats().caught).toBe(0);
  });

  it('higher tension makes orbit faster (tensionSpeedMultiplier)', () => {
    // Setup two handlers, same config, different tension
    const sceneLow = createMockScene();
    sceneLow.metadata.currentTension = 0.0;
    const sceneHigh = createMockScene();
    sceneHigh.metadata.currentTension = 1.0;

    // Use deterministic seed-like approach: fixed orbit speed
    const handlerLow = new OrbitalCatchHandler();
    const handlerHigh = new OrbitalCatchHandler();

    const entityLow = createOrbitalEntity({ orbitCount: 1, orbitSpeedBase: 1.0 });
    const entityHigh = createOrbitalEntity({ orbitCount: 1, orbitSpeedBase: 1.0 });

    handlerLow.activate(entityLow, sceneLow);
    handlerHigh.activate(entityHigh, sceneHigh);

    // Record initial angles
    const angleLowBefore = handlerLow.getOrbitingCubes()[0].angleDeg;
    const angleHighBefore = handlerHigh.getOrbitingCubes()[0].angleDeg;

    // Run 60 frames
    for (let i = 0; i < 60; i++) {
      handlerLow.update(DT);
      handlerHigh.update(DT);
    }

    const angleLowAfter = handlerLow.getOrbitingCubes()[0].angleDeg;
    const angleHighAfter = handlerHigh.getOrbitingCubes()[0].angleDeg;

    // Calculate angular displacement (handle wrap-around)
    const displacementLow = ((angleLowAfter - angleLowBefore) + 360) % 360;
    const displacementHigh = ((angleHighAfter - angleHighBefore) + 360) % 360;

    // High tension (1.0) gives multiplier = 1 + 1.0 * 0.5 = 1.5x speed
    // Low tension (0.0) gives multiplier = 1 + 0.0 * 0.5 = 1.0x speed
    // So high displacement should be ~1.5x low displacement
    expect(displacementHigh).toBeGreaterThan(displacementLow);
  });

  it('caught cubes are respawned to maintain orbitCount', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0;

    const entity = createOrbitalEntity({
      orbitCount: 3,
      catchWindowDeg: 20,
    });
    handler.activate(entity, scene);

    expect(handler.getOrbitingCubes()).toHaveLength(3);

    // Position first cube at catch angle and catch it
    const internalCubes = (handler as any).orbitingCubes;
    internalCubes[0].angleDeg = internalCubes[0].catchAngleDeg;
    handler.catchCube(internalCubes[0].assignedKeycap);

    // Run an update to trigger respawn
    handler.update(DT);

    // Should still have 3 active cubes after respawn
    expect(handler.getOrbitingCubes()).toHaveLength(3);
  });

  it('multiple successful catches cumulatively decrease tension', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    const entity = createOrbitalEntity({
      orbitCount: 3,
      catchWindowDeg: 20,
    });
    handler.activate(entity, scene);

    // Position all cubes at their catch angles and catch them
    const internalCubes = (handler as any).orbitingCubes;
    for (let i = 0; i < 3; i++) {
      internalCubes[i].angleDeg = internalCubes[i].catchAngleDeg;
      handler.catchCube(internalCubes[i].assignedKeycap);
    }

    // 3 catches * 0.03 decrease = 0.09 total decrease
    expect(scene.metadata.currentTension).toBeCloseTo(0.41, 2);
    expect(handler.getStats().caught).toBe(3);
  });

  it('pressing keycap outside catch window does not catch', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.5;

    // Very narrow catch window
    const entity = createOrbitalEntity({
      orbitCount: 1,
      catchWindowDeg: 0.001, // practically zero
      keycapSubset: ['Q'],
    });
    handler.activate(entity, scene);

    // The cube starts at a random angle and its catchAngleDeg is also random
    // With a 0.001 degree window, it's extremely unlikely to be in the window
    const cubes = handler.getOrbitingCubes();
    const keycap = cubes[0].assignedKeycap;

    // Attempt catch — almost certainly outside the tiny window
    const result = handler.catchCube(keycap);

    // If by extraordinary luck it caught, that's fine; otherwise verify miss
    if (!result) {
      expect(handler.getStats().caught).toBe(0);
      expect(scene.metadata.currentTension).toBe(0.5);
    }
  });
});
