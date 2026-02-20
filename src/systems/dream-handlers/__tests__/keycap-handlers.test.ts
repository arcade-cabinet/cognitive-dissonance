/**
 * Tests for Keycap/Rhythm group DreamHandler implementations
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
import { hasHandler, getHandlerFactory } from '../index';

// ═══════════════════════════════════════════════════
// WhackAMoleHandler
// ═══════════════════════════════════════════════════

describe('WhackAMoleHandler', () => {
  let handler: WhackAMoleHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new WhackAMoleHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(WhackAMoleHandler);
  });

  it('activate does not throw', () => {
    const entity: GameEntity = {
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
          emergeIntervalMs: 1500,
          decoyRate: 0.1,
        },
        seedHash: 42,
        pacing: 'reactive',
        cognitiveLoad: 'low-med',
      },
    };
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'WhackAMole',
        slots: {
          keycapSubset: ['Q', 'W', 'E'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: true,
          emergeDurationMs: 800,
          maxSimultaneous: 2,
          emergeIntervalMs: 1000,
          decoyRate: 0,
        },
        seedHash: 42,
        pacing: 'reactive',
        cognitiveLoad: 'low-med',
      },
    };
    handler.activate(entity, mockScene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('sets keycaps below surface on activate', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'WhackAMole',
        slots: {
          keycapSubset: ['Q', 'W'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: true,
          emergeDurationMs: 1000,
          maxSimultaneous: 2,
          emergeIntervalMs: 1000,
          decoyRate: 0,
        },
        seedHash: 42,
        pacing: 'reactive',
        cognitiveLoad: 'low-med',
      },
    };
    handler.activate(entity, mockScene);

    // Verify keycap meshes were positioned below surface
    const qMesh = mockScene.getMeshByName('keycap-Q');
    const wMesh = mockScene.getMeshByName('keycap-W');
    expect(qMesh.position.y).toBe(-0.05);
    expect(wMesh.position.y).toBe(-0.05);
  });

  it('update does not throw', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'WhackAMole',
        slots: {
          keycapSubset: ['Q', 'W', 'E'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: true,
          emergeDurationMs: 1000,
          maxSimultaneous: 2,
          emergeIntervalMs: 1000,
          decoyRate: 0,
        },
        seedHash: 42,
        pacing: 'reactive',
        cognitiveLoad: 'low-med',
      },
    };
    handler.activate(entity, mockScene);
    expect(() => handler.update(0.016)).not.toThrow();
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('WhackAMole')).toBe(true);
    expect(getHandlerFactory('WhackAMole')).toBe(WhackAMoleHandler);
  });
});

// ═══════════════════════════════════════════════════
// ChordHoldHandler
// ═══════════════════════════════════════════════════

describe('ChordHoldHandler', () => {
  let handler: ChordHoldHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ChordHoldHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(ChordHoldHandler);
  });

  it('activate does not throw', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'ChordHold',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R', 'T', 'A'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: true,
          morphCubeActive: false,
          chordSize: 3,
          holdDurationMs: 1000,
          sequenceLength: 5,
          transitionWindowMs: 500,
        },
        seedHash: 42,
        pacing: 'deliberate',
        cognitiveLoad: 'medium',
      },
    };
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const entity: GameEntity = {
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
          holdDurationMs: 800,
          sequenceLength: 3,
          transitionWindowMs: 300,
        },
        seedHash: 42,
        pacing: 'deliberate',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('generates chord sequence on activate', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'ChordHold',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R', 'T', 'A'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: true,
          morphCubeActive: false,
          chordSize: 2,
          holdDurationMs: 1000,
          sequenceLength: 4,
          transitionWindowMs: 500,
        },
        seedHash: 42,
        pacing: 'deliberate',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);

    const progress = handler.getProgress();
    expect(progress.current).toBe(0);
    expect(progress.total).toBe(4);
    expect(progress.complete).toBe(false);
  });

  it('getCurrentChordKeys returns keys for first chord', () => {
    const entity: GameEntity = {
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
          holdDurationMs: 1000,
          sequenceLength: 3,
          transitionWindowMs: 500,
        },
        seedHash: 42,
        pacing: 'deliberate',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);

    const chordKeys = handler.getCurrentChordKeys();
    expect(chordKeys).toHaveLength(2);
    // All chord keys should come from the keycap subset
    for (const key of chordKeys) {
      expect(['Q', 'W', 'E', 'R']).toContain(key);
    }
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('ChordHold')).toBe(true);
    expect(getHandlerFactory('ChordHold')).toBe(ChordHoldHandler);
  });
});

// ═══════════════════════════════════════════════════
// RhythmGateHandler
// ═══════════════════════════════════════════════════

describe('RhythmGateHandler', () => {
  let handler: RhythmGateHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new RhythmGateHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(RhythmGateHandler);
  });

  it('activate does not throw', () => {
    const entity: GameEntity = {
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
          openRatio: 0.4,
          leverRequired: false,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const entity: GameEntity = {
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
          openRatio: 0.4,
          leverRequired: false,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('stores BPM from slot params on activate', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'RhythmGate',
        slots: {
          keycapSubset: ['Q', 'W', 'E'],
          leverActive: false,
          platterActive: false,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: true,
          bpm: 90,
          gatePattern: 'eighth' as const,
          openRatio: 0.3,
          leverRequired: true,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);

    expect(handler.getBpm()).toBe(90);
  });

  it('update advances beat clock', () => {
    const entity: GameEntity = {
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
          openRatio: 0.4,
          leverRequired: false,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);

    // At 120 BPM, beat period = 0.5s. After 0.6s, should be on beat 1.
    handler.update(0.6);
    expect(handler.getCurrentBeat()).toBe(1);
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('RhythmGate')).toBe(true);
    expect(getHandlerFactory('RhythmGate')).toBe(RhythmGateHandler);
  });
});

// ═══════════════════════════════════════════════════
// GhostChaseHandler
// ═══════════════════════════════════════════════════

describe('GhostChaseHandler', () => {
  let handler: GhostChaseHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new GhostChaseHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(GhostChaseHandler);
  });

  it('activate does not throw', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'GhostChase',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R', 'T', 'A'],
          leverActive: false,
          platterActive: false,
          sphereActive: true,
          crystallineCubeActive: false,
          morphCubeActive: true,
          echoDelayMs: 1500,
          echoCount: 2,
          harmonizeMode: 'interleave' as const,
          echoDecayRate: 0.02,
        },
        seedHash: 42,
        pacing: 'layered',
        cognitiveLoad: 'high',
      },
    };
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'GhostChase',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R'],
          leverActive: false,
          platterActive: false,
          sphereActive: true,
          crystallineCubeActive: false,
          morphCubeActive: true,
          echoDelayMs: 1000,
          echoCount: 1,
          harmonizeMode: 'complement' as const,
          echoDecayRate: 0.03,
        },
        seedHash: 42,
        pacing: 'layered',
        cognitiveLoad: 'high',
      },
    };
    handler.activate(entity, mockScene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('initializes echo layers on activate', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'GhostChase',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R'],
          leverActive: false,
          platterActive: false,
          sphereActive: true,
          crystallineCubeActive: false,
          morphCubeActive: true,
          echoDelayMs: 1000,
          echoCount: 3,
          harmonizeMode: 'invert' as const,
          echoDecayRate: 0.02,
        },
        seedHash: 42,
        pacing: 'layered',
        cognitiveLoad: 'high',
      },
    };
    handler.activate(entity, mockScene);

    expect(handler.getEchoLayerCount()).toBe(3);
  });

  it('recording buffer starts empty', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'GhostChase',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R'],
          leverActive: false,
          platterActive: false,
          sphereActive: true,
          crystallineCubeActive: false,
          morphCubeActive: true,
          echoDelayMs: 1000,
          echoCount: 2,
          harmonizeMode: 'interleave' as const,
          echoDecayRate: 0.02,
        },
        seedHash: 42,
        pacing: 'layered',
        cognitiveLoad: 'high',
      },
    };
    handler.activate(entity, mockScene);

    expect(handler.getRecordingLength()).toBe(0);
  });

  it('records presses from scene metadata during update', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'GhostChase',
        slots: {
          keycapSubset: ['Q', 'W', 'E', 'R'],
          leverActive: false,
          platterActive: false,
          sphereActive: true,
          crystallineCubeActive: false,
          morphCubeActive: true,
          echoDelayMs: 2000,
          echoCount: 1,
          harmonizeMode: 'interleave' as const,
          echoDecayRate: 0.02,
        },
        seedHash: 42,
        pacing: 'layered',
        cognitiveLoad: 'high',
      },
    };
    handler.activate(entity, mockScene);

    // Simulate a key press
    mockScene.metadata.pressedKeys = new Set(['Q']);
    handler.update(0.016);

    expect(handler.getRecordingLength()).toBe(1);
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('GhostChase')).toBe(true);
    expect(getHandlerFactory('GhostChase')).toBe(GhostChaseHandler);
  });
});

// ═══════════════════════════════════════════════════
// TurntableScratchHandler
// ═══════════════════════════════════════════════════

describe('TurntableScratchHandler', () => {
  let handler: TurntableScratchHandler;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new TurntableScratchHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(TurntableScratchHandler);
  });

  it('activate does not throw', () => {
    const entity: GameEntity = {
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
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('dispose does not throw after activate', () => {
    const entity: GameEntity = {
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
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);
    expect(() => handler.dispose()).not.toThrow();
  });

  it('creates correct number of scratch points on activate', () => {
    const entity: GameEntity = {
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
          scratchPoints: 3,
          bpm: 100,
          keyDropSubset: ['Q'],
          scratchWindowMs: 150,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);

    const points = handler.getScratchPoints();
    expect(points).toHaveLength(3);
    // All scratch points should start un-hit
    for (const point of points) {
      expect(point.hit).toBe(false);
      expect(point.angle).toBeGreaterThan(0);
      expect(point.angle).toBeLessThan(2 * Math.PI);
    }
  });

  it('platter angle starts at 0', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'TurntableScratch',
        slots: {
          keycapSubset: ['Q', 'W'],
          leverActive: true,
          platterActive: true,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: false,
          phraseLengthBeats: 4,
          scratchPoints: 1,
          bpm: 120,
          keyDropSubset: ['Q'],
          scratchWindowMs: 200,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);
    expect(handler.getPlatterAngle()).toBe(0);
  });

  it('update advances platter angle', () => {
    const entity: GameEntity = {
      archetype: {
        type: 'TurntableScratch',
        slots: {
          keycapSubset: ['Q', 'W'],
          leverActive: true,
          platterActive: true,
          sphereActive: false,
          crystallineCubeActive: false,
          morphCubeActive: false,
          phraseLengthBeats: 4,
          scratchPoints: 1,
          bpm: 120,
          keyDropSubset: ['Q'],
          scratchWindowMs: 200,
        },
        seedHash: 42,
        pacing: 'rhythmic',
        cognitiveLoad: 'medium',
      },
    };
    handler.activate(entity, mockScene);

    handler.update(0.5);
    expect(handler.getPlatterAngle()).toBeGreaterThan(0);
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('TurntableScratch')).toBe(true);
    expect(getHandlerFactory('TurntableScratch')).toBe(TurntableScratchHandler);
  });
});
