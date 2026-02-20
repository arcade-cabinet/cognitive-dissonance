/**
 * Tests for Cube/Meta group DreamHandler implementations
 *
 * Covers: CubeJuggleHandler, CubeStackHandler, PinballHandler,
 *         EscalationHandler, SurvivalHandler, RefractionAimHandler
 */

import type { GameEntity } from '../../../types';

// Mock @babylonjs/core modules before importing handlers
jest.mock('@babylonjs/core/Materials/PBR/pbrMaterial', () => ({
  PBRMaterial: jest.fn().mockImplementation(() => ({
    metallic: 0,
    roughness: 0,
    albedoColor: null,
    emissiveColor: null,
    alpha: 1,
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn().mockImplementation((r: number, g: number, b: number) => ({ r, g, b })),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: jest.fn().mockImplementation((x: number, y: number, z: number) => ({ x, y, z })),
}));

jest.mock('@babylonjs/core/Meshes/mesh', () => ({}));

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreatePlane: jest.fn().mockReturnValue({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: null,
      dispose: jest.fn(),
    }),
  },
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    to: jest.fn(),
    killTweensOf: jest.fn(),
  },
}));

// Import handlers (triggers self-registration as side effect)
import { CubeJuggleHandler } from '../CubeJuggleHandler';
import { CubeStackHandler } from '../CubeStackHandler';
import { PinballHandler } from '../PinballHandler';
import { EscalationHandler } from '../EscalationHandler';
import { SurvivalHandler } from '../SurvivalHandler';
import { RefractionAimHandler } from '../RefractionAimHandler';
import { getHandlerFactory, hasHandler } from '../index';

/** Create a mock Scene object */
function createMockScene(overrides?: Partial<Record<string, unknown>>) {
  return {
    metadata: { currentTension: 0.5, pressedKeys: new Set<string>() },
    getMeshByName: jest.fn().mockImplementation((name: string) => ({
      name,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: null,
      dispose: jest.fn(),
    })),
    ...overrides,
    // biome-ignore lint/suspicious/noExplicitAny: Mock scene type
  } as any;
}

/** Create a mock GameEntity with archetype slots */
function createMockEntity(slots: Record<string, unknown> = {}): GameEntity {
  return {
    archetype: {
      type: 'CubeJuggle',
      slots: {
        keycapSubset: ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'],
        leverActive: true,
        platterActive: true,
        sphereActive: true,
        crystallineCubeActive: true,
        morphCubeActive: true,
        ...slots,
      },
      seedHash: 42,
      pacing: 'frantic',
      cognitiveLoad: 'high',
    },
  } as GameEntity;
}

// ── CubeJuggleHandler ──

describe('CubeJuggleHandler', () => {
  it('can be instantiated', () => {
    const handler = new CubeJuggleHandler();
    expect(handler).toBeDefined();
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('CubeJuggle')).toBe(true);
    const Factory = getHandlerFactory('CubeJuggle');
    expect(Factory).toBe(CubeJuggleHandler);
  });

  it('activate/dispose do not throw', () => {
    const handler = new CubeJuggleHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ cubeCount: 3, decayRate: 0.02, bumpStrength: 0.5, orbitSpread: 0.5, spawnInterval: 10 });

    expect(() => handler.activate(entity, scene)).not.toThrow();
    expect(() => handler.dispose()).not.toThrow();
  });

  it('initializes orbit trackers matching cubeCount', () => {
    const handler = new CubeJuggleHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ cubeCount: 4 });

    handler.activate(entity, scene);
    expect(handler.getOrbitTrackers().length).toBe(4);
    expect(handler.getAliveCubeCount()).toBe(4);

    handler.dispose();
  });

  it('decays orbit radii during update', () => {
    const handler = new CubeJuggleHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ cubeCount: 2, decayRate: 0.05, spawnInterval: 999 });

    handler.activate(entity, scene);
    const initialRadii = handler.getOrbitTrackers().map((t) => t.radius);

    // Run several update frames
    for (let i = 0; i < 10; i++) {
      handler.update(0.1);
    }

    const updatedRadii = handler.getOrbitTrackers().map((t) => t.radius);
    // Radii should have decreased
    for (let i = 0; i < initialRadii.length; i++) {
      if (handler.getOrbitTrackers()[i].alive) {
        expect(updatedRadii[i]).toBeLessThan(initialRadii[i]);
      }
    }

    handler.dispose();
  });

  it('clears orbit trackers on dispose', () => {
    const handler = new CubeJuggleHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ cubeCount: 3 });

    handler.activate(entity, scene);
    expect(handler.getOrbitTrackers().length).toBe(3);

    handler.dispose();
    expect(handler.getOrbitTrackers().length).toBe(0);
  });
});

// ── CubeStackHandler ──

describe('CubeStackHandler', () => {
  it('can be instantiated', () => {
    const handler = new CubeStackHandler();
    expect(handler).toBeDefined();
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('CubeStack')).toBe(true);
    const Factory = getHandlerFactory('CubeStack');
    expect(Factory).toBe(CubeStackHandler);
  });

  it('activate/dispose do not throw', () => {
    const handler = new CubeStackHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ stackHeight: 3, driftForce: 0.01, alignmentThresholdDeg: 10, switchCooldownMs: 500, balanceDifficultyMode: 'static' });

    expect(() => handler.activate(entity, scene)).not.toThrow();
    expect(() => handler.dispose()).not.toThrow();
  });

  it('initializes stack cubes matching stackHeight', () => {
    const handler = new CubeStackHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ stackHeight: 4 });

    handler.activate(entity, scene);
    expect(handler.getStackCubes().length).toBe(4);
    expect(handler.getStandingCount()).toBe(4);

    handler.dispose();
  });

  it('applies drift force during update', () => {
    const handler = new CubeStackHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ stackHeight: 2, driftForce: 0.03, alignmentThresholdDeg: 90 });

    handler.activate(entity, scene);
    const initialTilts = handler.getStackCubes().map((c) => c.tiltDeg);

    // Update for a few frames
    for (let i = 0; i < 5; i++) {
      handler.update(0.1);
    }

    const updatedTilts = handler.getStackCubes().map((c) => c.tiltDeg);
    // Tilts should have changed (drift applied)
    expect(updatedTilts[0]).not.toBe(initialTilts[0]);

    handler.dispose();
  });

  it('clears state on dispose', () => {
    const handler = new CubeStackHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ stackHeight: 3 });

    handler.activate(entity, scene);
    handler.dispose();
    expect(handler.getStackCubes().length).toBe(0);
  });
});

// ── PinballHandler ──

describe('PinballHandler', () => {
  it('can be instantiated', () => {
    const handler = new PinballHandler();
    expect(handler).toBeDefined();
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('Pinball')).toBe(true);
    const Factory = getHandlerFactory('Pinball');
    expect(Factory).toBe(PinballHandler);
  });

  it('activate/dispose do not throw', () => {
    const handler = new PinballHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ ballSpeed: 1.0, flipperStrength: 1.0, bumperCount: 2, multiball: 2 });

    expect(() => handler.activate(entity, scene)).not.toThrow();
    expect(() => handler.dispose()).not.toThrow();
  });

  it('spawns correct number of balls for multiball', () => {
    const handler = new PinballHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ multiball: 3 });

    handler.activate(entity, scene);
    expect(handler.getBalls().length).toBe(3);
    expect(handler.getAliveBallCount()).toBe(3);

    handler.dispose();
  });

  it('moves balls during update', () => {
    const handler = new PinballHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ multiball: 1, ballSpeed: 1.0 });

    handler.activate(entity, scene);
    const initialBall = { ...handler.getBalls()[0] };

    handler.update(0.1);

    const updatedBall = handler.getBalls()[0];
    // Ball should have moved (y decreases due to gravity)
    expect(updatedBall.y).not.toBe(initialBall.y);

    handler.dispose();
  });

  it('clears state on dispose', () => {
    const handler = new PinballHandler();
    const scene = createMockScene();
    const entity = createMockEntity({ multiball: 2 });

    handler.activate(entity, scene);
    handler.dispose();
    expect(handler.getBalls().length).toBe(0);
    expect(handler.getScore()).toBe(0);
  });
});

// ── EscalationHandler ──

describe('EscalationHandler', () => {
  it('can be instantiated', () => {
    const handler = new EscalationHandler();
    expect(handler).toBeDefined();
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('Escalation')).toBe(true);
    const Factory = getHandlerFactory('Escalation');
    expect(Factory).toBe(EscalationHandler);
  });

  it('activate/dispose do not throw', () => {
    const handler = new EscalationHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      activationOrder: ['keycaps', 'lever', 'platter', 'sphere', 'crystallineCube', 'morphCube'],
      activationIntervalS: 20,
      startDifficulty: 'easy',
      maxDimensions: 4,
      compoundTensionMultiplier: 1.5,
    });

    expect(() => handler.activate(entity, scene)).not.toThrow();
    expect(() => handler.dispose()).not.toThrow();
  });

  it('activates first surface immediately on activate', () => {
    const handler = new EscalationHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      activationOrder: ['keycaps', 'lever', 'platter'],
      activationIntervalS: 30,
      startDifficulty: 'easy',
      maxDimensions: 3,
      compoundTensionMultiplier: 1.5,
    });

    handler.activate(entity, scene);
    expect(handler.getActiveChallengeCount()).toBe(1);
    expect(handler.getChallenges()[0].active).toBe(true);
    expect(handler.getChallenges()[1].active).toBe(false);

    handler.dispose();
  });

  it('activates next surface after activation interval', () => {
    const handler = new EscalationHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      activationOrder: ['keycaps', 'lever', 'platter'],
      activationIntervalS: 5,
      startDifficulty: 'easy',
      maxDimensions: 3,
      compoundTensionMultiplier: 1.2,
    });

    handler.activate(entity, scene);
    expect(handler.getActiveChallengeCount()).toBe(1);

    // Simulate enough time for the next activation
    for (let i = 0; i < 60; i++) {
      handler.update(0.1);
    }

    expect(handler.getActiveChallengeCount()).toBeGreaterThan(1);

    handler.dispose();
  });

  it('clears state on dispose', () => {
    const handler = new EscalationHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      activationOrder: ['keycaps', 'lever'],
      activationIntervalS: 10,
      startDifficulty: 'medium',
      maxDimensions: 3,
      compoundTensionMultiplier: 1.5,
    });

    handler.activate(entity, scene);
    handler.dispose();
    expect(handler.getChallenges().length).toBe(0);
    expect(handler.getActiveChallengeCount()).toBe(0);
  });
});

// ── SurvivalHandler ──

describe('SurvivalHandler', () => {
  it('can be instantiated', () => {
    const handler = new SurvivalHandler();
    expect(handler).toBeDefined();
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('Survival')).toBe(true);
    const Factory = getHandlerFactory('Survival');
    expect(Factory).toBe(SurvivalHandler);
  });

  it('activate/dispose do not throw', () => {
    const handler = new SurvivalHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      baseTensionRiseRate: 0.02,
      surfaceIntensity: { keycaps: 1.0, lever: 1.0, platter: 1.0, sphere: 1.0, cubes: 1.0 },
      respiteIntervalS: 0,
      cubeAggressionRate: 1.0,
    });

    expect(() => handler.activate(entity, scene)).not.toThrow();
    expect(() => handler.dispose()).not.toThrow();
  });

  it('constantly rises tension during update', () => {
    const handler = new SurvivalHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.1;
    const entity = createMockEntity({
      baseTensionRiseRate: 0.05,
      surfaceIntensity: { keycaps: 1.0, lever: 1.0, platter: 1.0, sphere: 1.0, cubes: 1.0 },
      respiteIntervalS: 0,
      cubeAggressionRate: 1.0,
    });

    handler.activate(entity, scene);

    // Run several update frames
    for (let i = 0; i < 20; i++) {
      handler.update(0.1);
    }

    expect(scene.metadata.currentTension).toBeGreaterThan(0.1);

    handler.dispose();
  });

  it('tracks survival time', () => {
    const handler = new SurvivalHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      baseTensionRiseRate: 0.01,
      surfaceIntensity: { keycaps: 1.0, lever: 1.0, platter: 1.0, sphere: 1.0, cubes: 1.0 },
      respiteIntervalS: 0,
      cubeAggressionRate: 1.0,
    });

    handler.activate(entity, scene);

    handler.update(1.0);
    handler.update(1.0);
    handler.update(1.0);

    expect(handler.getSurvivalTime()).toBeCloseTo(3.0, 1);

    handler.dispose();
  });

  it('enters respite period when configured', () => {
    const handler = new SurvivalHandler();
    const scene = createMockScene();
    scene.metadata.currentTension = 0.3;
    const entity = createMockEntity({
      baseTensionRiseRate: 0.01,
      surfaceIntensity: { keycaps: 1.0, lever: 1.0, platter: 1.0, sphere: 1.0, cubes: 1.0 },
      respiteIntervalS: 2,
      cubeAggressionRate: 1.0,
    });

    handler.activate(entity, scene);
    expect(handler.isInRespite()).toBe(false);

    // Advance past respite interval
    for (let i = 0; i < 25; i++) {
      handler.update(0.1);
    }

    expect(handler.isInRespite()).toBe(true);

    handler.dispose();
  });

  it('clears state on dispose', () => {
    const handler = new SurvivalHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      baseTensionRiseRate: 0.03,
      surfaceIntensity: { keycaps: 1.0, lever: 1.0, platter: 1.0, sphere: 1.0, cubes: 1.0 },
      respiteIntervalS: 0,
      cubeAggressionRate: 1.0,
    });

    handler.activate(entity, scene);
    handler.update(1.0);
    handler.dispose();

    expect(handler.getSurvivalTime()).toBe(0);
    expect(handler.isInRespite()).toBe(false);
  });
});

// ── RefractionAimHandler ──

describe('RefractionAimHandler', () => {
  it('can be instantiated', () => {
    const handler = new RefractionAimHandler();
    expect(handler).toBeDefined();
  });

  it('is registered in the handler registry', () => {
    expect(hasHandler('RefractionAim')).toBe(true);
    const Factory = getHandlerFactory('RefractionAim');
    expect(Factory).toBe(RefractionAimHandler);
  });

  it('activate/dispose do not throw', () => {
    const handler = new RefractionAimHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      beamWidth: 0.15,
      targetKeycapCount: 2,
      driftSpeed: 0.005,
      refractionAngle: 30,
    });

    expect(() => handler.activate(entity, scene)).not.toThrow();
    expect(() => handler.dispose()).not.toThrow();
  });

  it('spawns correct number of target keycaps', () => {
    const handler = new RefractionAimHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      beamWidth: 0.15,
      targetKeycapCount: 3,
      driftSpeed: 0.005,
      refractionAngle: 30,
    });

    handler.activate(entity, scene);
    expect(handler.getActiveTargetCount()).toBe(3);
    expect(handler.getCompletedCount()).toBe(0);

    handler.dispose();
  });

  it('drifts beam origin during update', () => {
    const handler = new RefractionAimHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      beamWidth: 0.15,
      targetKeycapCount: 1,
      driftSpeed: 0.01,
      refractionAngle: 30,
    });

    handler.activate(entity, scene);
    const initialOrigin = handler.getBeamOriginAngleDeg();

    // Run update
    handler.update(1.0);

    const updatedOrigin = handler.getBeamOriginAngleDeg();
    expect(updatedOrigin).not.toBe(initialOrigin);

    handler.dispose();
  });

  it('clears state on dispose', () => {
    const handler = new RefractionAimHandler();
    const scene = createMockScene();
    const entity = createMockEntity({
      beamWidth: 0.15,
      targetKeycapCount: 2,
      driftSpeed: 0.005,
      refractionAngle: 30,
    });

    handler.activate(entity, scene);
    handler.dispose();
    expect(handler.getTargets().length).toBe(0);
    expect(handler.getCompletedCount()).toBe(0);
    expect(handler.getBeamDirectionDeg()).toBe(0);
  });
});
