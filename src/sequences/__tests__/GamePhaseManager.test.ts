/**
 * Tests for GamePhaseManager
 *
 * Covers: initialize(), phase transitions (loading, title, playing, shattered, error),
 *         callbacks, restart(), isRestartEnabled(), dispose()
 */

// Provide window.setTimeout/clearTimeout in Node.js test environment
// Use getters so jest.useFakeTimers() overrides are picked up dynamically
if (typeof window === 'undefined') {
  (global as any).window = {};
  Object.defineProperty((global as any).window, 'setTimeout', {
    get: () => global.setTimeout,
  });
  Object.defineProperty((global as any).window, 'clearTimeout', {
    get: () => global.clearTimeout,
  });
}

// ── Mock GSAP ──
jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    to: jest.fn(),
    timeline: jest.fn(() => ({
      kill: jest.fn(),
      to: jest.fn().mockReturnThis(),
    })),
  },
}));

// ── Mock Babylon.js ──
jest.mock('@babylonjs/core/Materials/standardMaterial', () => ({
  StandardMaterial: jest.fn().mockImplementation(() => ({
    emissiveColor: { r: 0, g: 0, b: 0 },
    disableLighting: false,
    dispose: jest.fn(),
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
}));

import { useGameStore } from '../../store/game-store';
import { useSeedStore } from '../../store/seed-store';
import { GamePhaseManager } from '../GamePhaseManager';

// ── Helpers ──

function createManager(): GamePhaseManager {
  (GamePhaseManager as any).instance = null;
  return GamePhaseManager.getInstance();
}

function createMockMesh(name = 'mesh') {
  return {
    name,
    position: { x: 0, y: 0, z: 0, set: jest.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    scaling: { x: 1, y: 1, z: 1, setAll: jest.fn() },
    material: { type: 'original' },
    setEnabled: jest.fn(),
    dispose: jest.fn(),
    isVisible: true,
  } as any;
}

function createMockScene() {
  return {
    metadata: {},
  } as any;
}

describe('GamePhaseManager', () => {
  let manager: GamePhaseManager;
  let mockScene: any;
  let platterMesh: any;
  let sphereMesh: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset game store to a known state
    useGameStore.getState().reset();
    manager = createManager();
    mockScene = createMockScene();
    platterMesh = createMockMesh('platter');
    sphereMesh = createMockMesh('sphere');
  });

  afterEach(() => {
    manager.dispose();
    jest.useRealTimers();
  });

  // ── Singleton ──

  it('returns the same instance on repeated calls', () => {
    const a = GamePhaseManager.getInstance();
    const b = GamePhaseManager.getInstance();
    expect(a).toBe(b);
  });

  // ── initialize ──

  it('stores scene, platter, and sphere references', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    expect((manager as any).scene).toBe(mockScene);
    expect((manager as any).platterMesh).toBe(platterMesh);
    expect((manager as any).sphereMesh).toBe(sphereMesh);
  });

  it('caches the original platter material', () => {
    const originalMat = platterMesh.material;
    manager.initialize(mockScene, platterMesh, sphereMesh);
    // The original material is cached before startLoadingPhase swaps it
    expect((manager as any).originalPlatterMaterial).toBe(originalMat);
  });

  it('creates rimGlowMaterial on initialize', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    expect((manager as any).rimGlowMaterial).not.toBeNull();
  });

  // ── Loading phase ──

  it('loading phase applies rim glow material to platter', () => {
    useGameStore.getState().setPhase('loading');
    manager.initialize(mockScene, platterMesh, sphereMesh);
    // After initialize, it syncs to current phase which is 'loading'
    // The startLoadingPhase should swap the platter material
    // (subscribe fires synchronously on init since phase is already 'loading')
    expect(platterMesh.material).not.toEqual({ type: 'original' });
  });

  // ── Title phase ──

  it('title phase restores original platter material', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    const originalMat = (manager as any).originalPlatterMaterial;

    // Transition to title
    useGameStore.getState().setPhase('title');
    expect(platterMesh.material).toBe(originalMat);
  });

  it('title phase invokes onTitlePhaseStartCallback', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    const callback = jest.fn();
    manager.setOnTitlePhaseStart(callback);

    useGameStore.getState().setPhase('title');
    expect(callback).toHaveBeenCalled();
  });

  // ── Playing phase ──

  it('playing phase invokes onPlayingPhaseStartCallback', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    const callback = jest.fn();
    manager.setOnPlayingPhaseStart(callback);

    useGameStore.getState().setPhase('playing');
    expect(callback).toHaveBeenCalled();
  });

  // ── Shattered phase ──

  it('shattered phase invokes onShatteredPhaseStartCallback', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    const callback = jest.fn();
    manager.setOnShatteredPhaseStart(callback);

    useGameStore.getState().setPhase('shattered');
    expect(callback).toHaveBeenCalled();
  });

  it('shattered phase disables restart initially', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    useGameStore.getState().setPhase('shattered');
    expect(manager.isRestartEnabled()).toBe(false);
  });

  it('shattered phase enables restart after 4s', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    useGameStore.getState().setPhase('shattered');

    jest.advanceTimersByTime(4000);
    expect(manager.isRestartEnabled()).toBe(true);
  });

  // ── restart ──

  it('restart generates a new seed and transitions to title', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    useGameStore.getState().setPhase('shattered');
    jest.advanceTimersByTime(4000); // Enable restart

    const seedBefore = useSeedStore.getState().seedString;
    manager.restart();

    // After restart, a new seed should have been generated
    const seedAfter = useSeedStore.getState().seedString;
    expect(seedAfter).not.toBe(seedBefore);
    // Phase should be 'title'
    expect(useGameStore.getState().phase).toBe('title');
  });

  it('restart re-enables the sphere mesh', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    useGameStore.getState().setPhase('shattered');
    jest.advanceTimersByTime(4000);

    manager.restart();
    expect(sphereMesh.setEnabled).toHaveBeenCalledWith(true);
  });

  it('restart is a no-op when not enabled', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    useGameStore.getState().setPhase('shattered');
    // Do NOT advance timers — restart is not yet enabled

    manager.restart();
    // Phase should still be shattered
    expect(useGameStore.getState().phase).toBe('shattered');
  });

  it('restart resets the restartEnabled flag', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    useGameStore.getState().setPhase('shattered');
    jest.advanceTimersByTime(4000);
    manager.restart();

    expect(manager.isRestartEnabled()).toBe(false);
  });

  // ── dispose ──

  it('dispose clears all references and callbacks', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    manager.setOnPlayingPhaseStart(jest.fn());
    manager.setOnShatteredPhaseStart(jest.fn());
    manager.setOnTitlePhaseStart(jest.fn());

    manager.dispose();

    expect((manager as any).scene).toBeNull();
    expect((manager as any).platterMesh).toBeNull();
    expect((manager as any).sphereMesh).toBeNull();
    expect((manager as any).rimGlowMaterial).toBeNull();
    expect((manager as any).onPlayingPhaseStartCallback).toBeNull();
    expect((manager as any).onShatteredPhaseStartCallback).toBeNull();
    expect((manager as any).onTitlePhaseStartCallback).toBeNull();
  });

  it('dispose clears pending restart timeout', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    useGameStore.getState().setPhase('shattered');

    manager.dispose();
    expect((manager as any).restartTimeout).toBeNull();
  });

  // ── Error phase ──

  it('error phase does not throw', () => {
    manager.initialize(mockScene, platterMesh, sphereMesh);
    expect(() => useGameStore.getState().setPhase('error')).not.toThrow();
  });
});
