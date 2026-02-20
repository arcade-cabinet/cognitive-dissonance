/**
 * Tests for SpatialAudioManager — Cognitive Dissonance v3.0
 *
 * Verifies procedural SFX initialization, event triggering, parameter updates,
 * and disposal. Must mock additional Tone.js synth types beyond the shared mock.
 */

// Extend the tone mock with additional synth types used by SpatialAudioManager
jest.mock('tone', () => {
  const mockConnect = function (this: any) { return this; };
  const mockDispose = jest.fn();
  const mockTriggerAttackRelease = jest.fn();

  class MockReverb {
    wet = { value: 0.6 };
    toDestination() { return this; }
    async generate() {}
    connect() { return this; }
    dispose() {}
  }

  class MockMetalSynth {
    volume = { value: -12 };
    connect = mockConnect;
    triggerAttackRelease = mockTriggerAttackRelease;
    dispose = mockDispose;
  }

  class MockNoise {
    volume = { value: -60, rampTo: jest.fn() };
    connect = mockConnect;
    start() {}
    stop() {}
    dispose() {}
  }

  class MockFilter {
    connect = mockConnect;
    dispose() {}
  }

  class MockGain {
    gain = { rampTo: jest.fn() };
    toDestination() { return this; }
    dispose() {}
  }

  class MockMonoSynth {
    volume = { value: -12 };
    connect = mockConnect;
    triggerAttackRelease = mockTriggerAttackRelease;
    dispose = jest.fn();
  }

  class MockFMSynth {
    volume = { value: -18 };
    connect = mockConnect;
    triggerAttackRelease = mockTriggerAttackRelease;
    dispose = jest.fn();
  }

  class MockNoiseSynth {
    volume = { value: -18 };
    connect = mockConnect;
    triggerAttackRelease = mockTriggerAttackRelease;
    dispose = jest.fn();
  }

  class MockAMSynth {
    volume = { value: -15 };
    connect = mockConnect;
    triggerAttackRelease = mockTriggerAttackRelease;
    dispose = jest.fn();
  }

  class MockDuoSynth {
    volume = { value: -12 };
    connect = mockConnect;
    triggerAttackRelease = mockTriggerAttackRelease;
    dispose = jest.fn();
  }

  return {
    Reverb: MockReverb,
    MetalSynth: MockMetalSynth,
    Noise: MockNoise,
    Filter: MockFilter,
    Gain: MockGain,
    MonoSynth: MockMonoSynth,
    FMSynth: MockFMSynth,
    NoiseSynth: MockNoiseSynth,
    AMSynth: MockAMSynth,
    DuoSynth: MockDuoSynth,
    getContext: () => ({ state: 'suspended' }),
    start: jest.fn(),
    dbToGain: (_db: number) => 0,
    Frequency: jest.fn((_note: number, _type: string) => ({
      toFrequency: () => 261.63, // C4 frequency
    })),
    now: jest.fn(() => 0),
  };
});

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: jest.fn((_x: number, _y: number, _z: number) => ({ x: _x, y: _y, z: _z })),
}));

jest.mock('@babylonjs/core/scene', () => ({}));

import * as Tone from 'tone';
import { ImmersionAudioBridge } from '../ImmersionAudioBridge';
import { SpatialAudioManager } from '../SpatialAudioManager';

function createSpatialAudioManager(): SpatialAudioManager {
  (SpatialAudioManager as any).instance = null;
  return SpatialAudioManager.getInstance();
}

function createImmersionBridge(): ImmersionAudioBridge {
  (ImmersionAudioBridge as any).instance = null;
  return ImmersionAudioBridge.getInstance();
}

describe('SpatialAudioManager', () => {
  let manager: SpatialAudioManager;
  let bridge: ImmersionAudioBridge;
  const mockScene = {} as any;
  const defaultParams = { bpm: 90, swing: 0.15, rootNote: 0 };

  beforeEach(async () => {
    bridge = createImmersionBridge();
    await bridge.initialize();
    manager = createSpatialAudioManager();
  });

  afterEach(() => {
    manager.dispose();
    bridge.dispose();
  });

  describe('singleton pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = SpatialAudioManager.getInstance();
      const instance2 = SpatialAudioManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('initializes successfully with valid reverb', () => {
      manager.initialize(mockScene, defaultParams);
      expect((manager as any).isInitialized).toBe(true);
    });

    it('creates all 7 synth types', () => {
      manager.initialize(mockScene, defaultParams);
      expect((manager as any).keycapSynth).not.toBeNull();
      expect((manager as any).leverSynth).not.toBeNull();
      expect((manager as any).platterSynth).not.toBeNull();
      expect((manager as any).tendrilSynth).not.toBeNull();
      expect((manager as any).enemySynth).not.toBeNull();
      expect((manager as any).bossSynth).not.toBeNull();
      expect((manager as any).shatterSynth).not.toBeNull();
    });

    it('stores audio params', () => {
      manager.initialize(mockScene, { bpm: 120, swing: 0.25, rootNote: 5 });
      expect((manager as any).audioParams.bpm).toBe(120);
      expect((manager as any).audioParams.swing).toBe(0.25);
      expect((manager as any).audioParams.rootNote).toBe(5);
    });

    it('does not re-initialize if already initialized', () => {
      manager.initialize(mockScene, defaultParams);
      const keycapFirst = (manager as any).keycapSynth;
      manager.initialize(mockScene, { bpm: 120, swing: 0, rootNote: 3 });
      expect((manager as any).keycapSynth).toBe(keycapFirst);
    });

    it('warns and skips synth creation when bridge has no reverb', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      // Create a fresh bridge that is NOT initialized (no reverb)
      bridge.dispose();
      const freshBridge = createImmersionBridge();
      // Bridge not initialized => getReverb() returns null
      const freshManager = createSpatialAudioManager();
      freshManager.initialize(mockScene, defaultParams);
      expect((freshManager as any).isInitialized).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ImmersionAudioBridge not initialized'),
      );
      consoleSpy.mockRestore();
      freshManager.dispose();
      freshBridge.dispose();
    });
  });

  describe('triggerSFX', () => {
    const mockPosition = { x: 1, y: 0, z: 2 };

    beforeEach(() => {
      manager.initialize(mockScene, defaultParams);
    });

    it('does nothing if not initialized', () => {
      const uninitManager = createSpatialAudioManager();
      // Not calling initialize
      expect(() =>
        uninitManager.triggerSFX({ type: 'keycap', position: mockPosition as any, intensity: 0.5 }),
      ).not.toThrow();
      uninitManager.dispose();
    });

    it('triggers keycap synth on keycap event', () => {
      const synth = (manager as any).keycapSynth;
      manager.triggerSFX({ type: 'keycap', position: mockPosition as any, intensity: 0.5 });
      expect(synth.triggerAttackRelease).toHaveBeenCalled();
    });

    it('triggers lever synth on lever event', () => {
      const synth = (manager as any).leverSynth;
      manager.triggerSFX({ type: 'lever', position: mockPosition as any, intensity: 0.5 });
      expect(synth.triggerAttackRelease).toHaveBeenCalled();
    });

    it('triggers platter synth on platter event', () => {
      const synth = (manager as any).platterSynth;
      manager.triggerSFX({ type: 'platter', position: mockPosition as any, intensity: 0.5 });
      expect(synth.triggerAttackRelease).toHaveBeenCalled();
    });

    it('triggers tendril synth on tendril event', () => {
      const synth = (manager as any).tendrilSynth;
      manager.triggerSFX({ type: 'tendril', position: mockPosition as any, intensity: 0.5 });
      expect(synth.triggerAttackRelease).toHaveBeenCalled();
    });

    it('triggers enemy synth on enemy event', () => {
      const synth = (manager as any).enemySynth;
      manager.triggerSFX({ type: 'enemy', position: mockPosition as any, intensity: 0.5 });
      expect(synth.triggerAttackRelease).toHaveBeenCalled();
    });

    it('triggers boss synth on boss event', () => {
      const synth = (manager as any).bossSynth;
      manager.triggerSFX({ type: 'boss', position: mockPosition as any, intensity: 0.5 });
      expect(synth.triggerAttackRelease).toHaveBeenCalled();
    });

    it('triggers shatter synth on shatter event', () => {
      const synth = (manager as any).shatterSynth;
      manager.triggerSFX({ type: 'shatter', position: mockPosition as any, intensity: 1.0 });
      expect(synth.triggerAttackRelease).toHaveBeenCalled();
    });

    it('uses Tone.Frequency to convert MIDI note', () => {
      manager.triggerSFX({ type: 'keycap', position: mockPosition as any, intensity: 0.5 });
      expect(Tone.Frequency).toHaveBeenCalled();
    });

    it('uses Tone.now() for scheduling', () => {
      manager.triggerSFX({ type: 'keycap', position: mockPosition as any, intensity: 0.5 });
      expect(Tone.now).toHaveBeenCalled();
    });

    it('calculates duration based on intensity', () => {
      const synth = (manager as any).keycapSynth;
      manager.triggerSFX({ type: 'keycap', position: mockPosition as any, intensity: 1.0 });
      // duration = 0.1 + 1.0 * 0.3 = 0.4
      const call = synth.triggerAttackRelease.mock.calls[synth.triggerAttackRelease.mock.calls.length - 1];
      expect(call[1]).toBeCloseTo(0.4);
    });

    it('shatter always uses intensity 1.0', () => {
      const synth = (manager as any).shatterSynth;
      manager.triggerSFX({ type: 'shatter', position: mockPosition as any, intensity: 0.3 });
      const call = synth.triggerAttackRelease.mock.calls[synth.triggerAttackRelease.mock.calls.length - 1];
      // NoiseSynth.triggerAttackRelease(duration, time, velocity)
      // shatter: duration * 4, now, 1.0
      expect(call[1]).toBe(0); // Tone.now() returns 0
      expect(call[2]).toBe(1.0); // velocity always 1.0 for shatter
    });
  });

  describe('setAudioParams', () => {
    it('updates audio parameters', () => {
      manager.setAudioParams({ bpm: 120, swing: 0.2, rootNote: 3 });
      expect((manager as any).audioParams.bpm).toBe(120);
      expect((manager as any).audioParams.swing).toBe(0.2);
      expect((manager as any).audioParams.rootNote).toBe(3);
    });
  });

  describe('reset', () => {
    it('does not throw', () => {
      expect(() => manager.reset()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('disposes all synths', () => {
      manager.initialize(mockScene, defaultParams);
      const keycap = (manager as any).keycapSynth;
      const lever = (manager as any).leverSynth;
      const platter = (manager as any).platterSynth;
      const tendril = (manager as any).tendrilSynth;
      const enemy = (manager as any).enemySynth;
      const boss = (manager as any).bossSynth;
      const shatter = (manager as any).shatterSynth;

      manager.dispose();

      expect(keycap.dispose).toHaveBeenCalled();
      expect(lever.dispose).toHaveBeenCalled();
      expect(platter.dispose).toHaveBeenCalled();
      expect(tendril.dispose).toHaveBeenCalled();
      expect(enemy.dispose).toHaveBeenCalled();
      expect(boss.dispose).toHaveBeenCalled();
      expect(shatter.dispose).toHaveBeenCalled();
    });

    it('nulls all synths', () => {
      manager.initialize(mockScene, defaultParams);
      manager.dispose();
      expect((manager as any).keycapSynth).toBeNull();
      expect((manager as any).leverSynth).toBeNull();
      expect((manager as any).platterSynth).toBeNull();
      expect((manager as any).tendrilSynth).toBeNull();
      expect((manager as any).enemySynth).toBeNull();
      expect((manager as any).bossSynth).toBeNull();
      expect((manager as any).shatterSynth).toBeNull();
    });

    it('sets isInitialized to false', () => {
      manager.initialize(mockScene, defaultParams);
      manager.dispose();
      expect((manager as any).isInitialized).toBe(false);
    });

    it('nulls singleton instance', () => {
      manager.dispose();
      expect((SpatialAudioManager as any).instance).toBeNull();
    });

    it('does not throw if called without initialization', () => {
      expect(() => manager.dispose()).not.toThrow();
    });
  });
});
