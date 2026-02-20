/**
 * Tests for Combined-Surface Dream Handlers
 *
 * Covers: ConductorHandler, LockPickHandler, ResonanceHandler,
 *         TendrilDodgeHandler, OrbitalCatchHandler
 *
 * Each handler: instantiation, activate/dispose safety, internal state verification
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

function createMockScene(overrides: Record<string, unknown> = {}) {
  return {
    getMeshByName: jest.fn((name: string) => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: {
        emissiveColor: { r: 0, g: 0, b: 0 },
      },
      dispose: jest.fn(),
    })),
    metadata: { currentTension: 0, pressedKeys: new Set<string>() },
    ...overrides,
  } as any;
}

function createEntityWithSlots<T>(slots: T): GameEntity {
  return {
    archetype: {
      type: 'Conductor' as any,
      slots: slots as any,
      seedHash: 12345,
      pacing: 'rhythmic',
      cognitiveLoad: 'medium',
    },
  };
}

// ── ConductorHandler Tests ──

describe('ConductorHandler', () => {
  let ConductorHandler: any;

  beforeAll(async () => {
    const mod = await import('../ConductorHandler');
    ConductorHandler = mod.ConductorHandler;
  });

  it('can be instantiated', () => {
    const handler = new ConductorHandler();
    expect(handler).toBeDefined();
  });

  it('activate does not throw', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const slots: Partial<ConductorSlots> = {
      targetBpm: 100,
      dynamicCurve: 'crescendo',
      sectionCount: 3,
      toleranceBpm: 10,
      keycapSubset: ['Q', 'W', 'E'],
    };
    const entity = createEntityWithSlots(slots);
    expect(() => handler.activate(entity, scene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      targetBpm: 120,
      dynamicCurve: 'decrescendo',
      sectionCount: 4,
      toleranceBpm: 8,
      keycapSubset: ['Q', 'W'],
    });
    handler.activate(entity, scene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('calculates correct number of section BPM targets based on sectionCount', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      targetBpm: 120,
      dynamicCurve: 'crescendo',
      sectionCount: 5,
      toleranceBpm: 10,
      keycapSubset: ['Q'],
    });
    handler.activate(entity, scene);
    const targets = handler.getSectionBpmTargets();
    expect(targets).toHaveLength(5);
  });

  it('crescendo targets increase through sections', () => {
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
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).toBeGreaterThanOrEqual(targets[i - 1]);
    }
  });

  it('decrescendo targets decrease through sections', () => {
    const handler = new ConductorHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      targetBpm: 120,
      dynamicCurve: 'decrescendo',
      sectionCount: 4,
      toleranceBpm: 10,
      keycapSubset: ['Q'],
    });
    handler.activate(entity, scene);
    const targets = handler.getSectionBpmTargets();
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).toBeLessThanOrEqual(targets[i - 1]);
    }
  });
});

// ── LockPickHandler Tests ──

describe('LockPickHandler', () => {
  let LockPickHandler: any;

  beforeAll(async () => {
    const mod = await import('../LockPickHandler');
    LockPickHandler = mod.LockPickHandler;
  });

  it('can be instantiated', () => {
    const handler = new LockPickHandler();
    expect(handler).toBeDefined();
  });

  it('activate does not throw', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    const slots: Partial<LockPickSlots> = {
      pinCount: 4,
      notchWidthDeg: 8,
      notchPositions: [45, 120, 210, 300],
      resetPenalty: 'reset-one',
      leverHoldDurationMs: 400,
    };
    const entity = createEntityWithSlots(slots);
    expect(() => handler.activate(entity, scene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      pinCount: 3,
      notchWidthDeg: 10,
      notchPositions: [90, 180, 270],
      resetPenalty: 'reset-all',
      leverHoldDurationMs: 500,
    });
    handler.activate(entity, scene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('initializes correct number of pin states', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      pinCount: 5,
      notchWidthDeg: 6,
      notchPositions: [30, 90, 150, 210, 330],
      resetPenalty: 'reset-one',
      leverHoldDurationMs: 300,
    });
    handler.activate(entity, scene);
    const states = handler.getPinStates();
    expect(states).toHaveLength(5);
    // All pins should start unlocked
    for (const state of states) {
      expect(state.locked).toBe(false);
      expect(state.holdProgress).toBe(0);
    }
  });

  it('all pins unlocked at start means areAllPinsLocked is false', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      pinCount: 3,
      notchWidthDeg: 10,
      notchPositions: [90, 180, 270],
      resetPenalty: 'reset-one',
      leverHoldDurationMs: 500,
    });
    handler.activate(entity, scene);
    expect(handler.areAllPinsLocked()).toBe(false);
  });

  it('failed attempts counter starts at 0', () => {
    const handler = new LockPickHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      pinCount: 3,
      notchWidthDeg: 10,
      notchPositions: [90, 180, 270],
      resetPenalty: 'reset-one',
      leverHoldDurationMs: 500,
    });
    handler.activate(entity, scene);
    expect(handler.getFailedAttempts()).toBe(0);
  });
});

// ── ResonanceHandler Tests ──

describe('ResonanceHandler', () => {
  let ResonanceHandler: any;

  beforeAll(async () => {
    const mod = await import('../ResonanceHandler');
    ResonanceHandler = mod.ResonanceHandler;
  });

  it('can be instantiated', () => {
    const handler = new ResonanceHandler();
    expect(handler).toBeDefined();
  });

  it('activate does not throw', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    const slots: Partial<ResonanceSlots> = {
      resonanceFrequency: 0.5,
      toleranceBand: 0.1,
      frequencyDriftRate: 0.005,
      amplitudeRange: [0.2, 0.8],
      holdDurationS: 5,
    };
    const entity = createEntityWithSlots(slots);
    expect(() => handler.activate(entity, scene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      resonanceFrequency: 0.3,
      toleranceBand: 0.15,
      frequencyDriftRate: 0.003,
      amplitudeRange: [0.1, 0.9],
      holdDurationS: 4,
    });
    handler.activate(entity, scene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('resonance progress starts at 0', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      resonanceFrequency: 0.6,
      toleranceBand: 0.1,
      frequencyDriftRate: 0.005,
      amplitudeRange: [0.2, 0.8],
      holdDurationS: 5,
    });
    handler.activate(entity, scene);
    const state = handler.getResonanceState();
    expect(state.progress).toBe(0);
    expect(state.isComplete).toBe(false);
  });

  it('target frequency matches initial slot parameter', () => {
    const handler = new ResonanceHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      resonanceFrequency: 0.7,
      toleranceBand: 0.1,
      frequencyDriftRate: 0.005,
      amplitudeRange: [0.2, 0.8],
      holdDurationS: 5,
    });
    handler.activate(entity, scene);
    const state = handler.getResonanceState();
    expect(state.targetFrequency).toBe(0.7);
    expect(state.holdDuration).toBe(5);
  });
});

// ── TendrilDodgeHandler Tests ──

describe('TendrilDodgeHandler', () => {
  let TendrilDodgeHandler: any;

  beforeAll(async () => {
    const mod = await import('../TendrilDodgeHandler');
    TendrilDodgeHandler = mod.TendrilDodgeHandler;
  });

  it('can be instantiated', () => {
    const handler = new TendrilDodgeHandler();
    expect(handler).toBeDefined();
  });

  it('activate does not throw', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    const slots: Partial<TendrilDodgeSlots> = {
      tendrilWaveSize: 5,
      waveIntervalS: 3,
      approachSpeed: 0.8,
      dissolveAngleDeg: 25,
      shieldDurationMs: 600,
      shieldCooldownS: 5,
      keycapSubset: ['Q', 'W', 'E'],
    };
    const entity = createEntityWithSlots(slots);
    expect(() => handler.activate(entity, scene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      tendrilWaveSize: 4,
      waveIntervalS: 5,
      approachSpeed: 1.0,
      dissolveAngleDeg: 30,
      shieldDurationMs: 1000,
      shieldCooldownS: 7,
      keycapSubset: ['Q', 'W'],
    });
    handler.activate(entity, scene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('shield starts as ready', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      tendrilWaveSize: 6,
      waveIntervalS: 4,
      approachSpeed: 0.5,
      dissolveAngleDeg: 20,
      shieldDurationMs: 500,
      shieldCooldownS: 4,
      keycapSubset: ['Q', 'W', 'E'],
    });
    handler.activate(entity, scene);
    expect(handler.isShieldReady()).toBe(true);
    expect(handler.isShieldActive()).toBe(false);
  });

  it('no active tendrils at start', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      tendrilWaveSize: 8,
      waveIntervalS: 3,
      approachSpeed: 1.2,
      dissolveAngleDeg: 35,
      shieldDurationMs: 800,
      shieldCooldownS: 6,
      keycapSubset: ['Q', 'W', 'E', 'R'],
    });
    handler.activate(entity, scene);
    expect(handler.getActiveTendrilCount()).toBe(0);
    expect(handler.getWaveCount()).toBe(0);
  });

  it('dispose clears shield state', () => {
    const handler = new TendrilDodgeHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      tendrilWaveSize: 3,
      waveIntervalS: 2,
      approachSpeed: 0.5,
      dissolveAngleDeg: 15,
      shieldDurationMs: 300,
      shieldCooldownS: 3,
      keycapSubset: ['Q'],
    });
    handler.activate(entity, scene);
    handler.dispose();
    expect(handler.isShieldActive()).toBe(false);
    expect(handler.isShieldReady()).toBe(true);
  });
});

// ── OrbitalCatchHandler Tests ──

describe('OrbitalCatchHandler', () => {
  let OrbitalCatchHandler: any;

  beforeAll(async () => {
    const mod = await import('../OrbitalCatchHandler');
    OrbitalCatchHandler = mod.OrbitalCatchHandler;
  });

  it('can be instantiated', () => {
    const handler = new OrbitalCatchHandler();
    expect(handler).toBeDefined();
  });

  it('activate does not throw', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    const slots: Partial<OrbitalCatchSlots> = {
      orbitCount: 3,
      orbitSpeedBase: 1.0,
      orbitRadiusRange: [0.3, 0.7],
      altitudeRange: [-0.2, 0.4],
      catchWindowDeg: 20,
      keycapSubset: ['Q', 'W', 'E', 'R'],
    };
    const entity = createEntityWithSlots(slots);
    expect(() => handler.activate(entity, scene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      orbitCount: 2,
      orbitSpeedBase: 0.8,
      orbitRadiusRange: [0.4, 0.8],
      altitudeRange: [-0.1, 0.3],
      catchWindowDeg: 15,
      keycapSubset: ['Q', 'W'],
    });
    handler.activate(entity, scene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('spawns correct number of initial orbiting cubes', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      orbitCount: 3,
      orbitSpeedBase: 1.0,
      orbitRadiusRange: [0.3, 0.7],
      altitudeRange: [-0.2, 0.4],
      catchWindowDeg: 20,
      keycapSubset: ['Q', 'W', 'E'],
    });
    handler.activate(entity, scene);
    const cubes = handler.getOrbitingCubes();
    expect(cubes).toHaveLength(3);
  });

  it('catch stats start at zero', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    const entity = createEntityWithSlots({
      orbitCount: 2,
      orbitSpeedBase: 1.0,
      orbitRadiusRange: [0.4, 0.8],
      altitudeRange: [-0.1, 0.3],
      catchWindowDeg: 25,
      keycapSubset: ['Q', 'W'],
    });
    handler.activate(entity, scene);
    const stats = handler.getStats();
    expect(stats.caught).toBe(0);
    expect(stats.missed).toBe(0);
  });

  it('each orbiting cube has assigned keycap from subset', () => {
    const handler = new OrbitalCatchHandler();
    const scene = createMockScene();
    const keycapSubset = ['Q', 'W', 'E'];
    const entity = createEntityWithSlots({
      orbitCount: 4,
      orbitSpeedBase: 1.0,
      orbitRadiusRange: [0.3, 0.7],
      altitudeRange: [-0.2, 0.4],
      catchWindowDeg: 20,
      keycapSubset,
    });
    handler.activate(entity, scene);
    const cubes = handler.getOrbitingCubes();
    for (const cube of cubes) {
      expect(keycapSubset).toContain(cube.assignedKeycap);
    }
  });
});
