/**
 * Tests for Sphere/Zen group DreamHandler implementations
 *
 * Covers: FacetAlignHandler, MorphMirrorHandler, SphereSculptHandler,
 *         ZenDriftHandler, LabyrinthHandler
 *
 * Tests per handler:
 * - Can be instantiated
 * - activate/dispose don't throw with mock scene
 * - Internal state is set correctly after activate
 * - Registered in handler registry
 * - Handler-specific behavior tests
 */

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
jest.mock('@babylonjs/core/Meshes/mesh', () => ({}));

jest.mock('@babylonjs/core/scene', () => ({}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: Object.assign(
    jest.fn((x: number, y: number, z: number) => ({ x, y, z })),
    {
      Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    },
  ),
}));

import type { GameEntity } from '../../../types';
import { hasHandler, getHandlerFactory } from '../index';
import { FacetAlignHandler } from '../FacetAlignHandler';
import { MorphMirrorHandler } from '../MorphMirrorHandler';
import { SphereSculptHandler } from '../SphereSculptHandler';
import { ZenDriftHandler } from '../ZenDriftHandler';
import { LabyrinthHandler } from '../LabyrinthHandler';

// ── Helpers ──

function createMockScene() {
  return {
    getMeshByName: jest.fn(() => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      dispose: jest.fn(),
      isVisible: true,
      setEnabled: jest.fn(),
      material: null,
    })),
    metadata: { currentTension: 0.5 },
  } as any;
}

function createMockEntity(archetypeSlots?: Record<string, unknown>): GameEntity {
  return {
    archetype: archetypeSlots
      ? { type: 'FacetAlign', slots: archetypeSlots as any, seedHash: 42, pacing: 'deliberate', cognitiveLoad: 'medium' }
      : undefined,
  };
}

// =============================================================================
// FacetAlignHandler
// =============================================================================

describe('FacetAlignHandler', () => {
  let handler: FacetAlignHandler;
  let mockScene: any;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new FacetAlignHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeInstanceOf(FacetAlignHandler);
  });

  it('is registered in handler registry', () => {
    expect(hasHandler('FacetAlign')).toBe(true);
    expect(getHandlerFactory('FacetAlign')).toBe(FacetAlignHandler);
  });

  it('activate does not throw with mock scene', () => {
    const entity = createMockEntity({
      facetCount: 6,
      alignmentThresholdDeg: 12,
      scrambleIntervalS: 14,
      lockoutDurationMs: 600,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: true,
      morphCubeActive: false,
    });
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('initializes facet states after activate', () => {
    const entity = createMockEntity({
      facetCount: 5,
      alignmentThresholdDeg: 10,
      scrambleIntervalS: 12,
      lockoutDurationMs: 500,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: true,
      morphCubeActive: false,
    });
    handler.activate(entity, mockScene);

    const facets = handler.getFacets();
    expect(facets).toHaveLength(5);
    for (const facet of facets) {
      expect(facet.targetAngleDeg).toBeGreaterThanOrEqual(0);
      expect(facet.targetAngleDeg).toBeLessThan(360);
      expect(facet.locked).toBe(false);
      expect(facet.permanent).toBe(false);
    }
  });

  it('dispose clears facet state', () => {
    const entity = createMockEntity({
      facetCount: 4,
      alignmentThresholdDeg: 15,
      scrambleIntervalS: 10,
      lockoutDurationMs: 400,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: true,
      morphCubeActive: false,
    });
    handler.activate(entity, mockScene);
    expect(handler.getFacets().length).toBeGreaterThan(0);

    handler.dispose();
    expect(handler.getFacets()).toHaveLength(0);
    expect(handler.isDreamComplete()).toBe(false);
  });

  it('update does not throw when sphere mesh is missing', () => {
    mockScene.getMeshByName = jest.fn(() => null);
    const entity = createMockEntity();
    handler.activate(entity, mockScene);
    expect(() => handler.update(0.016)).not.toThrow();
  });
});

// =============================================================================
// MorphMirrorHandler
// =============================================================================

describe('MorphMirrorHandler', () => {
  let handler: MorphMirrorHandler;
  let mockScene: any;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new MorphMirrorHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeInstanceOf(MorphMirrorHandler);
  });

  it('is registered in handler registry', () => {
    expect(hasHandler('MorphMirror')).toBe(true);
    expect(getHandlerFactory('MorphMirror')).toBe(MorphMirrorHandler);
  });

  it('activate does not throw with mock scene', () => {
    const entity = createMockEntity({
      cubePatternSpeed: 0.8,
      cubeMotionType: 'rotation',
      inversePrecisionDeg: 20,
      patternChangeIntervalS: 6,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: true,
    });
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('initializes with correct motion type from slots', () => {
    const entity = createMockEntity({
      cubePatternSpeed: 1.2,
      cubeMotionType: 'stretch',
      inversePrecisionDeg: 15,
      patternChangeIntervalS: 5,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: true,
    });
    handler.activate(entity, mockScene);
    expect(handler.getCurrentMotionType()).toBe('stretch');
  });

  it('match accumulator starts at zero', () => {
    const entity = createMockEntity();
    handler.activate(entity, mockScene);
    expect(handler.getMatchAccumulator()).toBe(0);
  });

  it('dispose resets internal state', () => {
    const entity = createMockEntity({
      cubePatternSpeed: 0.5,
      cubeMotionType: 'oscillate',
      inversePrecisionDeg: 25,
      patternChangeIntervalS: 8,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: true,
    });
    handler.activate(entity, mockScene);
    handler.update(0.016);
    handler.dispose();
    expect(handler.getMatchAccumulator()).toBe(0);
  });
});

// =============================================================================
// SphereSculptHandler
// =============================================================================

describe('SphereSculptHandler', () => {
  let handler: SphereSculptHandler;
  let mockScene: any;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new SphereSculptHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeInstanceOf(SphereSculptHandler);
  });

  it('is registered in handler registry', () => {
    expect(hasHandler('SphereSculpt')).toBe(true);
    expect(getHandlerFactory('SphereSculpt')).toBe(SphereSculptHandler);
  });

  it('activate does not throw with mock scene', () => {
    const entity = createMockEntity({
      targetComplexity: 0.6,
      axisMappingSensitivity: 1.0,
      morphDamping: 0.6,
      targetHoldDurationS: 4,
      targetChangeIntervalS: 20,
      keycapSubset: ['Q', 'W'],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: true,
      morphCubeActive: true,
    });
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('initializes three morph axes with targets after activate', () => {
    const entity = createMockEntity({
      targetComplexity: 0.8,
      axisMappingSensitivity: 1.5,
      morphDamping: 0.7,
      targetHoldDurationS: 3,
      targetChangeIntervalS: 15,
      keycapSubset: ['Q', 'W', 'E'],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: true,
      morphCubeActive: true,
    });
    handler.activate(entity, mockScene);

    const axes = handler.getAxes();
    expect(axes).toHaveLength(3);
    for (const axis of axes) {
      expect(axis.current).toBe(0);
      expect(axis.target).toBeGreaterThanOrEqual(0);
      expect(axis.target).toBeLessThanOrEqual(1);
      expect(axis.locked).toBe(false);
    }
  });

  it('lockAxis and unlockAxis toggle axis lock state', () => {
    const entity = createMockEntity();
    handler.activate(entity, mockScene);

    handler.lockAxis(1);
    expect(handler.getAxes()[1].locked).toBe(true);

    handler.unlockAxis(1);
    expect(handler.getAxes()[1].locked).toBe(false);
  });

  it('dispose resets axes and shape completion', () => {
    const entity = createMockEntity({
      targetComplexity: 0.5,
      axisMappingSensitivity: 1.0,
      morphDamping: 0.5,
      targetHoldDurationS: 5,
      targetChangeIntervalS: 25,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: true,
      morphCubeActive: true,
    });
    handler.activate(entity, mockScene);
    handler.dispose();

    expect(handler.isShapeComplete()).toBe(false);
    expect(handler.getHoldProgress()).toBe(0);
  });
});

// =============================================================================
// ZenDriftHandler
// =============================================================================

describe('ZenDriftHandler', () => {
  let handler: ZenDriftHandler;
  let mockScene: any;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ZenDriftHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeInstanceOf(ZenDriftHandler);
  });

  it('is registered in handler registry', () => {
    expect(hasHandler('ZenDrift')).toBe(true);
    expect(getHandlerFactory('ZenDrift')).toBe(ZenDriftHandler);
  });

  it('activate does not throw with mock scene', () => {
    const entity = createMockEntity({
      driftSpeed: 0.003,
      jerkThreshold: 0.03,
      coherenceDecayRate: 0.01,
      sessionDurationS: 60,
      gazeWeight: 0.5,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: true,
    });
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('initializes smoothness score to 1.0 and session progress to 0', () => {
    const entity = createMockEntity();
    handler.activate(entity, mockScene);
    expect(handler.getSmoothnessScore()).toBe(1.0);
    expect(handler.getSessionProgress()).toBe(0);
    expect(handler.isSessionComplete()).toBe(false);
  });

  it('session progress increases with update calls', () => {
    const entity = createMockEntity({
      driftSpeed: 0.003,
      jerkThreshold: 0.03,
      coherenceDecayRate: 0.01,
      sessionDurationS: 10, // Short session for testing
      gazeWeight: 0.5,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: true,
    });
    handler.activate(entity, mockScene);

    // Simulate 5 seconds of updates
    for (let i = 0; i < 50; i++) {
      handler.update(0.1);
    }

    expect(handler.getSessionProgress()).toBeCloseTo(0.5, 1);
    expect(handler.isSessionComplete()).toBe(false);
  });

  it('dispose resets all state', () => {
    const entity = createMockEntity();
    handler.activate(entity, mockScene);
    handler.update(1.0);
    handler.dispose();

    expect(handler.getSmoothnessScore()).toBe(1.0);
    expect(handler.getSessionProgress()).toBe(0);
    expect(handler.isSessionComplete()).toBe(false);
  });
});

// =============================================================================
// LabyrinthHandler
// =============================================================================

describe('LabyrinthHandler', () => {
  let handler: LabyrinthHandler;
  let mockScene: any;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new LabyrinthHandler();
    mockScene = createMockScene();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('can be instantiated', () => {
    expect(handler).toBeInstanceOf(LabyrinthHandler);
  });

  it('is registered in handler registry', () => {
    expect(hasHandler('Labyrinth')).toBe(true);
    expect(getHandlerFactory('Labyrinth')).toBe(LabyrinthHandler);
  });

  it('activate does not throw with mock scene', () => {
    const entity = createMockEntity({
      mazeComplexity: 5,
      particleSpeed: 1.0,
      targetZoneSize: 0.1,
      wallBounce: 'elastic',
      mazeRotationOffset: 0,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: false,
    });
    expect(() => handler.activate(entity, mockScene)).not.toThrow();
  });

  it('generates maze grid after activate', () => {
    const entity = createMockEntity({
      mazeComplexity: 4,
      particleSpeed: 1.0,
      targetZoneSize: 0.1,
      wallBounce: 'elastic',
      mazeRotationOffset: 0,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: false,
    });
    handler.activate(entity, mockScene);

    const maze = handler.getMaze();
    expect(maze).toHaveLength(4);
    expect(maze[0]).toHaveLength(4);
    // All cells should have been visited during generation
    for (const row of maze) {
      for (const cell of row) {
        expect(cell.visited).toBe(true);
      }
    }
  });

  it('particle starts at initial position and target is not yet reached', () => {
    const entity = createMockEntity({
      mazeComplexity: 3,
      particleSpeed: 1.5,
      targetZoneSize: 0.1,
      wallBounce: 'sticky',
      mazeRotationOffset: 0.5,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: false,
    });
    handler.activate(entity, mockScene);

    const particle = handler.getParticlePosition();
    expect(particle.theta).toBe(0.5); // mazeRotationOffset
    expect(particle.phi).toBeCloseTo(Math.PI * 0.3);
    expect(handler.isTargetReached()).toBe(false);
  });

  it('dispose clears maze and particle state', () => {
    const entity = createMockEntity({
      mazeComplexity: 3,
      particleSpeed: 1.0,
      targetZoneSize: 0.15,
      wallBounce: 'elastic',
      mazeRotationOffset: 0,
      keycapSubset: [],
      leverActive: false,
      platterActive: false,
      sphereActive: true,
      crystallineCubeActive: false,
      morphCubeActive: false,
    });
    handler.activate(entity, mockScene);
    expect(handler.getMaze().length).toBeGreaterThan(0);

    handler.dispose();
    expect(handler.getMaze()).toHaveLength(0);
    expect(handler.isTargetReached()).toBe(false);
  });
});
