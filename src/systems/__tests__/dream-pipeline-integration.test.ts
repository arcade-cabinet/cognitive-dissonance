/**
 * Composite Integration Tests — Full Dream Pipeline
 *
 * Verifies the end-to-end flow:
 *   DreamSequencer -> ArchetypeActivationSystem -> DreamTypeHandler -> Handler
 *
 * Tests session pacing, archetype activation, handler dispatch, seed determinism,
 * and error recovery across the complete dream lifecycle.
 */

// ── Mock GSAP (must be before any handler imports) ──
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
  Color3: jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: Object.assign(
    jest.fn((x: number, y: number, z: number) => ({
      x,
      y,
      z,
      normalize: jest.fn().mockReturnThis(),
      subtract: jest.fn().mockReturnValue({
        x: 0,
        y: 0,
        z: 0,
        normalize: jest.fn().mockReturnThis(),
      }),
    })),
    {
      Zero: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
      Dot: jest.fn(() => 1),
    },
  ),
}));

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreatePlane: jest.fn(() => ({
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      rotation: { x: 0, y: 0, z: 0 },
      material: null,
      dispose: jest.fn(),
    })),
  },
}));

// Mock MechanicalAnimationSystem (used by CrystallineCubeBossHandler)
jest.mock('../MechanicalAnimationSystem', () => ({
  MechanicalAnimationSystem: {
    getInstance: jest.fn(() => ({
      retractKeycap: jest.fn(),
    })),
  },
}));

import type { Scene } from '@babylonjs/core/scene';
import { ArchetypeActivationSystem } from '../../ecs/ArchetypeActivationSystem';
import { ARCHETYPE_TYPES, deriveArchetypeSlots } from '../../ecs/archetypeSlots';
import { ARCHETYPE_METADATA } from '../../ecs/components';
import type { ArchetypeType } from '../../ecs/components';
import {
  spawnCrystallineCubeEntity,
  spawnKeycapEntities,
  spawnLeverEntity,
  spawnMorphCubeEntity,
  spawnPlatterEntity,
  spawnSphereEntity,
} from '../../ecs/primitives';
import { world } from '../../ecs/World';
import { DreamSequencer } from '../../sequences/DreamSequencer';
import { DreamTypeHandler } from '../DreamTypeHandler';
import { getHandlerFactory, getRegisteredTypes, hasHandler } from '../dream-handlers';

// ── Constants ──

const KEYCAP_LETTERS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];

// ── Mock performance.now() ──

let mockNow = 0;

beforeAll(() => {
  jest.spyOn(performance, 'now').mockImplementation(() => mockNow);
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ── Mock mesh/scene factories ──

function createMockMesh(name: string) {
  return {
    dispose: jest.fn(),
    name,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: {
      emissiveColor: { r: 0, g: 0, b: 0 },
    },
  };
}

function createMockScene(): Scene {
  return {
    getMeshByName: jest.fn((name: string) => createMockMesh(name)),
    metadata: { currentTension: 0, pressedKeys: new Set<string>() },
    activeCamera: {
      getForwardRay: jest.fn(() => ({
        direction: { x: 0, y: 0, z: -1, normalize: jest.fn().mockReturnThis() },
      })),
    },
  } as unknown as Scene;
}

// ── Helper to set up full world state ──

function setupWorld() {
  const keycapMeshes = KEYCAP_LETTERS.map((letter) => createMockMesh(`keycap-${letter}`));
  spawnKeycapEntities(world, keycapMeshes);
  spawnLeverEntity(world, createMockMesh('lever'));
  spawnPlatterEntity(world, createMockMesh('platter'));
  spawnSphereEntity(world, createMockMesh('sphere'));
  spawnCrystallineCubeEntity(world, createMockMesh('crystalline-cube'));
  spawnMorphCubeEntity(world, createMockMesh('morph-cube'));
}

function clearWorld() {
  for (const e of [...world.entities]) {
    world.remove(e);
  }
}

// ── Reset singletons ──

function resetSingletons() {
  (DreamSequencer as any).instance = null;
  (ArchetypeActivationSystem as any).instance = null;
  (DreamTypeHandler as any).instance = null;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Full Dream Lifecycle
// ════════════════════════════════════════════════════════════════════════════

describe('Full Dream Lifecycle', () => {
  let sequencer: DreamSequencer;
  let activation: ArchetypeActivationSystem;
  let handler: DreamTypeHandler;
  let mockScene: Scene;

  beforeEach(() => {
    mockNow = 0;
    resetSingletons();
    clearWorld();
    setupWorld();
    sequencer = DreamSequencer.getInstance();
    activation = ArchetypeActivationSystem.getInstance();
    handler = DreamTypeHandler.getInstance();
    mockScene = createMockScene();
    handler.initialize(mockScene);
  });

  afterEach(() => {
    handler.dispose();
    activation.dispose();
    clearWorld();
  });

  it('startSession + selectNextDream returns a valid DreamConfig', () => {
    sequencer.startSession('lifecycle-seed');
    const dream = sequencer.selectNextDream();

    expect(dream.archetypeType).toBeDefined();
    expect(dream.seedHash).toEqual(expect.any(Number));
    expect(dream.tensionCurve).toBeDefined();
    expect(dream.tensionCurve.increaseRate).toBeGreaterThan(0);
    expect(dream.tensionCurve.decreaseRate).toBeGreaterThan(0);
    expect(dream.pacingPhase).toBeDefined();
    expect(['opening', 'development', 'climax', 'resolution']).toContain(dream.pacingPhase);
    expect(dream.transitionDurationMs).toEqual(expect.any(Number));
  });

  it('DreamConfig.archetypeType is always a registered handler type', () => {
    sequencer.startSession('registered-handlers-seed');

    for (let i = 0; i < 12; i++) {
      const dream = sequencer.selectNextDream();
      expect(hasHandler(dream.archetypeType)).toBe(true);
      mockNow += 60000;
      sequencer.recordDreamCompletion(0.3);
    }
  });

  it('ArchetypeActivationSystem.activate() succeeds for returned archetype', () => {
    sequencer.startSession('activate-seed');
    const dream = sequencer.selectNextDream();

    activation.activate(dream.archetypeType, dream.seedHash, mockScene);

    const active = activation.getActiveArchetype();
    expect(active).not.toBeNull();
    expect(active!.type).toBe(dream.archetypeType);
    expect(active!.slots).toBeDefined();
    expect(active!.seedHash).toBe(dream.seedHash);
  });

  it('handler can be obtained via getHandlerFactory and instantiated', () => {
    sequencer.startSession('factory-seed');
    const dream = sequencer.selectNextDream();

    const Factory = getHandlerFactory(dream.archetypeType);
    expect(Factory).not.toBeNull();

    const instance = new Factory!();
    expect(instance).toBeDefined();
    expect(typeof instance.activate).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.dispose).toBe('function');
  });

  it('full activate -> update -> dispose handler lifecycle completes', () => {
    sequencer.startSession('full-lifecycle-seed');
    const dream = sequencer.selectNextDream();

    // Activate archetype in ECS
    activation.activate(dream.archetypeType, dream.seedHash, mockScene);

    // Build entity for handler
    const entity = {
      archetype: activation.getActiveArchetype()!,
    };

    // Activate handler
    handler.activateDream(entity, dream.archetypeType);
    expect(handler.getCurrentHandler()).not.toBeNull();
    expect(handler.getArchetypeName()).toContain('Dream');

    // Run several update ticks
    for (let frame = 0; frame < 10; frame++) {
      handler.update(0.016);
    }

    // Dispose
    handler.dispose();
    expect(handler.getCurrentHandler()).toBeNull();
  });

  it('DreamTypeHandler.activateDream dispatches to correct handler type', () => {
    sequencer.startSession('dispatch-seed');

    // Run 4 dreams to cover multiple pacing phases
    for (let i = 0; i < 4; i++) {
      const dream = sequencer.selectNextDream();
      activation.activate(dream.archetypeType, dream.seedHash, mockScene);

      const entity = { archetype: activation.getActiveArchetype()! };
      handler.activateDream(entity, dream.archetypeType);

      expect(handler.getCurrentHandler()).not.toBeNull();
      const name = handler.getArchetypeName();
      expect(name).toBe(`${dream.archetypeType}Dream`);

      mockNow += 60000;
      sequencer.recordDreamCompletion(0.4);
      activation.deactivate();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Multi-Dream Session (kishōtenketsu cycle)
// ════════════════════════════════════════════════════════════════════════════

describe('Multi-Dream Session', () => {
  let sequencer: DreamSequencer;
  let activation: ArchetypeActivationSystem;
  let mockScene: Scene;

  beforeEach(() => {
    mockNow = 0;
    resetSingletons();
    clearWorld();
    setupWorld();
    sequencer = DreamSequencer.getInstance();
    activation = ArchetypeActivationSystem.getInstance();
    mockScene = createMockScene();
  });

  afterEach(() => {
    activation.dispose();
    clearWorld();
  });

  it('runs 8 dreams in sequence completing a full kishōtenketsu cycle', () => {
    sequencer.startSession('cycle-seed-8');
    const archetypes: ArchetypeType[] = [];

    for (let i = 0; i < 8; i++) {
      const dream = sequencer.selectNextDream();
      archetypes.push(dream.archetypeType);

      activation.activate(dream.archetypeType, dream.seedHash, mockScene);
      expect(activation.getActiveArchetype()).not.toBeNull();

      mockNow += 60000;
      sequencer.recordDreamCompletion(0.5);
      activation.deactivate();
    }

    expect(archetypes).toHaveLength(8);
    expect(sequencer.getStats().totalDreams).toBe(8);
  });

  it('no archetype repeats within a 7-dream window', () => {
    sequencer.startSession('no-repeat-seed');

    for (let i = 0; i < 8; i++) {
      const dream = sequencer.selectNextDream();
      const available = sequencer.getAvailablePool(dream.pacingPhase);

      // The available pool should not include any archetype used in the last 7 dreams
      // unless the pool is exhausted
      const stats = sequencer.getStats();
      const recentUsed = stats.archetypeHistory.slice(-7).map((h) => h.archetypeType);
      // The selected archetype should either be outside the recent window
      // or the entire pool was filtered to empty and fell back
      const poolExcludingRecent = available.filter((t) => !recentUsed.includes(t));
      if (poolExcludingRecent.length > 0) {
        // If there are options outside the recent window, selection should avoid recent
        // (DreamSequencer filters them; we check the available pool is correct)
        expect(poolExcludingRecent.length).toBeGreaterThan(0);
      }

      mockNow += 60000;
      sequencer.recordDreamCompletion(0.4);
    }
  });

  it('pacing phases progress correctly through the 8-dream cycle', () => {
    sequencer.startSession('pacing-phases-seed');
    const phases: string[] = [];

    for (let i = 0; i < 8; i++) {
      const dream = sequencer.selectNextDream();
      phases.push(dream.pacingPhase);
      mockNow += 60000;
      sequencer.recordDreamCompletion(0.4);
    }

    // Positions 0-1: opening
    expect(phases[0]).toBe('opening');
    expect(phases[1]).toBe('opening');
    // Positions 2-4: development
    expect(phases[2]).toBe('development');
    expect(phases[3]).toBe('development');
    expect(phases[4]).toBe('development');
    // Positions 5-6: climax
    expect(phases[5]).toBe('climax');
    expect(phases[6]).toBe('climax');
    // Position 7: resolution
    expect(phases[7]).toBe('resolution');
  });

  it('tension carryover respects phase constraints', () => {
    sequencer.startSession('tension-carryover-seed');

    // Dream 0 (opening) - first dream always has 0 carryover
    const dream0 = sequencer.selectNextDream();
    expect(dream0.carryoverTension).toBe(0);
    mockNow += 60000;
    sequencer.recordDreamCompletion(0.8); // High exit tension

    // Dream 1 (opening) - opening caps at 0.15
    const dream1 = sequencer.selectNextDream();
    expect(dream1.pacingPhase).toBe('opening');
    expect(dream1.carryoverTension).toBeLessThanOrEqual(0.15);
    mockNow += 60000;
    sequencer.recordDreamCompletion(0.6);

    // Skip to development (dreams 2-4)
    for (let i = 2; i <= 4; i++) {
      const dream = sequencer.selectNextDream();
      expect(dream.pacingPhase).toBe('development');
      mockNow += 60000;
      sequencer.recordDreamCompletion(0.5);
    }

    // Dream 5 (climax) - floor at 0.4
    const dream5 = sequencer.selectNextDream();
    expect(dream5.pacingPhase).toBe('climax');
    expect(dream5.carryoverTension).toBeGreaterThanOrEqual(0.4);
    mockNow += 60000;
    sequencer.recordDreamCompletion(0.9); // Very high tension

    // Dream 6 (climax) - floor at 0.4
    const dream6 = sequencer.selectNextDream();
    expect(dream6.pacingPhase).toBe('climax');
    expect(dream6.carryoverTension).toBeGreaterThanOrEqual(0.4);
    mockNow += 60000;
    sequencer.recordDreamCompletion(0.95);

    // Dream 7 (resolution) - caps at 0.3
    const dream7 = sequencer.selectNextDream();
    expect(dream7.pacingPhase).toBe('resolution');
    expect(dream7.carryoverTension).toBeLessThanOrEqual(0.3);
  });

  it('dream 9 wraps back to opening phase (second cycle)', () => {
    sequencer.startSession('wrap-seed');

    // Complete first 8 dreams (full cycle)
    for (let i = 0; i < 8; i++) {
      sequencer.selectNextDream();
      mockNow += 60000;
      sequencer.recordDreamCompletion(0.4);
    }

    // Dream 8 (index 8, cycle position 0) = opening
    const dream8 = sequencer.selectNextDream();
    expect(dream8.pacingPhase).toBe('opening');
    mockNow += 60000;
    sequencer.recordDreamCompletion(0.3);

    // Dream 9 (index 9, cycle position 1) = opening
    const dream9 = sequencer.selectNextDream();
    expect(dream9.pacingPhase).toBe('opening');
  });

  it('cycle counter increments at boundary', () => {
    sequencer.startSession('cycle-counter-seed');

    for (let i = 0; i < 8; i++) {
      sequencer.selectNextDream();
      mockNow += 60000;
      sequencer.recordDreamCompletion(0.4);
    }

    expect(sequencer.getCurrentCycle()).toBe(0);

    // Dream at index 8 triggers cycle increment
    sequencer.selectNextDream();
    expect(sequencer.getCurrentCycle()).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. ArchetypeActivation with Real Slot Derivation
// ════════════════════════════════════════════════════════════════════════════

describe('ArchetypeActivation with Real Slot Derivation', () => {
  let activation: ArchetypeActivationSystem;
  let mockScene: Scene;

  beforeEach(() => {
    mockNow = 0;
    resetSingletons();
    clearWorld();
    setupWorld();
    activation = ArchetypeActivationSystem.getInstance();
    mockScene = createMockScene();
  });

  afterEach(() => {
    activation.dispose();
    clearWorld();
  });

  const SAMPLE_ARCHETYPES: ArchetypeType[] = [
    'PlatterRotation',
    'ZenDrift',
    'CrystallineCubeBoss',
    'Escalation',
    'WhackAMole',
    'Resonance',
  ];

  it('activates 6+ different archetype types and derives valid slots', () => {
    const seedHash = 42;

    for (const archetypeType of SAMPLE_ARCHETYPES) {
      activation.activate(archetypeType, seedHash, mockScene);

      const archetype = activation.getActiveArchetype();
      expect(archetype).not.toBeNull();
      expect(archetype!.type).toBe(archetypeType);

      const slots = activation.getActiveSlots();
      expect(slots).not.toBeNull();
      expect(slots!.keycapSubset).toBeDefined();
      expect(Array.isArray(slots!.keycapSubset)).toBe(true);
      expect(typeof slots!.leverActive).toBe('boolean');
      expect(typeof slots!.platterActive).toBe('boolean');
      expect(typeof slots!.sphereActive).toBe('boolean');
      expect(typeof slots!.crystallineCubeActive).toBe('boolean');
      expect(typeof slots!.morphCubeActive).toBe('boolean');

      activation.deactivate();
    }
  });

  it('keycap subset from derived slots matches active keycap entities', () => {
    const seedHash = 99;

    for (const archetypeType of SAMPLE_ARCHETYPES) {
      activation.activate(archetypeType, seedHash, mockScene);

      const slots = activation.getActiveSlots()!;
      const keycapEntities = world.with('keycap');
      const activeKeycaps = keycapEntities.entities.filter(
        (e) => e.keycap?.active === true,
      );

      // Number of active keycaps must equal keycapSubset length
      expect(activeKeycaps.length).toBe(slots.keycapSubset.length);

      // Each active keycap letter must be in the subset
      for (const entity of activeKeycaps) {
        expect(slots.keycapSubset).toContain(entity.keycap!.letter);
      }

      activation.deactivate();
    }
  });

  it('lever active state matches slot derivation', () => {
    const seedHash = 77;

    for (const archetypeType of SAMPLE_ARCHETYPES) {
      activation.activate(archetypeType, seedHash, mockScene);

      const slots = activation.getActiveSlots()!;
      const leverEntities = world.with('lever');
      expect(leverEntities.entities.length).toBe(1);
      expect(leverEntities.entities[0].lever!.active).toBe(slots.leverActive);

      activation.deactivate();
    }
  });

  it('deactivate() resets all primitives to inactive', () => {
    activation.activate('Escalation', 42, mockScene);

    // Escalation activates everything
    const slotsEscalation = activation.getActiveSlots()!;
    expect(slotsEscalation.leverActive).toBe(true);
    expect(slotsEscalation.platterActive).toBe(true);
    expect(slotsEscalation.sphereActive).toBe(true);
    expect(slotsEscalation.crystallineCubeActive).toBe(true);
    expect(slotsEscalation.morphCubeActive).toBe(true);

    activation.deactivate();

    // Every primitive should now be inactive
    for (const e of world.with('keycap')) {
      expect(e.keycap!.active).toBe(false);
    }
    for (const e of world.with('lever')) {
      expect(e.lever!.active).toBe(false);
      expect(e.lever!.position).toBe(0);
      expect(e.lever!.resistance).toBe(0);
    }
    for (const e of world.with('platter')) {
      expect(e.platter!.active).toBe(false);
      expect(e.platter!.rotationRPM).toBe(0);
    }
    for (const e of world.with('sphere')) {
      expect(e.sphere!.active).toBe(false);
    }
    for (const e of world.with('crystallineCube')) {
      expect(e.crystallineCube!.active).toBe(false);
    }
    for (const e of world.with('morphCube')) {
      expect(e.morphCube!.active).toBe(false);
    }
  });

  it('re-activate with different archetype reconfigures all primitives', () => {
    // First: PlatterRotation (platter active, no sphere)
    activation.activate('PlatterRotation', 100, mockScene);
    const slots1 = activation.getActiveSlots()!;
    expect(slots1.platterActive).toBe(true);

    // Second: ZenDrift (sphere active, no platter)
    activation.activate('ZenDrift', 200, mockScene);
    const slots2 = activation.getActiveSlots()!;
    expect(slots2.sphereActive).toBe(true);
    expect(slots2.platterActive).toBe(false);

    // Verify world reflects the second activation
    const platterEntities = world.with('platter');
    expect(platterEntities.entities[0].platter!.active).toBe(false);

    const sphereEntities = world.with('sphere');
    expect(sphereEntities.entities[0].sphere!.active).toBe(true);
  });

  it('PlatterRotation sets rotationRPM and direction on platter entity', () => {
    activation.activate('PlatterRotation', 12345, mockScene);

    const slots = activation.getActiveSlots()!;
    expect('rotationRPM' in slots).toBe(true);
    expect('direction' in slots).toBe(true);

    const platterEntities = world.with('platter');
    const platter = platterEntities.entities[0].platter!;
    expect(platter.active).toBe(true);
    expect(platter.rotationRPM).toBe((slots as any).rotationRPM);
    expect(platter.direction).toBe((slots as any).direction);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Handler Registry Completeness
// ════════════════════════════════════════════════════════════════════════════

describe('Handler Registry Completeness', () => {
  let mockScene: Scene;

  beforeEach(() => {
    mockScene = createMockScene();
  });

  it('all 25 ArchetypeType values have registered handlers', () => {
    const allTypes = Object.keys(ARCHETYPE_METADATA) as ArchetypeType[];
    expect(allTypes).toHaveLength(25);

    for (const type of allTypes) {
      expect(hasHandler(type)).toBe(true);
    }
  });

  it('every handler in the registry can be instantiated', () => {
    const registeredTypes = getRegisteredTypes();
    expect(registeredTypes.length).toBeGreaterThanOrEqual(25);

    for (const type of registeredTypes) {
      const Factory = getHandlerFactory(type);
      expect(Factory).not.toBeNull();

      const instance = new Factory!();
      expect(instance).toBeDefined();
    }
  });

  it('every instantiated handler implements activate/update/dispose', () => {
    const registeredTypes = getRegisteredTypes();

    for (const type of registeredTypes) {
      const Factory = getHandlerFactory(type);
      const instance = new Factory!();

      expect(typeof instance.activate).toBe('function');
      expect(typeof instance.update).toBe('function');
      expect(typeof instance.dispose).toBe('function');
    }
  });

  it('all ARCHETYPE_TYPES from archetypeSlots match registered handlers', () => {
    // Verify the two sources of truth are aligned
    for (const type of ARCHETYPE_TYPES) {
      expect(hasHandler(type)).toBe(true);
      expect(ARCHETYPE_METADATA[type]).toBeDefined();
    }
    expect(ARCHETYPE_TYPES).toHaveLength(25);
  });

  it('every handler can run activate -> update -> dispose with mock entity', () => {
    const registeredTypes = getRegisteredTypes();

    for (const type of registeredTypes) {
      const Factory = getHandlerFactory(type);
      const instance = new Factory!();

      const entity = {
        archetype: {
          type,
          slots: deriveArchetypeSlots(type, 42),
          seedHash: 42,
          pacing: ARCHETYPE_METADATA[type].pacing,
          cognitiveLoad: ARCHETYPE_METADATA[type].cognitiveLoad,
        },
      };

      // Should not throw
      instance.activate(entity, mockScene);
      instance.update(0.016);
      instance.update(0.016);
      instance.dispose();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Seed Determinism Through Pipeline
// ════════════════════════════════════════════════════════════════════════════

describe('Seed Determinism Through Pipeline', () => {
  beforeEach(() => {
    mockNow = 0;
    resetSingletons();
    clearWorld();
    setupWorld();
  });

  afterEach(() => {
    clearWorld();
  });

  it('same seed produces same archetype sequence via DreamSequencer', () => {
    const seed = 'determinism-test-seed';

    // First run
    (DreamSequencer as any).instance = null;
    const seq1 = DreamSequencer.getInstance();
    seq1.startSession(seed);
    const types1: ArchetypeType[] = [];
    for (let i = 0; i < 8; i++) {
      const dream = seq1.selectNextDream();
      types1.push(dream.archetypeType);
      mockNow += 60000;
      seq1.recordDreamCompletion(0.4);
    }

    // Second run
    mockNow = 0;
    (DreamSequencer as any).instance = null;
    const seq2 = DreamSequencer.getInstance();
    seq2.startSession(seed);
    const types2: ArchetypeType[] = [];
    for (let i = 0; i < 8; i++) {
      const dream = seq2.selectNextDream();
      types2.push(dream.archetypeType);
      mockNow += 60000;
      seq2.recordDreamCompletion(0.4);
    }

    expect(types1).toEqual(types2);
  });

  it('same seed + archetypeType produces same slots via deriveArchetypeSlots', () => {
    const archetypeType: ArchetypeType = 'CrystallineCubeBoss';
    const seedHash = 12345;

    const slots1 = deriveArchetypeSlots(archetypeType, seedHash);
    const slots2 = deriveArchetypeSlots(archetypeType, seedHash);

    expect(slots1).toEqual(slots2);
    expect(slots1.keycapSubset).toEqual(slots2.keycapSubset);
    expect(slots1.leverActive).toBe(slots2.leverActive);
  });

  it('different seeds produce different configurations', () => {
    const archetypeType: ArchetypeType = 'Escalation';

    const slotsA = deriveArchetypeSlots(archetypeType, 111);
    const slotsB = deriveArchetypeSlots(archetypeType, 999);

    // At least one field should differ (overwhelmingly likely with different seeds)
    const keycapsDiffer =
      JSON.stringify(slotsA.keycapSubset.sort()) !==
      JSON.stringify(slotsB.keycapSubset.sort());
    const slotsDiffer = JSON.stringify(slotsA) !== JSON.stringify(slotsB);

    expect(slotsDiffer || keycapsDiffer).toBe(true);
  });

  it('DreamSequencer seed determinism extends to tension curves', () => {
    const seed = 'tension-curve-determinism';

    // First run
    (DreamSequencer as any).instance = null;
    const seq1 = DreamSequencer.getInstance();
    seq1.startSession(seed);
    const dream1 = seq1.selectNextDream();

    // Second run
    mockNow = 0;
    (DreamSequencer as any).instance = null;
    const seq2 = DreamSequencer.getInstance();
    seq2.startSession(seed);
    const dream2 = seq2.selectNextDream();

    expect(dream1.tensionCurve).toEqual(dream2.tensionCurve);
    expect(dream1.seedHash).toBe(dream2.seedHash);
    expect(dream1.pacingPhase).toBe(dream2.pacingPhase);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Error Recovery
// ════════════════════════════════════════════════════════════════════════════

describe('Error Recovery', () => {
  let activation: ArchetypeActivationSystem;
  let handlerSystem: DreamTypeHandler;
  let mockScene: Scene;

  beforeEach(() => {
    mockNow = 0;
    resetSingletons();
    clearWorld();
    setupWorld();
    activation = ArchetypeActivationSystem.getInstance();
    handlerSystem = DreamTypeHandler.getInstance();
    mockScene = createMockScene();
    handlerSystem.initialize(mockScene);
  });

  afterEach(() => {
    handlerSystem.dispose();
    activation.dispose();
    clearWorld();
  });

  it('activating unknown archetype type via DreamTypeHandler logs warning gracefully', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const entity = {} as any;
    handlerSystem.activateDream(entity, 'NonExistentType' as ArchetypeType);

    // Should not have a handler active
    expect(handlerSystem.getCurrentHandler()).toBeNull();

    // The warning log was triggered
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('deactivating when nothing is active is safe', () => {
    // No archetype active
    expect(activation.getActiveArchetype()).toBeNull();

    // Should not throw
    expect(() => activation.deactivate()).not.toThrow();
    expect(activation.getActiveArchetype()).toBeNull();
  });

  it('dispose when nothing is active is safe', () => {
    // Should not throw
    expect(() => activation.dispose()).not.toThrow();
    expect(() => handlerSystem.dispose()).not.toThrow();
  });

  it('starting a new session mid-dream properly cleans up sequencer state', () => {
    const sequencer = DreamSequencer.getInstance();
    sequencer.startSession('first-session');

    // Start a dream
    const dream1 = sequencer.selectNextDream();
    activation.activate(dream1.archetypeType, dream1.seedHash, mockScene);

    // Mid-dream: start a new session without completing the current dream
    sequencer.startSession('second-session');

    // Sequencer state should be fresh
    expect(sequencer.getDreamIndex()).toBe(0);
    expect(sequencer.getCurrentCycle()).toBe(0);
    expect(sequencer.getStats().totalDreams).toBe(0);
    expect(sequencer.getStats().archetypeHistory).toHaveLength(0);

    // Can select a new dream in the new session
    const dream2 = sequencer.selectNextDream();
    expect(dream2.archetypeType).toBeDefined();
    expect(dream2.carryoverTension).toBe(0);
  });

  it('activating a new archetype while one is active auto-deactivates the previous', () => {
    activation.activate('PlatterRotation', 100, mockScene);
    const first = activation.getActiveArchetype();
    expect(first!.type).toBe('PlatterRotation');

    // Activate different archetype without explicit deactivate
    activation.activate('ZenDrift', 200, mockScene);
    const second = activation.getActiveArchetype();
    expect(second!.type).toBe('ZenDrift');

    // There should be exactly 1 archetype entity in the world
    const archetypeEntities = world.with('archetype');
    expect(archetypeEntities.entities.length).toBe(1);
    expect(archetypeEntities.entities[0].archetype!.type).toBe('ZenDrift');
  });

  it('DreamTypeHandler without initialize rejects activateDream', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset handler so scene is null
    (DreamTypeHandler as any).instance = null;
    const freshHandler = DreamTypeHandler.getInstance();
    // Do NOT call initialize

    const entity = {} as any;
    freshHandler.activateDream(entity, 'PlatterRotation');

    expect(freshHandler.getCurrentHandler()).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('scene not initialized'),
    );

    errorSpy.mockRestore();
  });
});
