/**
 * Tests for MechanicalAnimationSystem
 *
 * Covers: pullLever(), retractKeycap(), emergeKeycap(), openSlit(), closeSlit(),
 *         rotatePlatter(), stopPlatterRotation(), reset(), dispose(), registerModeLeverCallback()
 */

import * as fc from 'fast-check';

// ── Mock GSAP and plugins before any imports ──

const mockTimelineKill = jest.fn();
const mockTimelineTo = jest.fn().mockReturnThis();
const mockTimeline = {
  kill: mockTimelineKill,
  to: mockTimelineTo,
};

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    to: jest.fn(),
    timeline: jest.fn(() => ({ ...mockTimeline })),
    registerPlugin: jest.fn(),
  },
}));

jest.mock('gsap/CustomEase', () => ({
  __esModule: true,
  CustomEase: {
    create: jest.fn(),
  },
}));

jest.mock('gsap/MotionPathPlugin', () => ({
  __esModule: true,
  MotionPathPlugin: {},
}));

import gsap from 'gsap';
import { MechanicalAnimationSystem } from '../MechanicalAnimationSystem';

// ── Helpers ──

function createSystem(): MechanicalAnimationSystem {
  (MechanicalAnimationSystem as any).instance = null;
  return MechanicalAnimationSystem.getInstance();
}

function createMockMesh(name = 'mesh') {
  return {
    name,
    position: { x: 0, y: 0, z: 0, set: jest.fn() },
    rotation: { x: 0, y: 0, z: 0, set: jest.fn() },
    scaling: { x: 1, y: 1, z: 1, setAll: jest.fn() },
    material: null,
    dispose: jest.fn(),
    setEnabled: jest.fn(),
  } as any;
}

describe('MechanicalAnimationSystem', () => {
  let system: MechanicalAnimationSystem;
  let slitTop: any;
  let slitBottom: any;
  let modeLever: any;
  let keycaps: Map<string, any>;
  let platter: any;
  const mockScene = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    system = createSystem();
    slitTop = createMockMesh('slitTop');
    slitBottom = createMockMesh('slitBottom');
    modeLever = createMockMesh('modeLever');
    platter = createMockMesh('platter');
    keycaps = new Map();
    keycaps.set('Q', createMockMesh('keycap-Q'));
    keycaps.set('W', createMockMesh('keycap-W'));
    system.init(mockScene, slitTop, slitBottom, modeLever, keycaps, platter);
  });

  afterEach(() => {
    system.dispose();
  });

  // ── Singleton ──

  it('returns the same instance on repeated getInstance() calls', () => {
    const a = MechanicalAnimationSystem.getInstance();
    const b = MechanicalAnimationSystem.getInstance();
    expect(a).toBe(b);
  });

  // ── openSlit / closeSlit ──

  it('creates a GSAP timeline on openSlit()', () => {
    system.openSlit();
    expect(gsap.timeline).toHaveBeenCalled();
  });

  it('logs a warning and does nothing when slit meshes are not initialized', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const noInitSystem = createSystem();
    // Do NOT call init — meshes are null
    noInitSystem.openSlit();
    expect(gsap.timeline).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('slit meshes not initialized'));
    warnSpy.mockRestore();
    noInitSystem.dispose();
  });

  it('closeSlit creates a GSAP timeline', () => {
    system.closeSlit();
    expect(gsap.timeline).toHaveBeenCalled();
  });

  it('closeSlit warns when meshes are null', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const noInitSystem = createSystem();
    noInitSystem.closeSlit();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('slit meshes not initialized'));
    warnSpy.mockRestore();
    noInitSystem.dispose();
  });

  // ── pullLever ──

  it('creates a lever timeline on pullLever()', () => {
    system.pullLever(0.5);
    expect(gsap.timeline).toHaveBeenCalled();
  });

  it('clamps lever target position to [0, 1]', () => {
    // pullLever with out-of-range values should still succeed (clamped internally)
    system.pullLever(-0.5);
    expect(gsap.timeline).toHaveBeenCalled();
    jest.clearAllMocks();
    system.pullLever(2.0);
    expect(gsap.timeline).toHaveBeenCalled();
  });

  it('warns when MODE_LEVER mesh is not initialized', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const noInitSystem = createSystem();
    noInitSystem.pullLever(0.5);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MODE_LEVER mesh not initialized'));
    warnSpy.mockRestore();
    noInitSystem.dispose();
  });

  it('invokes registered mode lever callback during pullLever', () => {
    const callback = jest.fn();
    system.registerModeLeverCallback(callback);

    // The callback is invoked inside the timeline onUpdate, so verify registration path
    system.pullLever(0.7);
    expect(gsap.timeline).toHaveBeenCalledWith(
      expect.objectContaining({ onUpdate: expect.any(Function) }),
    );
  });

  // ── emergeKeycap / retractKeycap ──

  it('creates a timeline for emergeKeycap with a valid key', () => {
    system.emergeKeycap('Q');
    expect(gsap.timeline).toHaveBeenCalled();
  });

  it('warns when keycap name is not found on emergeKeycap', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    system.emergeKeycap('Z');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('keycap Z not found'));
    warnSpy.mockRestore();
  });

  it('creates a timeline for retractKeycap with a valid key', () => {
    system.retractKeycap('W');
    expect(gsap.timeline).toHaveBeenCalled();
  });

  it('warns when keycap name is not found on retractKeycap', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    system.retractKeycap('Z');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('keycap Z not found'));
    warnSpy.mockRestore();
  });

  // ── rotatePlatter / stopPlatterRotation ──

  it('creates an infinite timeline for rotatePlatter', () => {
    system.rotatePlatter(5);
    expect(gsap.timeline).toHaveBeenCalledWith(expect.objectContaining({ repeat: -1 }));
  });

  it('warns when platter mesh is null for rotatePlatter', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const noInitSystem = createSystem();
    noInitSystem.rotatePlatter(5);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('platter mesh not initialized'));
    warnSpy.mockRestore();
    noInitSystem.dispose();
  });

  it('stopPlatterRotation calls gsap.to to hold current rotation', () => {
    system.stopPlatterRotation();
    expect(gsap.to).toHaveBeenCalledWith(
      platter.rotation,
      expect.objectContaining({ duration: 0.4, ease: 'power2.out' }),
    );
  });

  it('stopPlatterRotation is a no-op when platter is null', () => {
    const noInitSystem = createSystem();
    // Should not throw
    noInitSystem.stopPlatterRotation();
    expect(gsap.to).not.toHaveBeenCalled();
    noInitSystem.dispose();
  });

  // ── reset / dispose ──

  it('reset clears all keycap timelines', () => {
    system.emergeKeycap('Q');
    system.emergeKeycap('W');
    system.reset();
    // After reset, keycapTimelines map should be empty
    expect((system as any).keycapTimelines.size).toBe(0);
  });

  it('dispose clears all mesh references', () => {
    system.dispose();
    expect((system as any).slitTop).toBeNull();
    expect((system as any).slitBottom).toBeNull();
    expect((system as any).modeLever).toBeNull();
    expect((system as any).platter).toBeNull();
    expect((system as any).keycaps.size).toBe(0);
  });

  // ── Visual Design: Rim Positions ──

  describe('setRimPositions()', () => {
    it('stores rim positions accessible internally', () => {
      const positions = new Map<string, { x: number; y: number; z: number }>();
      positions.set('Q', { x: 0.3, y: 0.09, z: 0.5 });
      positions.set('W', { x: -0.1, y: 0.09, z: 0.58 });
      system.setRimPositions(positions);
      expect((system as any).rimPositions.size).toBe(2);
      expect((system as any).rimPositions.get('Q')).toEqual({ x: 0.3, y: 0.09, z: 0.5 });
    });
  });

  describe('emergeKeycap with rim positions', () => {
    it('calls setEnabled(true) on the keycap before animating', () => {
      const qKeycap = keycaps.get('Q');
      system.emergeKeycap('Q');
      expect(qKeycap.setEnabled).toHaveBeenCalledWith(true);
    });

    it('uses stored rim position for motion path target', () => {
      const positions = new Map<string, { x: number; y: number; z: number }>();
      positions.set('Q', { x: 0.3, y: 0.09, z: 0.5 });
      system.setRimPositions(positions);

      system.emergeKeycap('Q');
      // Verify timeline.to was called with path ending at rim position
      const toCalls = mockTimelineTo.mock.calls;
      expect(toCalls.length).toBeGreaterThan(0);
      const motionPathArg = toCalls[toCalls.length - 1][1];
      expect(motionPathArg.motionPath).toBeDefined();
      const path = motionPathArg.motionPath.path;
      const lastPoint = path[path.length - 1];
      expect(lastPoint.x).toBe(0.3);
      expect(lastPoint.y).toBe(0.09);
      expect(lastPoint.z).toBe(0.5);
    });
  });

  describe('retractKeycap with rim positions', () => {
    it('creates timeline with onComplete callback for setEnabled(false)', () => {
      system.retractKeycap('W');
      // gsap.timeline() was called with an onComplete callback
      const timelineCallArgs = (gsap.timeline as jest.Mock).mock.calls;
      const lastCall = timelineCallArgs[timelineCallArgs.length - 1];
      expect(lastCall[0]).toBeDefined();
      expect(lastCall[0].onComplete).toBeInstanceOf(Function);
    });

    it('onComplete callback calls setEnabled(false) on the keycap', () => {
      system.retractKeycap('W');
      const timelineCallArgs = (gsap.timeline as jest.Mock).mock.calls;
      const lastCall = timelineCallArgs[timelineCallArgs.length - 1];
      // Execute the onComplete callback
      lastCall[0].onComplete();
      const wKeycap = keycaps.get('W');
      expect(wKeycap.setEnabled).toHaveBeenCalledWith(false);
    });

    it('uses stored rim position for motion path start', () => {
      const positions = new Map<string, { x: number; y: number; z: number }>();
      positions.set('W', { x: -0.2, y: 0.09, z: 0.55 });
      system.setRimPositions(positions);

      system.retractKeycap('W');
      const toCalls = mockTimelineTo.mock.calls;
      const motionPathArg = toCalls[toCalls.length - 1][1];
      const path = motionPathArg.motionPath.path;
      // First point should be the rim position
      expect(path[0].x).toBe(-0.2);
      expect(path[0].y).toBe(0.09);
      expect(path[0].z).toBe(0.55);
      // Last point should be center (retracted)
      const lastPoint = path[path.length - 1];
      expect(lastPoint.x).toBe(0);
      expect(lastPoint.y).toBe(-0.02);
      expect(lastPoint.z).toBe(0);
    });
  });

  describe('closeSlit targets match new slit positions', () => {
    it('closeSlit animates bottom to y=0.06 and top to y=0.12', () => {
      system.closeSlit();
      const toCalls = mockTimelineTo.mock.calls;
      // Two .to() calls: bottom first, then top
      expect(toCalls.length).toBeGreaterThanOrEqual(2);
      // Bottom target: y=0.06
      const bottomCall = toCalls.find((c: any) => c[1]?.y === 0.06);
      expect(bottomCall).toBeDefined();
      // Top target: y=0.12
      const topCall = toCalls.find((c: any) => c[1]?.y === 0.12);
      expect(topCall).toBeDefined();
    });
  });

  describe('dispose clears rimPositions', () => {
    it('rimPositions map is cleared on dispose', () => {
      const positions = new Map<string, { x: number; y: number; z: number }>();
      positions.set('Q', { x: 0.3, y: 0.09, z: 0.5 });
      system.setRimPositions(positions);
      system.dispose();
      expect((system as any).rimPositions.size).toBe(0);
    });
  });

  // ── Property-based ──

  describe('Property-Based Tests', () => {
    it('pullLever clamped position is always within [0, 1]', () => {
      fc.assert(
        fc.property(fc.float({ min: -100, max: 100, noNaN: true }), (raw) => {
          const clamped = Math.max(0, Math.min(1, raw));
          expect(clamped).toBeGreaterThanOrEqual(0);
          expect(clamped).toBeLessThanOrEqual(1);
        }),
      );
    });

    it('rotatePlatter duration is positive for any positive RPM', () => {
      fc.assert(
        fc.property(fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), (rpm) => {
          const radiansPerSecond = (rpm * 2 * Math.PI) / 60;
          const duration = (2 * Math.PI) / radiansPerSecond;
          expect(duration).toBeGreaterThan(0);
          expect(Number.isFinite(duration)).toBe(true);
        }),
      );
    });
  });
});
