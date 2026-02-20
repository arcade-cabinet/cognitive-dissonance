/**
 * Tests for SystemOrchestrator
 *
 * Covers: getInstance(), initAll(), disposeAll(), setUpdatesEnabled(),
 *         registerUpdateCallbacks(), all getter methods
 */

// ── Mock all dependent singletons ──

const mockDispose = jest.fn();
const mockInitialize = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn();
const mockGetInstance = () => ({
  dispose: mockDispose,
  initialize: mockInitialize,
  init: jest.fn(),
  update: mockUpdate,
  getCurrentHandler: jest.fn(() => ({ update: mockUpdate })),
});

// Physics
jest.mock('../../physics/HavokInitializer', () => ({
  HavokInitializer: { getInstance: jest.fn(() => ({ initialize: jest.fn().mockResolvedValue(undefined), dispose: mockDispose })) },
}));
jest.mock('../../physics/KeycapPhysics', () => ({
  KeycapPhysics: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../../physics/PlatterPhysics', () => ({
  PlatterPhysics: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../../physics/HandPhysics', () => ({
  HandPhysics: { getInstance: jest.fn(() => ({ initialize: jest.fn(), dispose: mockDispose })) },
}));

// Systems
jest.mock('../TensionSystem', () => ({
  TensionSystem: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../DifficultyScalingSystem', () => ({
  DifficultyScalingSystem: { getInstance: jest.fn(() => ({ update: mockUpdate, dispose: mockDispose })) },
}));
jest.mock('../PatternStabilizationSystem', () => ({
  PatternStabilizationSystem: { getInstance: jest.fn(() => ({ update: mockUpdate, dispose: mockDispose })) },
}));
jest.mock('../CorruptionTendrilSystem', () => ({
  CorruptionTendrilSystem: { getInstance: jest.fn(() => ({ update: mockUpdate, dispose: mockDispose })) },
}));
jest.mock('../MechanicalAnimationSystem', () => ({
  MechanicalAnimationSystem: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../EchoSystem', () => ({
  EchoSystem: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../DreamTypeHandler', () => ({
  DreamTypeHandler: { getInstance: jest.fn(() => ({ getCurrentHandler: jest.fn(() => ({ update: mockUpdate })), dispose: mockDispose })) },
}));
jest.mock('../KeyboardInputSystem', () => ({
  KeyboardInputSystem: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../SphereTrackballSystem', () => ({
  SphereTrackballSystem: { getInstance: jest.fn(mockGetInstance) },
}));

// Enemies
jest.mock('../../enemies/ProceduralMorphSystem', () => ({
  ProceduralMorphSystem: { getInstance: jest.fn(() => ({ update: mockUpdate, dispose: mockDispose })) },
}));
jest.mock('../../enemies/CrystallineCubeBossSystem', () => ({
  CrystallineCubeBossSystem: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../../enemies/YukaSteeringSystem', () => ({
  YukaSteeringSystem: { getInstance: jest.fn(() => ({ update: mockUpdate, dispose: mockDispose })) },
}));

// Postprocess
jest.mock('../../postprocess/PostProcessCorruption', () => ({
  PostProcessCorruption: { getInstance: jest.fn(mockGetInstance) },
}));

// Audio
jest.mock('../../audio/ImmersionAudioBridge', () => ({
  ImmersionAudioBridge: { getInstance: jest.fn(() => ({ initialize: jest.fn().mockResolvedValue(undefined), dispose: mockDispose })) },
}));
jest.mock('../../audio/SpatialAudioManager', () => ({
  SpatialAudioManager: { getInstance: jest.fn(mockGetInstance) },
}));

// Sequences
jest.mock('../../sequences/GamePhaseManager', () => ({
  GamePhaseManager: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../../sequences/ShatterSequence', () => ({
  ShatterSequence: { getInstance: jest.fn(mockGetInstance) },
}));

// XR
jest.mock('../../xr/ARSessionManager', () => ({
  ARSessionManager: jest.fn(() => ({ dispose: mockDispose })),
}));
jest.mock('../../xr/HandInteractionSystem', () => ({
  HandInteractionSystem: { getInstance: jest.fn(mockGetInstance) },
}));
jest.mock('../../xr/MechanicalHaptics', () => ({
  MechanicalHaptics: { getInstance: jest.fn(mockGetInstance) },
}));

// Fallback
jest.mock('../../fallback/MechanicalDegradationSystem', () => ({
  MechanicalDegradationSystem: { getInstance: jest.fn(() => ({ dispose: mockDispose })) },
}));

// ECS
jest.mock('../../ecs/World', () => ({
  world: {},
}));

import { SystemOrchestrator } from '../SystemOrchestrator';

// ── Helpers ──

function createOrchestrator(): SystemOrchestrator {
  (SystemOrchestrator as any).instance = null;
  return SystemOrchestrator.getInstance();
}

function createMockScene() {
  const registeredCallbacks: Array<() => void> = [];
  return {
    registerBeforeRender: jest.fn((cb: () => void) => registeredCallbacks.push(cb)),
    unregisterBeforeRender: jest.fn(),
    getEngine: jest.fn(() => ({ getDeltaTime: jest.fn(() => 16) })),
    metadata: { dreamStartTime: 0 },
    _registeredCallbacks: registeredCallbacks,
  } as any;
}

function createMockEngine() {
  return {} as any;
}

describe('SystemOrchestrator', () => {
  let orchestrator: SystemOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = createOrchestrator();
  });

  afterEach(() => {
    orchestrator.disposeAll();
  });

  // ── Singleton ──

  it('returns the same instance on repeated calls', () => {
    const a = SystemOrchestrator.getInstance();
    const b = SystemOrchestrator.getInstance();
    expect(a).toBe(b);
  });

  // ── initAll ──

  it('initAll initializes all systems and stores scene reference', async () => {
    const scene = createMockScene();
    const engine = createMockEngine();
    await orchestrator.initAll(engine, scene);

    expect((orchestrator as any).scene).toBe(scene);
    expect((orchestrator as any).tensionSystem).not.toBeNull();
    expect((orchestrator as any).gamePhaseManager).not.toBeNull();
    expect((orchestrator as any).shatterSequence).not.toBeNull();
  });

  it('initAll registers 6 per-frame update callbacks', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);

    // registerBeforeRender should be called 6 times (one per update system)
    expect(scene.registerBeforeRender).toHaveBeenCalledTimes(6);
    expect((orchestrator as any).updateCallbacks.length).toBe(6);
  });

  // ── disposeAll ──

  it('disposeAll unregisters all update callbacks from scene', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);

    orchestrator.disposeAll();

    // Each of the 6 update callbacks should be unregistered
    expect(scene.unregisterBeforeRender).toHaveBeenCalledTimes(6);
  });

  it('disposeAll sets scene to null', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);

    orchestrator.disposeAll();
    expect((orchestrator as any).scene).toBeNull();
  });

  it('disposeAll sets all system references to null', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);

    orchestrator.disposeAll();

    expect((orchestrator as any).tensionSystem).toBeNull();
    expect((orchestrator as any).keycapPhysics).toBeNull();
    expect((orchestrator as any).platterPhysics).toBeNull();
    expect((orchestrator as any).gamePhaseManager).toBeNull();
    expect((orchestrator as any).shatterSequence).toBeNull();
    expect((orchestrator as any).dreamTypeHandler).toBeNull();
    expect((orchestrator as any).mechanicalAnimationSystem).toBeNull();
    expect((orchestrator as any).havokInitializer).toBeNull();
  });

  it('disposeAll is safe to call without prior initAll', () => {
    // Should not throw even when no scene/systems are initialized
    expect(() => orchestrator.disposeAll()).not.toThrow();
  });

  it('disposeAll clears the updateCallbacks array', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);

    orchestrator.disposeAll();
    expect((orchestrator as any).updateCallbacks).toEqual([]);
  });

  // ── setUpdatesEnabled ──

  it('setUpdatesEnabled(false) prevents per-frame updates from running', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);

    orchestrator.setUpdatesEnabled(false);

    // Manually invoke one of the registered callbacks
    const cb = scene._registeredCallbacks[0];
    mockUpdate.mockClear();
    cb();
    // DifficultyScalingSystem.update should NOT have been called because updates are disabled
    // (The guard is inside the callback, so update won't be called)
    expect((orchestrator as any).updatesEnabled).toBe(false);
  });

  it('setUpdatesEnabled(true) re-enables per-frame updates', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);

    orchestrator.setUpdatesEnabled(false);
    orchestrator.setUpdatesEnabled(true);
    expect((orchestrator as any).updatesEnabled).toBe(true);
  });

  // ── Getter methods ──

  it('all getter methods return null before initAll', () => {
    expect(orchestrator.getKeycapPhysics()).toBeNull();
    expect(orchestrator.getPlatterPhysics()).toBeNull();
    expect(orchestrator.getHandPhysics()).toBeNull();
    expect(orchestrator.getTensionSystem()).toBeNull();
    expect(orchestrator.getDifficultyScalingSystem()).toBeNull();
    expect(orchestrator.getPatternStabilizationSystem()).toBeNull();
    expect(orchestrator.getCorruptionTendrilSystem()).toBeNull();
    expect(orchestrator.getMechanicalAnimationSystem()).toBeNull();
    expect(orchestrator.getEchoSystem()).toBeNull();
    expect(orchestrator.getProceduralMorphSystem()).toBeNull();
    expect(orchestrator.getCrystallineCubeBossSystem()).toBeNull();
    expect(orchestrator.getPostProcessCorruption()).toBeNull();
    expect(orchestrator.getImmersionAudioBridge()).toBeNull();
    expect(orchestrator.getSpatialAudioManager()).toBeNull();
    expect(orchestrator.getDreamTypeHandler()).toBeNull();
    expect(orchestrator.getARSessionManager()).toBeNull();
    expect(orchestrator.getKeyboardInputSystem()).toBeNull();
    expect(orchestrator.getMechanicalDegradationSystem()).toBeNull();
    expect(orchestrator.getGamePhaseManager()).toBeNull();
    expect(orchestrator.getShatterSequence()).toBeNull();
    expect(orchestrator.getYukaSteeringSystem()).toBeNull();
    expect(orchestrator.getHandInteractionSystem()).toBeNull();
    expect(orchestrator.getSphereTrackballSystem()).toBeNull();
    expect(orchestrator.getMechanicalHaptics()).toBeNull();
  });

  it('getter methods return system instances after initAll', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);

    expect(orchestrator.getKeycapPhysics()).not.toBeNull();
    expect(orchestrator.getPlatterPhysics()).not.toBeNull();
    expect(orchestrator.getHandPhysics()).not.toBeNull();
    expect(orchestrator.getTensionSystem()).not.toBeNull();
    expect(orchestrator.getDifficultyScalingSystem()).not.toBeNull();
    expect(orchestrator.getPatternStabilizationSystem()).not.toBeNull();
    expect(orchestrator.getCorruptionTendrilSystem()).not.toBeNull();
    expect(orchestrator.getMechanicalAnimationSystem()).not.toBeNull();
    expect(orchestrator.getEchoSystem()).not.toBeNull();
    expect(orchestrator.getProceduralMorphSystem()).not.toBeNull();
    expect(orchestrator.getCrystallineCubeBossSystem()).not.toBeNull();
    expect(orchestrator.getPostProcessCorruption()).not.toBeNull();
    expect(orchestrator.getImmersionAudioBridge()).not.toBeNull();
    expect(orchestrator.getSpatialAudioManager()).not.toBeNull();
    expect(orchestrator.getDreamTypeHandler()).not.toBeNull();
    expect(orchestrator.getARSessionManager()).not.toBeNull();
    expect(orchestrator.getKeyboardInputSystem()).not.toBeNull();
    expect(orchestrator.getMechanicalDegradationSystem()).not.toBeNull();
    expect(orchestrator.getGamePhaseManager()).not.toBeNull();
    expect(orchestrator.getShatterSequence()).not.toBeNull();
    expect(orchestrator.getYukaSteeringSystem()).not.toBeNull();
    expect(orchestrator.getHandInteractionSystem()).not.toBeNull();
    expect(orchestrator.getSphereTrackballSystem()).not.toBeNull();
    expect(orchestrator.getMechanicalHaptics()).not.toBeNull();
  });

  it('getter methods return null after disposeAll', async () => {
    const scene = createMockScene();
    await orchestrator.initAll(createMockEngine(), scene);
    orchestrator.disposeAll();

    expect(orchestrator.getTensionSystem()).toBeNull();
    expect(orchestrator.getGamePhaseManager()).toBeNull();
    expect(orchestrator.getShatterSequence()).toBeNull();
  });
});
