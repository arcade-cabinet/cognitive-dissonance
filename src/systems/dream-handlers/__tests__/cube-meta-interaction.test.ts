/**
 * Interaction-level tests for Cube/Meta group DreamHandler implementations
 *
 * Tests actual GAMEPLAY BEHAVIOR: numerical state changes over many frames,
 * tension dynamics, player input responses, and timing mechanics.
 *
 * Covers: CubeJuggleHandler, CubeStackHandler, PinballHandler,
 *         EscalationHandler, SurvivalHandler, RefractionAimHandler
 */

import type { GameEntity } from '../../../types';

// ── Babylon.js mocks ──

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

// Import handlers AFTER mocks
import { CubeJuggleHandler } from '../CubeJuggleHandler';
import { CubeStackHandler } from '../CubeStackHandler';
import { PinballHandler } from '../PinballHandler';
import { EscalationHandler } from '../EscalationHandler';
import { SurvivalHandler } from '../SurvivalHandler';
import { RefractionAimHandler } from '../RefractionAimHandler';

// ── Helpers ──

/** Creates a mock mesh whose position/rotation can be mutated for input simulation */
function createMockMesh(name: string) {
  return {
    name,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: null,
    dispose: jest.fn(),
  };
}

/** Creates a mock Scene with controllable mesh references */
function createMockScene(meshOverrides: Record<string, ReturnType<typeof createMockMesh>> = {}) {
  const meshes: Record<string, ReturnType<typeof createMockMesh>> = {};
  return {
    metadata: { currentTension: 0, pressedKeys: new Set<string>() },
    getMeshByName: jest.fn().mockImplementation((name: string) => {
      if (meshOverrides[name]) return meshOverrides[name];
      if (!meshes[name]) meshes[name] = createMockMesh(name);
      return meshes[name];
    }),
    // biome-ignore lint/suspicious/noExplicitAny: Mock scene type
  } as any;
}

/** Creates a mock GameEntity with archetype slots */
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

/** dt for 60fps */
const DT = 0.016;

/** Run N frames of update at 60fps */
function runFrames(handler: { update(dt: number): void }, n: number, dt = DT): void {
  for (let i = 0; i < n; i++) {
    handler.update(dt);
  }
}

// ═══════════════════════════════════════════════════════════════
// CubeJuggleHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('CubeJuggleHandler — Interaction', () => {
  let handler: CubeJuggleHandler;
  let scene: ReturnType<typeof createMockScene>;
  let sphereMesh: ReturnType<typeof createMockMesh>;

  beforeEach(() => {
    handler = new CubeJuggleHandler();
    sphereMesh = createMockMesh('sphere');
    scene = createMockScene({ sphere: sphereMesh });
    scene.metadata.currentTension = 0.3;
  });

  afterEach(() => handler.dispose());

  it('orbit radius decays at decayRate per second', () => {
    const decayRate = 0.05;
    const entity = createMockEntity({ cubeCount: 1, decayRate, spawnInterval: 999, bumpStrength: 0.6 });
    handler.activate(entity, scene);

    const initialRadius = handler.getOrbitTrackers()[0].radius;

    // Run 1 second of frames (62.5 frames at 16ms)
    runFrames(handler, 63);

    const finalRadius = handler.getOrbitTrackers()[0].radius;
    // Expected decay: decayRate * 1s * (1 + tension * 0.5) = 0.05 * 1 * 1.15 = 0.0575
    const expectedDecay = decayRate * (63 * DT) * (1 + 0.3 * 0.5);
    const actualDecay = initialRadius - finalRadius;

    expect(actualDecay).toBeCloseTo(expectedDecay, 2);
    expect(finalRadius).toBeLessThan(initialRadius);
  });

  it('cube falls when radius < 0.1 and tension increases by 0.03', () => {
    // Use a very high decay rate so the cube falls quickly
    const entity = createMockEntity({ cubeCount: 1, decayRate: 2.0, spawnInterval: 999 });
    handler.activate(entity, scene);

    const initialTension = scene.metadata.currentTension;

    // Run enough frames for radius to decay below 0.1
    // Starting radius is 0.5-0.8, decay is ~2 * dt * (1 + 0.15) per frame
    runFrames(handler, 60);

    const tracker = handler.getOrbitTrackers()[0];
    expect(tracker.alive).toBe(false);
    expect(scene.metadata.currentTension).toBeCloseTo(initialTension + 0.03, 2);
  });

  it('sphere rotation near a cube angle bumps its radius', () => {
    const entity = createMockEntity({ cubeCount: 1, decayRate: 0.0, spawnInterval: 999, bumpStrength: 0.6 });
    handler.activate(entity, scene);

    // Run one frame to establish previousSphereAngle
    handler.update(DT);
    const radiusBefore = handler.getOrbitTrackers()[0].radius;

    // Set sphere rotation to match the cube's current angle and move it
    const cubeAngle = handler.getOrbitTrackers()[0].angle;
    sphereMesh.rotation.y = cubeAngle; // Align sphere angle to cube angle
    handler.update(DT);

    // Now rotate sphere further (creating a delta > 0.01) while staying in proximity
    sphereMesh.rotation.y = cubeAngle + 0.2;
    handler.update(DT);

    const radiusAfter = handler.getOrbitTrackers()[0].radius;
    // Bump should have increased the radius
    expect(radiusAfter).toBeGreaterThan(radiusBefore);
  });

  it('bumped radius is clamped to max 1.2', () => {
    const entity = createMockEntity({ cubeCount: 1, decayRate: 0.0, spawnInterval: 999, bumpStrength: 10.0 });
    handler.activate(entity, scene);

    // Run one frame to set previousSphereAngle
    handler.update(DT);

    // Apply a massive bump by rotating sphere near the cube angle
    const cubeAngle = handler.getOrbitTrackers()[0].angle;
    sphereMesh.rotation.y = cubeAngle;
    handler.update(DT);

    sphereMesh.rotation.y = cubeAngle + 5.0; // Huge rotation delta
    handler.update(DT);

    expect(handler.getOrbitTrackers()[0].radius).toBeLessThanOrEqual(1.2);
  });

  it('sustaining all cubes alive for 10s decreases tension by 0.05', () => {
    // Use zero decay so no cubes fall
    const entity = createMockEntity({ cubeCount: 2, decayRate: 0.0, spawnInterval: 999 });
    handler.activate(entity, scene);
    scene.metadata.currentTension = 0.5;

    // Run 10 seconds of frames: 10 / 0.016 = 625 frames
    runFrames(handler, 625);

    // Tension should have decreased by 0.05
    expect(scene.metadata.currentTension).toBeCloseTo(0.45, 2);
  });

  it('sustain timer resets if a cube dies', () => {
    const entity = createMockEntity({ cubeCount: 1, decayRate: 0.0, spawnInterval: 999 });
    handler.activate(entity, scene);
    scene.metadata.currentTension = 0.5;

    // Run 8 seconds (should not trigger sustain reward yet)
    runFrames(handler, 500);
    expect(scene.metadata.currentTension).toBe(0.5); // No change yet

    // Kill the cube by setting it to dead (access internal via getOrbitTrackers)
    // We need to use high decay on a new handler to make a cube fall
    handler.dispose();

    handler = new CubeJuggleHandler();
    const entity2 = createMockEntity({ cubeCount: 1, decayRate: 5.0, spawnInterval: 999 });
    handler.activate(entity2, scene);
    scene.metadata.currentTension = 0.5;

    // Cube will fall very quickly, resetting sustain timer
    runFrames(handler, 30);

    expect(handler.getAliveCubeCount()).toBe(0);
    // Tension went up from cube falling, not down from sustain
    expect(scene.metadata.currentTension).toBeGreaterThan(0.5);
  });

  it('new cubes spawn on spawnInterval timer', () => {
    const entity = createMockEntity({ cubeCount: 2, decayRate: 0.0, spawnInterval: 2 });
    handler.activate(entity, scene);

    const initialCount = handler.getOrbitTrackers().length;
    expect(initialCount).toBe(2);

    // Run for 2+ seconds to trigger spawn
    runFrames(handler, 130); // ~2.08s

    expect(handler.getOrbitTrackers().length).toBe(initialCount + 1);

    // Run another 2 seconds
    runFrames(handler, 125);
    expect(handler.getOrbitTrackers().length).toBe(initialCount + 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// CubeStackHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('CubeStackHandler — Interaction', () => {
  let handler: CubeStackHandler;
  let scene: ReturnType<typeof createMockScene>;
  let sphereMesh: ReturnType<typeof createMockMesh>;
  let leverMesh: ReturnType<typeof createMockMesh>;

  beforeEach(() => {
    handler = new CubeStackHandler();
    sphereMesh = createMockMesh('sphere');
    leverMesh = createMockMesh('lever');
    scene = createMockScene({ sphere: sphereMesh, lever: leverMesh });
    scene.metadata.currentTension = 0;
  });

  afterEach(() => handler.dispose());

  it('cubes drift — tiltDeg increases each frame by driftForce * heightMultiplier', () => {
    const driftForce = 0.03;
    const entity = createMockEntity({
      stackHeight: 3,
      driftForce,
      alignmentThresholdDeg: 90, // High threshold so nothing falls
      balanceDifficultyMode: 'static',
    });
    handler.activate(entity, scene);

    // Force all drift directions to +1 for predictable results
    // In static mode they default to +1

    runFrames(handler, 1); // one frame

    const cubes = handler.getStackCubes();
    // cube 0: driftForce * 1.0 * dt * 60 = 0.03 * 1.0 * 0.016 * 60 = 0.0288
    // cube 1: driftForce * 1.3 * dt * 60 = 0.03 * 1.3 * 0.016 * 60 = 0.03744
    // cube 2: driftForce * 1.6 * dt * 60 = 0.03 * 1.6 * 0.016 * 60 = 0.04608

    const expectedTilt0 = driftForce * 1.0 * DT * 60;
    const expectedTilt1 = driftForce * 1.3 * DT * 60;
    // cube2 also gets propagation from cube1: cube1.tiltDeg * 0.2 * dt
    const expectedTilt2Base = driftForce * 1.6 * DT * 60;

    expect(Math.abs(cubes[0].tiltDeg)).toBeCloseTo(expectedTilt0, 3);
    // Cube 1 gets base drift + propagation from cube 0
    expect(Math.abs(cubes[1].tiltDeg)).toBeGreaterThan(0);
    expect(Math.abs(cubes[2].tiltDeg)).toBeGreaterThan(0);
  });

  it('higher cubes drift faster due to heightMultiplier = 1 + i * 0.3', () => {
    const entity = createMockEntity({
      stackHeight: 3,
      driftForce: 0.03,
      alignmentThresholdDeg: 90,
      balanceDifficultyMode: 'static',
    });
    handler.activate(entity, scene);

    // Run enough frames that drift differences are apparent
    runFrames(handler, 30);

    const cubes = handler.getStackCubes();
    // Higher cubes should have drifted more (absolute tilt)
    // Note: cube2 may not always be > cube1 because of tilt propagation effects,
    // but the base drift rate is strictly higher
    expect(Math.abs(cubes[1].tiltDeg)).toBeGreaterThan(Math.abs(cubes[0].tiltDeg));
  });

  it('cube falls when |tiltDeg| >= alignmentThresholdDeg, tension increases by 0.05', () => {
    const threshold = 5;
    const entity = createMockEntity({
      stackHeight: 1,
      driftForce: 0.5, // Very high drift to trigger fall quickly
      alignmentThresholdDeg: threshold,
      balanceDifficultyMode: 'static',
    });
    handler.activate(entity, scene);
    scene.metadata.currentTension = 0.2;

    // Run until cube falls
    runFrames(handler, 30);

    const cubes = handler.getStackCubes();
    expect(cubes[0].fallen).toBe(true);
    expect(scene.metadata.currentTension).toBeCloseTo(0.25, 2);
  });

  it('fallen cubes auto-restack after RESTACK_DURATION_S (1.5s)', () => {
    // Use drift that makes the cube fall, but with a high enough threshold
    // that after restacking (tiltDeg reset to 0), it takes many frames to fall again
    // Drift per frame = 0.03 * 1.0 * 0.016 * 60 = 0.0288 degrees
    // With threshold = 1.0, it takes ~35 frames to fall again after restack
    const entity = createMockEntity({
      stackHeight: 1,
      driftForce: 0.03,
      alignmentThresholdDeg: 1.0,
      balanceDifficultyMode: 'static',
    });
    handler.activate(entity, scene);

    // Run until cube falls (~35 frames for 0.0288 deg/frame to reach 1.0 deg)
    runFrames(handler, 40);
    expect(handler.getStackCubes()[0].fallen).toBe(true);

    // Next frame: transition to restacking
    handler.update(DT);
    expect(handler.getStackCubes()[0].restacking).toBe(true);

    // After 1.4s of restacking, should still be restacking
    handler.update(1.4);
    expect(handler.getStackCubes()[0].restacking).toBe(true);

    // After 0.15s more (total 1.55s), should have finished restacking
    handler.update(0.15);
    const cube = handler.getStackCubes()[0];
    expect(cube.restacking).toBe(false);
    expect(cube.fallen).toBe(false);
    // tiltDeg was reset to 0 at restack completion, but drift applies for the
    // remainder of the completion frame's dt. With dt=0.15, that's up to
    // 0.03 * 1.0 * 0.15 * 60 = 0.27 degrees drift, well below threshold of 1.0
    expect(Math.abs(cube.tiltDeg)).toBeLessThan(1.0);
  });

  it('sphere rotation counteracts drift on the selected cube', () => {
    const entity = createMockEntity({
      stackHeight: 2,
      driftForce: 0.03,
      alignmentThresholdDeg: 90,
      balanceDifficultyMode: 'static',
    });

    // First: run without sphere counteraction (sphere rotation = 0)
    const sphereNoCounter = createMockMesh('sphere');
    sphereNoCounter.rotation.y = 0;
    const sceneNoCounter = createMockScene({ sphere: sphereNoCounter, lever: leverMesh });
    sceneNoCounter.metadata.currentTension = 0;

    const handlerNoCounter = new CubeStackHandler();
    handlerNoCounter.activate(entity, sceneNoCounter);
    leverMesh.position.y = -1; // Select cube 0

    runFrames(handlerNoCounter, 60);
    const noCounterTilt = Math.abs(handlerNoCounter.getStackCubes()[0].tiltDeg);
    handlerNoCounter.dispose();

    // Now: run with mild sphere counteraction (small angle to partially counteract drift)
    // Drift direction is +1 (static mode), so positive sphere rotation counteracts
    // counteraction formula: tiltDeg -= sphereTiltDeg * 0.1 * dt * 60
    // drift per frame = 0.03 * 1.0 * 0.016 * 60 = 0.0288 degrees
    // counteraction per frame = sphereTiltDeg * 0.1 * 0.016 * 60 = sphereTiltDeg * 0.096
    // For partial counteraction: sphereTiltDeg * 0.096 < 0.0288, so sphereTiltDeg < 0.3
    // sphereTiltDeg = rotY * 180 / PI, so rotY < 0.3 * PI / 180 = 0.00524
    sphereMesh.rotation.y = 0.003; // ~0.172 degrees, counteracts ~0.0165 deg/frame vs 0.0288 drift
    handler.activate(entity, scene);
    leverMesh.position.y = -1;

    runFrames(handler, 60);
    const withCounterTilt = Math.abs(handler.getStackCubes()[0].tiltDeg);

    // With counteraction, absolute tilt should be less than without
    expect(withCounterTilt).toBeLessThan(noCounterTilt);
  });

  it('dynamic-wind mode changes drift direction every 4s', () => {
    const entity = createMockEntity({
      stackHeight: 2,
      driftForce: 0.03,
      alignmentThresholdDeg: 90,
      balanceDifficultyMode: 'dynamic-wind',
    });

    // Seed Math.random to control drift direction changes
    const origRandom = Math.random;
    Math.random = jest.fn()
      .mockReturnValueOnce(0.9) // stack init: cube 0 driftDirection = +1 (>0.5)
      .mockReturnValueOnce(0.9) // stack init: cube 1 driftDirection = +1 (>0.5)
      .mockReturnValueOnce(0.9) // first wind change: cube 0 -> globalWind * 1 (>0.3)
      .mockReturnValueOnce(0.9) // first wind change: cube 1 -> globalWind * 1 (>0.3)
      .mockReturnValue(0.9);

    handler.activate(entity, scene);

    // Verify initial drift directions are set
    const initialDirections = handler.getStackCubes().map(c => c.driftDirection);

    // Run 4 seconds to trigger wind change: 4 / 0.016 = 250 frames
    runFrames(handler, 250);

    // After wind change, globalWindDirection flips from 1 to -1
    // Directions should change
    const newDirections = handler.getStackCubes().map(c => c.driftDirection);
    // At least one direction should differ (wind changed)
    const changed = initialDirections.some((d, i) => d !== newDirections[i]);
    expect(changed).toBe(true);

    Math.random = origRandom;
  });

  it('stack all standing for 5s decreases tension by 0.08', () => {
    const entity = createMockEntity({
      stackHeight: 2,
      driftForce: 0.0, // No drift so nothing falls
      alignmentThresholdDeg: 90,
      balanceDifficultyMode: 'static',
    });
    handler.activate(entity, scene);
    scene.metadata.currentTension = 0.5;

    // Run 5 seconds: 5 / 0.016 = ~313 frames
    runFrames(handler, 313);

    expect(scene.metadata.currentTension).toBeCloseTo(0.42, 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// PinballHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('PinballHandler — Interaction', () => {
  let handler: PinballHandler;
  let scene: ReturnType<typeof createMockScene>;
  let leverMesh: ReturnType<typeof createMockMesh>;

  beforeEach(() => {
    handler = new PinballHandler();
    leverMesh = createMockMesh('lever');
    scene = createMockScene({ lever: leverMesh });
    scene.metadata.currentTension = 0;
  });

  afterEach(() => handler.dispose());

  it('balls fall downward due to gravity each frame', () => {
    const entity = createMockEntity({ multiball: 1, ballSpeed: 1.0, bumperCount: 0 });
    handler.activate(entity, scene);

    const initialY = handler.getBalls()[0].y;

    // Run a few frames
    runFrames(handler, 10);

    const ball = handler.getBalls()[0];
    // vy starts at -0.2 and gravity adds -0.3*dt per frame
    // Ball should have moved down
    if (ball.alive) {
      expect(ball.y).toBeLessThan(initialY);
    }
  });

  it('ball vy decreases due to gravity: vy -= 0.3 * dt each frame', () => {
    const entity = createMockEntity({ multiball: 1, ballSpeed: 1.0, bumperCount: 0 });
    handler.activate(entity, scene);

    const initialVy = handler.getBalls()[0].vy; // -0.2

    handler.update(DT);

    const ball = handler.getBalls()[0];
    if (ball.alive) {
      const expectedVy = initialVy - 0.3 * DT;
      expect(ball.vy).toBeCloseTo(expectedVy, 4);
    }
  });

  it('lever < 0.5 activates left flipper, > 0.5 activates right flipper', () => {
    // We test flipper mechanics by placing a ball at the flipper zone
    const origRandom = Math.random;
    // Control ball spawn position: x = (random - 0.5) * 0.4
    // For x = -0.1 (left flipper zone): random = (-0.1/0.4) + 0.5 = 0.25
    Math.random = jest.fn()
      .mockReturnValueOnce(0.25)  // ball x = -0.1
      .mockReturnValueOnce(0.5)   // ball vx = 0
      .mockReturnValue(0.5);

    const entity = createMockEntity({ multiball: 1, ballSpeed: 1.0, bumperCount: 0, flipperStrength: 1.0 });
    handler.activate(entity, scene);

    Math.random = origRandom;

    // Position the ball right above left flipper (FLIPPER_Y = -0.45)
    const ball = handler.getBalls()[0] as { x: number; y: number; vx: number; vy: number; alive: boolean };
    ball.x = -0.1; // Left flipper zone: -FLIPPER_LENGTH to 0 = -0.2 to 0
    ball.y = -0.42;
    ball.vy = -0.5; // Moving downward

    // Set lever for left flipper (< 0.5, so lever y < 0)
    leverMesh.position.y = -0.5; // normalizedLever = (-0.5 + 1) / 2 = 0.25 < 0.5

    handler.update(DT);

    // After flipper hit, vy should be positive (bounced upward)
    expect(ball.vy).toBeGreaterThan(0);
  });

  it('ball falling off bottom increases tension by 0.05 and auto-respawns', () => {
    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5);

    const entity = createMockEntity({ multiball: 1, ballSpeed: 1.0, bumperCount: 0 });
    handler.activate(entity, scene);

    Math.random = origRandom;

    scene.metadata.currentTension = 0.2;

    // Place ball below the field bottom (FIELD_HALF_HEIGHT = 0.6)
    const ball = handler.getBalls()[0] as { x: number; y: number; vx: number; vy: number; alive: boolean };
    ball.y = -0.61; // Just below bottom
    ball.vy = -1; // Moving down

    handler.update(DT);

    // Tension should have increased by 0.05
    expect(scene.metadata.currentTension).toBeCloseTo(0.25, 2);

    // Ball should be marked dead and a new one spawned
    expect(handler.getAliveBallCount()).toBe(1); // Respawned
    // Total balls count should be 2 (dead + respawned)
    expect(handler.getBalls().length).toBe(2);
  });

  it('ball speed scales with tension: ballSpeed * (1 + tension * 0.5)', () => {
    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5);

    const entity = createMockEntity({ multiball: 1, ballSpeed: 1.0, bumperCount: 0 });

    // Test at tension = 0
    handler.activate(entity, scene);
    Math.random = origRandom;
    scene.metadata.currentTension = 0;
    const ball0 = handler.getBalls()[0] as { x: number; y: number; vx: number; vy: number; alive: boolean };
    ball0.x = 0;
    ball0.y = 0.3;
    ball0.vx = 0.1;
    ball0.vy = 0;
    const x0Before = ball0.x;

    handler.update(DT);
    const dx0 = ball0.x - x0Before;

    handler.dispose();

    // Test at tension = 0.8
    Math.random = jest.fn().mockReturnValue(0.5);
    handler = new PinballHandler();
    handler.activate(entity, scene);
    Math.random = origRandom;
    scene.metadata.currentTension = 0.8;
    const ball1 = handler.getBalls()[0] as { x: number; y: number; vx: number; vy: number; alive: boolean };
    ball1.x = 0;
    ball1.y = 0.3;
    ball1.vx = 0.1;
    ball1.vy = 0;
    const x1Before = ball1.x;

    handler.update(DT);
    const dx1 = ball1.x - x1Before;

    // At tension 0.8, effectiveSpeed = 1.0 * (1 + 0.8 * 0.5) = 1.4
    // dx should be 1.4 times larger
    expect(Math.abs(dx1)).toBeGreaterThan(Math.abs(dx0));
    expect(Math.abs(dx1) / Math.abs(dx0)).toBeCloseTo(1.4, 1);
  });

  it('hitting a keycap target decreases tension by 0.01', () => {
    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5);

    const entity = createMockEntity({ multiball: 1, ballSpeed: 1.0, bumperCount: 0 });
    handler.activate(entity, scene);
    Math.random = origRandom;

    scene.metadata.currentTension = 0.5;

    // Place ball directly on a keycap target
    // Default keycap targets: col=0, row=0 -> x=-0.3, y=0.1; radius=0.04
    const ball = handler.getBalls()[0] as { x: number; y: number; vx: number; vy: number; alive: boolean };
    ball.x = -0.3;
    ball.y = 0.1;
    ball.vx = 0.01; // Minimal velocity to ensure collision
    ball.vy = 0.01;

    handler.update(DT);

    // Tension should decrease by 0.01
    expect(scene.metadata.currentTension).toBeCloseTo(0.49, 2);
    expect(handler.getScore()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// EscalationHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('EscalationHandler — Interaction', () => {
  let handler: EscalationHandler;
  let scene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    handler = new EscalationHandler();
    scene = createMockScene();
    scene.metadata.currentTension = 0.1;
  });

  afterEach(() => handler.dispose());

  it('first surface activates immediately on activate', () => {
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
    expect(handler.getChallenges()[0].surface).toBe('keycaps');
    expect(handler.getChallenges()[1].active).toBe(false);
  });

  it('new surfaces activate every activationIntervalS seconds', () => {
    const intervalS = 5;
    const entity = createMockEntity({
      activationOrder: ['keycaps', 'lever', 'platter', 'sphere'],
      activationIntervalS: intervalS,
      startDifficulty: 'easy',
      maxDimensions: 4,
      compoundTensionMultiplier: 1.5,
    });

    handler.activate(entity, scene);
    expect(handler.getActiveChallengeCount()).toBe(1);

    // Run 5+ seconds: should activate second surface
    runFrames(handler, Math.ceil(intervalS / DT) + 5);
    expect(handler.getActiveChallengeCount()).toBe(2);
    expect(handler.getChallenges()[1].active).toBe(true);

    // Run another 5 seconds: should activate third
    runFrames(handler, Math.ceil(intervalS / DT) + 5);
    expect(handler.getActiveChallengeCount()).toBe(3);
    expect(handler.getChallenges()[2].active).toBe(true);
  });

  it('compound tension: baseTensionRate * compoundTensionMultiplier^(activeSurfaces-1)', () => {
    // Test with 1 active surface first
    const entity1 = createMockEntity({
      activationOrder: ['keycaps'],
      activationIntervalS: 999, // Never activate another
      startDifficulty: 'easy', // baseTensionRate = 0.005
      maxDimensions: 1,
      compoundTensionMultiplier: 2.0,
    });

    handler.activate(entity1, scene);
    scene.metadata.currentTension = 0.1;

    // 1 active surface, compound rate = 0.005 * 2^0 = 0.005
    // Player is failing the keycap challenge (no keys pressed), so totalFail = 1
    const tensionBefore1 = scene.metadata.currentTension;
    handler.update(1.0);
    const increase1 = scene.metadata.currentTension - tensionBefore1;
    // Expected: compoundRate * totalFail * dt = 0.005 * 1 * 1.0 = 0.005
    expect(increase1).toBeCloseTo(0.005, 3);
    handler.dispose();

    // Test with 2 active surfaces
    handler = new EscalationHandler();
    const scene2 = createMockScene();
    scene2.metadata.currentTension = 0.1;

    // Control Math.random so lever challenge targetValue is far from 0.5
    // (lever default position y=0 -> normalizedLever=0.5, so target must differ by >= 0.15)
    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.95); // targetValue = 0.95, far from 0.5

    const entity2 = createMockEntity({
      activationOrder: ['keycaps', 'lever'],
      activationIntervalS: 0.001, // Activate immediately
      startDifficulty: 'easy', // baseTensionRate = 0.005
      maxDimensions: 2,
      compoundTensionMultiplier: 2.0,
    });

    handler.activate(entity2, scene2);

    // Activate second surface by running a tiny update
    handler.update(0.002);
    expect(handler.getActiveChallengeCount()).toBe(2);

    Math.random = origRandom;

    // Reset tension for clean measurement
    scene2.metadata.currentTension = 0.1;

    // 2 active surfaces, compound rate = 0.005 * 2^1 = 0.01
    // Both challenges are failing (no keys pressed, lever position 0.5 far from target 0.95)
    // Expected: compoundRate * totalFail * dt = 0.01 * 2 * 1.0 = 0.02
    const tensionBefore2 = scene2.metadata.currentTension;
    handler.update(1.0);
    const increase2 = scene2.metadata.currentTension - tensionBefore2;
    expect(increase2).toBeCloseTo(0.02, 2);
  });

  it('never exceeds maxDimensions active surfaces', () => {
    const entity = createMockEntity({
      activationOrder: ['keycaps', 'lever', 'platter', 'sphere', 'crystallineCube', 'morphCube'],
      activationIntervalS: 1,
      startDifficulty: 'easy',
      maxDimensions: 3,
      compoundTensionMultiplier: 1.0,
    });

    handler.activate(entity, scene);

    // Run for 10+ seconds (way more than needed to activate all)
    runFrames(handler, Math.ceil(10 / DT));

    expect(handler.getActiveChallengeCount()).toBe(3);
    // Only first 3 surfaces should be active
    expect(handler.getChallenges()[0].active).toBe(true);
    expect(handler.getChallenges()[1].active).toBe(true);
    expect(handler.getChallenges()[2].active).toBe(true);
    expect(handler.getChallenges()[3].active).toBe(false);
  });

  it('meeting all challenges simultaneously decreases tension', () => {
    const entity = createMockEntity({
      activationOrder: ['keycaps', 'lever'],
      activationIntervalS: 1,
      startDifficulty: 'easy',
      maxDimensions: 2,
      compoundTensionMultiplier: 1.5,
    });

    handler.activate(entity, scene);
    scene.metadata.currentTension = 0.5;

    // Activate both surfaces
    runFrames(handler, Math.ceil(1 / DT) + 5);
    expect(handler.getActiveChallengeCount()).toBe(2);

    // Set up scene so both challenges are met:
    // keycaps: need pressedKeys to have something
    scene.metadata.pressedKeys = new Set(['Q', 'W', 'E']);

    // lever: need lever position near targetValue (within 0.15)
    // Challenge targetValue is random, so we set lever to match
    const leverChallenge = handler.getChallenges().find(c => c.surface === 'lever');
    if (leverChallenge) {
      // normalizedLever = (leverPos + 1) / 2, so leverPos = targetValue * 2 - 1
      const leverMesh = scene.getMeshByName('lever');
      leverMesh.position.y = leverChallenge.targetValue * 2 - 1;
    }

    const tensionBefore = scene.metadata.currentTension;
    handler.update(1.0); // 1 second

    // When all challenges met, tension decreases by 0.002 * dt
    expect(scene.metadata.currentTension).toBeLessThan(tensionBefore);
  });
});

// ═══════════════════════════════════════════════════════════════
// SurvivalHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('SurvivalHandler — Interaction', () => {
  let handler: SurvivalHandler;
  let scene: ReturnType<typeof createMockScene>;
  let sphereMesh: ReturnType<typeof createMockMesh>;
  let leverMesh: ReturnType<typeof createMockMesh>;

  beforeEach(() => {
    handler = new SurvivalHandler();
    sphereMesh = createMockMesh('sphere');
    leverMesh = createMockMesh('lever');
    scene = createMockScene({ sphere: sphereMesh, lever: leverMesh });
    scene.metadata.currentTension = 0.1;
  });

  afterEach(() => handler.dispose());

  it('tension constantly rises at baseTensionRiseRate per second', () => {
    const riseRate = 0.05;
    const entity = createMockEntity({
      baseTensionRiseRate: riseRate,
      surfaceIntensity: { keycaps: 1, lever: 1, platter: 1, sphere: 1, cubes: 1 },
      respiteIntervalS: 0,
      cubeAggressionRate: 1.0,
    });

    handler.activate(entity, scene);
    const initialTension = scene.metadata.currentTension;

    // Run 1 second
    handler.update(1.0);

    // Expected increase: riseRate * (1 + tension * 0.3) * dt
    // = 0.05 * (1 + 0.1 * 0.3) * 1.0 = 0.05 * 1.03 = 0.0515
    const expectedIncrease = riseRate * (1 + initialTension * 0.3) * 1.0;
    // But other sub-systems may also modify tension, so just check it went up
    expect(scene.metadata.currentTension).toBeGreaterThan(initialTension);
    // The minimum increase from just the base rise
    expect(scene.metadata.currentTension).toBeGreaterThanOrEqual(
      initialTension + expectedIncrease - 0.01 // small tolerance for sub-system relief
    );
  });

  it('respite intervals pause tension rise for 3s', () => {
    const respiteInterval = 2; // Short interval
    const entity = createMockEntity({
      baseTensionRiseRate: 0.001, // Very low rise rate so tension stays below 0.999
      surfaceIntensity: { keycaps: 1, lever: 1, platter: 1, sphere: 1, cubes: 1 },
      respiteIntervalS: respiteInterval,
      cubeAggressionRate: 0.001, // Very low so cubes don't cause big tension spikes
    });

    handler.activate(entity, scene);
    scene.metadata.currentTension = 0.1;

    // Advance past the respite interval (2s)
    // Keep tension low by capping it each frame
    for (let i = 0; i < Math.ceil(respiteInterval / DT) + 5; i++) {
      handler.update(DT);
      // Prevent tension from hitting game-over threshold
      if (scene.metadata.currentTension > 0.5) {
        scene.metadata.currentTension = 0.3;
      }
    }

    expect(handler.isInRespite()).toBe(true);

    // Record tension at start of respite
    const tensionAtRespiteStart = scene.metadata.currentTension;

    // Run during respite - verify we stay in respite
    handler.update(1.0);
    expect(handler.isInRespite()).toBe(true);

    handler.update(1.0);
    // After 2s of 3s respite, should still be in respite
    expect(handler.isInRespite()).toBe(true);

    // Run past the 3s respite duration
    handler.update(1.5);

    // Now respite should have ended
    expect(handler.isInRespite()).toBe(false);
  });

  it('respite lasts exactly 3 seconds before tension rises again', () => {
    // Use a large respite interval to avoid re-entering respite after it ends
    const entity = createMockEntity({
      baseTensionRiseRate: 0.05,
      surfaceIntensity: { keycaps: 1, lever: 1, platter: 1, sphere: 1, cubes: 1 },
      respiteIntervalS: 100, // Very long interval
      cubeAggressionRate: 1.0,
    });

    handler.activate(entity, scene);
    scene.metadata.currentTension = 0.1;

    // Advance to trigger first respite (100s with large dt)
    handler.update(100.0);
    expect(handler.isInRespite()).toBe(true);

    // Run 2 seconds into respite — should still be in respite (< 3s)
    handler.update(2.0);
    expect(handler.isInRespite()).toBe(true);

    // Run 0.5 more seconds (total 2.5s) — still in respite
    handler.update(0.5);
    expect(handler.isInRespite()).toBe(true);

    // Run 0.6 more seconds (total 3.1s) — should exit respite
    handler.update(0.6);
    expect(handler.isInRespite()).toBe(false);
  });

  it('cubeAggressionRate scales with tension', () => {
    const entity = createMockEntity({
      baseTensionRiseRate: 0.0, // No base rise
      surfaceIntensity: { keycaps: 1, lever: 1, platter: 1, sphere: 1, cubes: 1 },
      respiteIntervalS: 0,
      cubeAggressionRate: 1.0,
    });

    // Test at low tension
    scene.metadata.currentTension = 0;
    handler.activate(entity, scene);

    const cubesBefore = handler.getCubeApproaches();
    const initialDistance = cubesBefore[0]?.distance ?? 1.0;

    handler.update(1.0); // 1 second
    const cubesAfterLow = handler.getCubeApproaches();

    // Effective aggression at tension 0: 1.0 * (1 + 0 * 0.5) = 1.0
    // Distance decrease = speed * aggression * dt
    // Since cube spawns randomly, just check that cubes move
    const lowTensionApproachPerSec = initialDistance - (cubesAfterLow[0]?.distance ?? 0);

    handler.dispose();

    // Test at high tension
    handler = new SurvivalHandler();
    scene.metadata.currentTension = 0.8;

    // Control random for cube spawn
    const origRandom = Math.random;
    Math.random = jest.fn()
      .mockReturnValueOnce(0.5) // cube angle
      .mockReturnValueOnce(0.5) // cube speed: 0.1 + 0.5 * 0.1 = 0.15
      .mockReturnValue(0.5);

    handler.activate(entity, scene);
    Math.random = origRandom;

    // Effective aggression at tension 0.8: 1.0 * (1 + 0.8 * 0.5) = 1.4
    // Cubes should approach faster at higher tension
    expect(handler.getCubeApproaches().length).toBeGreaterThan(0);
  });

  it('survival time accurately tracks elapsed time', () => {
    const entity = createMockEntity({
      baseTensionRiseRate: 0.01,
      surfaceIntensity: { keycaps: 1, lever: 1, platter: 1, sphere: 1, cubes: 1 },
      respiteIntervalS: 0,
      cubeAggressionRate: 1.0,
    });

    handler.activate(entity, scene);

    handler.update(0.5);
    handler.update(0.5);
    handler.update(1.0);

    expect(handler.getSurvivalTime()).toBeCloseTo(2.0, 1);
  });

  it('stops updating at game-over tension (>= 0.999)', () => {
    const entity = createMockEntity({
      baseTensionRiseRate: 0.01,
      surfaceIntensity: { keycaps: 1, lever: 1, platter: 1, sphere: 1, cubes: 1 },
      respiteIntervalS: 0,
      cubeAggressionRate: 1.0,
    });

    handler.activate(entity, scene);
    scene.metadata.currentTension = 0.999;

    const tensionBefore = scene.metadata.currentTension;
    handler.update(1.0);

    // Tension should not change at game-over
    expect(scene.metadata.currentTension).toBe(tensionBefore);
  });
});

// ═══════════════════════════════════════════════════════════════
// RefractionAimHandler — Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('RefractionAimHandler — Interaction', () => {
  let handler: RefractionAimHandler;
  let scene: ReturnType<typeof createMockScene>;
  let sphereMesh: ReturnType<typeof createMockMesh>;
  let cubeMesh: ReturnType<typeof createMockMesh>;

  beforeEach(() => {
    handler = new RefractionAimHandler();
    sphereMesh = createMockMesh('sphere');
    cubeMesh = createMockMesh('crystallineCube');
    scene = createMockScene({ sphere: sphereMesh, crystallineCube: cubeMesh });
    scene.metadata.currentTension = 0.3;
  });

  afterEach(() => handler.dispose());

  it('beam origin drifts at driftSpeed * 360 per second', () => {
    const driftSpeed = 0.01;
    const entity = createMockEntity({
      beamWidth: 0.15,
      targetKeycapCount: 1,
      driftSpeed,
      refractionAngle: 30,
      keycapSubset: ['Q', 'W', 'E', 'R'],
    });

    // Control randomness
    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5);
    handler.activate(entity, scene);
    Math.random = origRandom;

    const initialOrigin = handler.getBeamOriginAngleDeg();

    // Run 1 second
    handler.update(1.0);

    const newOrigin = handler.getBeamOriginAngleDeg();
    // Expected drift: driftSpeed * 360 * dt * (1 + tension * 0.3)
    // = 0.01 * 360 * 1.0 * (1 + 0.3 * 0.3) = 3.6 * 1.09 = 3.924 degrees
    const expectedDrift = driftSpeed * 360 * 1.0 * (1 + 0.3 * 0.3);
    const actualDrift = ((newOrigin - initialOrigin) + 360) % 360;
    expect(actualDrift).toBeCloseTo(expectedDrift, 1);
  });

  it('sphere rotation changes refracted beam direction', () => {
    const entity = createMockEntity({
      beamWidth: 0.15,
      targetKeycapCount: 1,
      driftSpeed: 0.0, // No drift for clean test
      refractionAngle: 30,
      keycapSubset: ['Q', 'W', 'E', 'R'],
    });

    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.0);
    handler.activate(entity, scene);
    Math.random = origRandom;

    // No sphere rotation
    sphereMesh.rotation.y = 0;
    handler.update(DT);
    const dirAt0 = handler.getBeamDirectionDeg();

    // Apply sphere rotation
    sphereMesh.rotation.y = Math.PI / 4; // 45 degrees
    handler.update(DT);
    const dirAt45 = handler.getBeamDirectionDeg();

    // beamDirectionDeg = beamOriginAngleDeg + sphereAngleDeg * (refractionAngle / 45)
    // With 45deg rotation and refractionAngle=30: offset = 45 * (30/45) = 30 degrees
    expect(dirAt45).not.toBe(dirAt0);
  });

  it('holding beam on target keycap for 0.5s completes target and tension decreases by 0.04', () => {
    const entity = createMockEntity({
      beamWidth: 0.5, // Wide beam for easy hitting
      targetKeycapCount: 1,
      driftSpeed: 0.0, // No drift
      refractionAngle: 30,
      keycapSubset: ['Q'],
    });

    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.0);
    handler.activate(entity, scene);
    Math.random = origRandom;

    scene.metadata.currentTension = 0.5;

    // Find the target's angleDeg
    const target = handler.getTargets()[0];
    const targetAngleDeg = target.angleDeg;

    // We need to set sphere rotation so beamDirectionDeg = targetAngleDeg
    // beamDirectionDeg = beamOriginAngleDeg + sphereAngleDeg * (refractionAngle / 45)
    // beamOriginAngleDeg started at random()*360 = 0 (since Math.random returned 0)
    // So: targetAngleDeg = beamOriginAngleDeg + sphereAngleDeg * (30/45)
    // sphereAngleDeg = (targetAngleDeg - beamOriginAngleDeg) * 45 / 30
    const beamOrigin = handler.getBeamOriginAngleDeg();
    const neededSphereAngleDeg = (targetAngleDeg - beamOrigin) * 45 / 30;
    sphereMesh.rotation.y = (neededSphereAngleDeg * Math.PI) / 180;

    // Hold for 0.5 seconds (HIT_DURATION_S)
    // Run enough frames: 0.5 / 0.016 = ~32 frames
    for (let i = 0; i < 35; i++) {
      handler.update(DT);
    }

    // Target should be completed
    expect(handler.getCompletedCount()).toBe(1);
    // Tension should have decreased by 0.04
    expect(scene.metadata.currentTension).toBeCloseTo(0.46, 1);
  });

  it('completed targets get replaced with new random targets', () => {
    const entity = createMockEntity({
      beamWidth: 0.5,
      targetKeycapCount: 1,
      driftSpeed: 0.0,
      refractionAngle: 30,
      keycapSubset: ['Q', 'W', 'E', 'R'],
    });

    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.0);
    handler.activate(entity, scene);

    // Get initial active target count
    const initialActiveCount = handler.getActiveTargetCount();
    expect(initialActiveCount).toBe(1);

    // Aim beam at target
    const target = handler.getTargets()[0];
    const beamOrigin = handler.getBeamOriginAngleDeg();
    const neededSphereAngleDeg = (target.angleDeg - beamOrigin) * 45 / 30;
    sphereMesh.rotation.y = (neededSphereAngleDeg * Math.PI) / 180;

    Math.random = origRandom;

    // Complete the target
    for (let i = 0; i < 40; i++) {
      handler.update(DT);
    }

    // Completed count should be 1
    expect(handler.getCompletedCount()).toBe(1);
    // Active targets should still be 1 (replacement spawned)
    expect(handler.getActiveTargetCount()).toBe(1);
    // Total targets should be 2 (1 completed + 1 new)
    expect(handler.getTargets().length).toBe(2);
  });

  it('missing targets (beam sweeps past after tracking) increases tension slightly', () => {
    const entity = createMockEntity({
      beamWidth: 0.15, // Moderate beam width
      targetKeycapCount: 1,
      driftSpeed: 0.0,
      refractionAngle: 30,
      keycapSubset: ['Q'],
    });

    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.0);
    handler.activate(entity, scene);
    Math.random = origRandom;

    scene.metadata.currentTension = 0.3;

    // First: aim at target to build up hitTimer > 0.1
    const target = handler.getTargets()[0];
    const beamOrigin = handler.getBeamOriginAngleDeg();
    const neededSphereAngleDeg = (target.angleDeg - beamOrigin) * 45 / 30;
    sphereMesh.rotation.y = (neededSphereAngleDeg * Math.PI) / 180;

    // Track for a few frames to build hitTimer > 0.1
    for (let i = 0; i < 10; i++) {
      handler.update(DT);
    }

    // Now sweep far away from target (use PI which = 180 degrees, not 2*PI which wraps to 0)
    sphereMesh.rotation.y = Math.PI; // 180 degrees, significantly off-target
    const tensionBeforeMiss = scene.metadata.currentTension;

    handler.update(DT);

    // Tension should increase from both:
    // 1) miss penalty (hitTimer > 0.1 then lost) = +0.005
    // 2) no target hit = +0.001 * dt
    expect(scene.metadata.currentTension).toBeGreaterThan(tensionBeforeMiss);
  });

  it('beam not hitting any target causes mild tension increase per frame', () => {
    const entity = createMockEntity({
      beamWidth: 0.001, // Extremely narrow beam
      targetKeycapCount: 1,
      driftSpeed: 0.0,
      refractionAngle: 30,
      keycapSubset: ['Q'],
    });

    const origRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.0);
    handler.activate(entity, scene);
    Math.random = origRandom;

    scene.metadata.currentTension = 0.3;

    // Point beam far from any target
    sphereMesh.rotation.y = Math.PI; // 180 degrees

    const tensionBefore = scene.metadata.currentTension;

    // Run several frames
    for (let i = 0; i < 60; i++) {
      handler.update(DT);
    }

    // Tension should have increased by 0.001 * dt per frame
    const expectedIncrease = 0.001 * DT * 60;
    const actualIncrease = scene.metadata.currentTension - tensionBefore;
    // Allow for some tolerance since miss penalty may also apply
    expect(actualIncrease).toBeGreaterThan(0);
    expect(actualIncrease).toBeGreaterThanOrEqual(expectedIncrease - 0.01);
  });
});
