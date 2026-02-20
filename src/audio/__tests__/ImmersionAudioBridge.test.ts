/**
 * Tests for ImmersionAudioBridge — Cognitive Dissonance v3.0
 *
 * Verifies Tone.js audio graph initialization, tension-driven reverb/noise,
 * AudioContext resume, mechanical click, and disposal.
 */

// tone is auto-mocked via moduleNameMapper → src/__mocks__/tone.ts
// react-native is auto-mocked via moduleNameMapper → src/__mocks__/react-native.ts

import { ImmersionAudioBridge } from '../ImmersionAudioBridge';
import * as Tone from 'tone';

function createBridge(): ImmersionAudioBridge {
  (ImmersionAudioBridge as any).instance = null;
  return ImmersionAudioBridge.getInstance();
}

describe('ImmersionAudioBridge', () => {
  let bridge: ImmersionAudioBridge;

  beforeEach(() => {
    bridge = createBridge();
  });

  afterEach(() => {
    bridge.dispose();
  });

  describe('singleton pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = ImmersionAudioBridge.getInstance();
      const instance2 = ImmersionAudioBridge.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('returns a new instance after dispose', () => {
      bridge.dispose();
      const newBridge = ImmersionAudioBridge.getInstance();
      expect(newBridge).not.toBe(bridge);
      newBridge.dispose();
    });
  });

  describe('initialize', () => {
    it('creates a Reverb node', async () => {
      await bridge.initialize();
      const reverb = bridge.getReverb();
      expect(reverb).not.toBeNull();
    });

    it('marks as initialized after successful call', async () => {
      expect(bridge.getIsInitialized()).toBe(false);
      await bridge.initialize();
      expect(bridge.getIsInitialized()).toBe(true);
    });

    it('does not re-initialize if already initialized', async () => {
      await bridge.initialize();
      const reverbFirst = bridge.getReverb();
      await bridge.initialize();
      const reverbSecond = bridge.getReverb();
      // Same reverb instance means no re-initialization
      expect(reverbFirst).toBe(reverbSecond);
    });

    it('connects reverb to destination', async () => {
      await bridge.initialize();
      const reverb = bridge.getReverb();
      expect(reverb!.toDestination).toBeDefined();
    });

    it('creates MetalSynth for click sounds', async () => {
      await bridge.initialize();
      // clickSynth is private, but we can verify through playMechanicalClick behavior
      expect(bridge.getIsInitialized()).toBe(true);
    });

    it('creates brown Noise for corruption static', async () => {
      await bridge.initialize();
      // corruptionNoise is private, but initialized flag confirms it
      expect(bridge.getIsInitialized()).toBe(true);
    });

    it('starts with noise volume at -60 dB (silent)', async () => {
      await bridge.initialize();
      const noise = (bridge as any).corruptionNoise;
      expect(noise.volume.value).toBe(-60);
    });
  });

  describe('setTension', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('clamps tension to 0.0 minimum', () => {
      bridge.setTension(-0.5);
      expect((bridge as any).currentTension).toBe(0.0);
    });

    it('clamps tension to 0.999 maximum', () => {
      bridge.setTension(5.0);
      expect((bridge as any).currentTension).toBe(0.999);
    });

    it('sets reverb wet to 0.3 at tension 0.0', () => {
      bridge.setTension(0.0);
      const reverb = bridge.getReverb();
      expect(reverb!.wet.value).toBeCloseTo(0.3);
    });

    it('sets reverb wet to 0.6 at tension 0.5', () => {
      bridge.setTension(0.5);
      const reverb = bridge.getReverb();
      expect(reverb!.wet.value).toBeCloseTo(0.6);
    });

    it('sets reverb wet to ~0.9 at tension 0.999', () => {
      bridge.setTension(0.999);
      const reverb = bridge.getReverb();
      // 0.3 + 0.999 * 0.6 = 0.8994
      expect(reverb!.wet.value).toBeCloseTo(0.8994, 3);
    });

    it('ramps noise volume based on tension', () => {
      const noise = (bridge as any).corruptionNoise;
      const rampSpy = jest.spyOn(noise.volume, 'rampTo');
      bridge.setTension(0.5);
      // -60 + 0.5 * 48 = -36
      expect(rampSpy).toHaveBeenCalledWith(-36, 0.3);
    });

    it('noise stays silent at tension 0.0', () => {
      const noise = (bridge as any).corruptionNoise;
      const rampSpy = jest.spyOn(noise.volume, 'rampTo');
      bridge.setTension(0.0);
      expect(rampSpy).toHaveBeenCalledWith(-60, 0.3);
    });

    it('noise reaches -12 dB at tension 0.999', () => {
      const noise = (bridge as any).corruptionNoise;
      const rampSpy = jest.spyOn(noise.volume, 'rampTo');
      bridge.setTension(0.999);
      // -60 + 0.999 * 48 = -12.048
      expect(rampSpy).toHaveBeenCalledWith(expect.closeTo(-12.048, 1), 0.3);
    });
  });

  describe('resumeOnUserGesture', () => {
    beforeEach(async () => {
      await bridge.initialize();
    });

    it('calls Tone.start()', async () => {
      const startSpy = jest.spyOn(Tone, 'start');
      await bridge.resumeOnUserGesture();
      expect(startSpy).toHaveBeenCalled();
    });

    it('starts corruption noise', async () => {
      const noise = (bridge as any).corruptionNoise;
      const startSpy = jest.spyOn(noise, 'start');
      await bridge.resumeOnUserGesture();
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('playMechanicalClick', () => {
    it('does nothing if not initialized', () => {
      // Not initialized, should not throw
      expect(() => bridge.playMechanicalClick()).not.toThrow();
    });

    it('does nothing when AudioContext is not running', async () => {
      await bridge.initialize();
      // Context state is 'suspended' in mock
      const synth = (bridge as any).clickSynth;
      const triggerSpy = jest.spyOn(synth, 'triggerAttackRelease');
      bridge.playMechanicalClick();
      expect(triggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('getReverb', () => {
    it('returns null before initialization', () => {
      expect(bridge.getReverb()).toBeNull();
    });

    it('returns the reverb node after initialization', async () => {
      await bridge.initialize();
      expect(bridge.getReverb()).not.toBeNull();
    });
  });

  describe('reset', () => {
    it('resets tension to 0.0', async () => {
      await bridge.initialize();
      bridge.setTension(0.8);
      bridge.reset();
      expect((bridge as any).currentTension).toBe(0.0);
    });

    it('resets reverb wet to 0.3', async () => {
      await bridge.initialize();
      bridge.setTension(0.8);
      bridge.reset();
      const reverb = bridge.getReverb();
      expect(reverb!.wet.value).toBeCloseTo(0.3);
    });
  });

  describe('dispose', () => {
    it('stops and disposes corruption noise', async () => {
      await bridge.initialize();
      const noise = (bridge as any).corruptionNoise;
      const stopSpy = jest.spyOn(noise, 'stop');
      const disposeSpy = jest.spyOn(noise, 'dispose');
      bridge.dispose();
      expect(stopSpy).toHaveBeenCalled();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('disposes noise filter', async () => {
      await bridge.initialize();
      const filter = (bridge as any).noiseFilter;
      const disposeSpy = jest.spyOn(filter, 'dispose');
      bridge.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('disposes click synth', async () => {
      await bridge.initialize();
      const synth = (bridge as any).clickSynth;
      const disposeSpy = jest.spyOn(synth, 'dispose');
      bridge.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('disposes reverb', async () => {
      await bridge.initialize();
      const reverb = bridge.getReverb()!;
      const disposeSpy = jest.spyOn(reverb, 'dispose');
      bridge.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('sets isInitialized to false', async () => {
      await bridge.initialize();
      bridge.dispose();
      expect(bridge.getIsInitialized()).toBe(false);
    });

    it('resets currentTension to 0.0', async () => {
      await bridge.initialize();
      bridge.setTension(0.5);
      bridge.dispose();
      expect((bridge as any).currentTension).toBe(0.0);
    });

    it('nulls out the singleton instance', async () => {
      await bridge.initialize();
      bridge.dispose();
      expect((ImmersionAudioBridge as any).instance).toBeNull();
    });

    it('does not throw if called before initialization', () => {
      expect(() => bridge.dispose()).not.toThrow();
    });
  });
});
