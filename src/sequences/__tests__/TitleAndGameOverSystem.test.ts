/**
 * Tests for TitleAndGameOverSystem
 *
 * Covers: showTitle(), hideTitle(), showGameOver(), hideGameOver(),
 *         reset(), dispose(), GSAP timeline creation, mesh creation/disposal
 */

// ── Mock GSAP ──
const mockTimelineKill = jest.fn();
const mockTimelineTo = jest.fn().mockReturnThis();

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    to: jest.fn(),
    timeline: jest.fn(() => ({
      kill: mockTimelineKill,
      to: mockTimelineTo,
    })),
  },
}));

// ── Mock Babylon.js ──
const mockDisposeMesh = jest.fn();
const mockCreatePlane = jest.fn(() => ({
  position: { x: 0, y: 0, z: 0, set: jest.fn() },
  scaling: { x: 1, y: 1, z: 1, setAll: jest.fn() },
  material: null,
  parent: null,
  dispose: mockDisposeMesh,
}));

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreatePlane: mockCreatePlane,
  },
}));

jest.mock('@babylonjs/core/Materials/standardMaterial', () => ({
  StandardMaterial: jest.fn().mockImplementation(() => ({
    diffuseTexture: null,
    emissiveColor: null,
    backFaceCulling: true,
    dispose: jest.fn(),
  })),
}));

jest.mock('@babylonjs/core/Materials/Textures/dynamicTexture', () => ({
  DynamicTexture: jest.fn().mockImplementation(() => ({
    getContext: jest.fn(() => ({
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: jest.fn(),
      fillText: jest.fn(),
    })),
    update: jest.fn(),
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
}));

import gsap from 'gsap';
import { TitleAndGameOverSystem } from '../TitleAndGameOverSystem';

// ── Helpers ──

function createMockScene() {
  return {} as any;
}

function createMockMesh(name = 'mesh') {
  return {
    name,
    position: { x: 0, y: 0, z: 0, set: jest.fn() },
    scaling: { x: 1, y: 1, z: 1, setAll: jest.fn() },
    material: null,
    parent: null,
    dispose: jest.fn(),
  } as any;
}

describe('TitleAndGameOverSystem', () => {
  let system: TitleAndGameOverSystem;
  let mockScene: any;
  let platterMesh: any;
  let sphereMesh: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScene = createMockScene();
    system = new TitleAndGameOverSystem(mockScene);
    platterMesh = createMockMesh('platter');
    sphereMesh = createMockMesh('sphere');
  });

  afterEach(() => {
    system.dispose();
  });

  // ── showTitle ──

  it('creates a title plane mesh on showTitle', () => {
    system.showTitle(platterMesh);
    expect(mockCreatePlane).toHaveBeenCalledWith(
      'titlePlane',
      expect.objectContaining({ width: 1.0, height: 0.15 }),
      mockScene,
    );
  });

  it('parents the title plane to the platter mesh', () => {
    system.showTitle(platterMesh);
    const plane = (system as any).titlePlane;
    expect(plane.parent).toBe(platterMesh);
  });

  it('creates a GSAP timeline with back.out ease for title', () => {
    system.showTitle(platterMesh);
    expect(gsap.timeline).toHaveBeenCalled();
    expect(mockTimelineTo).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        x: 1,
        y: 1,
        z: 1,
        duration: 1.2,
        ease: 'back.out(1.7)',
      }),
    );
  });

  it('sets title plane scaling to 0 before animation', () => {
    system.showTitle(platterMesh);
    const plane = (system as any).titlePlane;
    expect(plane.scaling.setAll).toHaveBeenCalledWith(0);
  });

  it('disposes previous title plane when calling showTitle twice', () => {
    system.showTitle(platterMesh);
    const firstPlane = (system as any).titlePlane;
    const firstDispose = firstPlane.dispose;

    system.showTitle(platterMesh);
    expect(firstDispose).toHaveBeenCalled();
  });

  // ── hideTitle ──

  it('disposes title plane on hideTitle', () => {
    system.showTitle(platterMesh);
    const plane = (system as any).titlePlane;
    system.hideTitle();
    expect(plane.dispose).toHaveBeenCalled();
    expect((system as any).titlePlane).toBeNull();
  });

  it('kills title timeline on hideTitle', () => {
    system.showTitle(platterMesh);
    system.hideTitle();
    expect(mockTimelineKill).toHaveBeenCalled();
    expect((system as any).titleTimeline).toBeNull();
  });

  it('hideTitle is safe to call when no title is shown', () => {
    expect(() => system.hideTitle()).not.toThrow();
  });

  // ── showGameOver ──

  it('creates a game-over plane mesh on showGameOver', () => {
    system.showGameOver(sphereMesh);
    expect(mockCreatePlane).toHaveBeenCalledWith(
      'gameOverPlane',
      expect.objectContaining({ width: 1.2, height: 0.2 }),
      mockScene,
    );
  });

  it('parents the game-over plane to the sphere mesh', () => {
    system.showGameOver(sphereMesh);
    const plane = (system as any).gameOverPlane;
    expect(plane.parent).toBe(sphereMesh);
  });

  it('creates a GSAP yoyo timeline with 3 repeats for game over', () => {
    system.showGameOver(sphereMesh);
    expect(gsap.timeline).toHaveBeenCalledWith(
      expect.objectContaining({ repeat: 3, yoyo: true }),
    );
  });

  it('sets game-over plane scaling to 1.0 before yoyo animation', () => {
    system.showGameOver(sphereMesh);
    const plane = (system as any).gameOverPlane;
    expect(plane.scaling.setAll).toHaveBeenCalledWith(1.0);
  });

  it('disposes previous game-over plane when calling showGameOver twice', () => {
    system.showGameOver(sphereMesh);
    const firstPlane = (system as any).gameOverPlane;
    const firstDispose = firstPlane.dispose;

    system.showGameOver(sphereMesh);
    expect(firstDispose).toHaveBeenCalled();
  });

  // ── hideGameOver ──

  it('disposes game-over plane on hideGameOver', () => {
    system.showGameOver(sphereMesh);
    const plane = (system as any).gameOverPlane;
    system.hideGameOver();
    expect(plane.dispose).toHaveBeenCalled();
    expect((system as any).gameOverPlane).toBeNull();
  });

  it('kills game-over timeline on hideGameOver', () => {
    system.showGameOver(sphereMesh);
    system.hideGameOver();
    expect(mockTimelineKill).toHaveBeenCalled();
    expect((system as any).gameOverTimeline).toBeNull();
  });

  it('hideGameOver is safe to call when no game over is shown', () => {
    expect(() => system.hideGameOver()).not.toThrow();
  });

  // ── reset ──

  it('reset hides both title and game over', () => {
    system.showTitle(platterMesh);
    system.showGameOver(sphereMesh);

    system.reset();

    expect((system as any).titlePlane).toBeNull();
    expect((system as any).gameOverPlane).toBeNull();
  });

  // ── dispose ──

  it('dispose hides both title and game over', () => {
    system.showTitle(platterMesh);
    system.showGameOver(sphereMesh);

    system.dispose();

    expect((system as any).titlePlane).toBeNull();
    expect((system as any).gameOverPlane).toBeNull();
    expect((system as any).titleTimeline).toBeNull();
    expect((system as any).gameOverTimeline).toBeNull();
  });

  it('dispose is safe to call multiple times', () => {
    system.dispose();
    expect(() => system.dispose()).not.toThrow();
  });
});
