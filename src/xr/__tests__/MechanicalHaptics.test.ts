// Mock Tone.js is handled by jest.config.ts moduleNameMapper -> src/__mocks__/tone.ts
// Mock react-native is handled by jest.config.ts moduleNameMapper -> src/__mocks__/react-native.ts

import { MechanicalHaptics } from '../MechanicalHaptics';

// Store reference to the Tone mock for assertions
import * as Tone from 'tone';

describe('MechanicalHaptics', () => {
  let system: MechanicalHaptics;

  beforeEach(() => {
    (MechanicalHaptics as any).instance = null;
    system = MechanicalHaptics.getInstance();
  });

  afterEach(() => {
    system.dispose();
  });

  describe('singleton', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = MechanicalHaptics.getInstance();
      const instance2 = MechanicalHaptics.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('creates new instance after dispose and reset', () => {
      const instance1 = MechanicalHaptics.getInstance();
      instance1.dispose();
      (MechanicalHaptics as any).instance = null;
      const instance2 = MechanicalHaptics.getInstance();
      expect(instance2).not.toBe(instance1);
    });
  });

  describe('init', () => {
    it('initializes without throwing', async () => {
      await expect(system.init()).resolves.not.toThrow();
    });

    it('sets isInitialized to true after init', async () => {
      await system.init();
      expect((system as any).isInitialized).toBe(true);
    });

    it('creates brownNoise after init', async () => {
      await system.init();
      expect((system as any).brownNoise).not.toBeNull();
    });

    it('creates noiseGain after init', async () => {
      await system.init();
      expect((system as any).noiseGain).not.toBeNull();
    });

    it('is idempotent — calling init twice does not re-create resources', async () => {
      await system.init();
      const firstNoise = (system as any).brownNoise;
      await system.init();
      expect((system as any).brownNoise).toBe(firstNoise);
    });
  });

  describe('triggerContact — web platform', () => {
    // Default mock has Platform.OS = 'web'

    it('calls navigator.vibrate for leverPull with double pulse', () => {
      const vibrateMock = jest.fn();
      (global as any).navigator = { vibrate: vibrateMock };

      system.triggerContact(1.0, 'leverPull');

      expect(vibrateMock).toHaveBeenCalledWith([50, 10, 50]);

      delete (global as any).navigator;
    });

    it('calls navigator.vibrate for keycapHold with single pulse', () => {
      const vibrateMock = jest.fn();
      (global as any).navigator = { vibrate: vibrateMock };

      system.triggerContact(1.0, 'keycapHold');

      expect(vibrateMock).toHaveBeenCalledWith([30]);

      delete (global as any).navigator;
    });

    it('calls navigator.vibrate for sphereTouch with single pulse', () => {
      const vibrateMock = jest.fn();
      (global as any).navigator = { vibrate: vibrateMock };

      system.triggerContact(1.0, 'sphereTouch');

      expect(vibrateMock).toHaveBeenCalledWith([20]);

      delete (global as any).navigator;
    });

    it('scales vibration duration with intensity', () => {
      const vibrateMock = jest.fn();
      (global as any).navigator = { vibrate: vibrateMock };

      system.triggerContact(0.5, 'keycapHold');

      // baseDuration for keycapHold = 30, duration = Math.floor(30 * 0.5) = 15
      expect(vibrateMock).toHaveBeenCalledWith([15]);

      delete (global as any).navigator;
    });

    it('clamps intensity to 0-1 range', () => {
      const vibrateMock = jest.fn();
      (global as any).navigator = { vibrate: vibrateMock };

      // Intensity > 1 should be clamped to 1
      system.triggerContact(2.0, 'keycapHold');
      expect(vibrateMock).toHaveBeenCalledWith([30]); // baseDuration * 1.0

      vibrateMock.mockClear();

      // Intensity < 0 should be clamped to 0
      system.triggerContact(-1.0, 'keycapHold');
      expect(vibrateMock).toHaveBeenCalledWith([0]); // baseDuration * 0

      delete (global as any).navigator;
    });

    it('does not throw when navigator.vibrate is not available', () => {
      (global as any).navigator = {};

      expect(() => {
        system.triggerContact(1.0, 'leverPull');
      }).not.toThrow();

      delete (global as any).navigator;
    });
  });

  describe('setTension', () => {
    it('stores currentTension', () => {
      system.setTension(0.5);
      expect((system as any).currentTension).toBe(0.5);
    });

    it('does not throw when not initialized', () => {
      expect(() => system.setTension(0.5)).not.toThrow();
    });

    it('calls noiseGain.gain.rampTo when initialized', async () => {
      await system.init();
      const rampToSpy = jest.spyOn((system as any).noiseGain.gain, 'rampTo');

      system.setTension(0.5);

      expect(rampToSpy).toHaveBeenCalled();
    });

    it('scales volume with tension (0.0 tension = silent)', async () => {
      await system.init();
      const rampToSpy = jest.spyOn((system as any).noiseGain.gain, 'rampTo');

      system.setTension(0.0);

      // The mock dbToGain returns 0, so rampTo should be called with (0, 0.5)
      expect(rampToSpy).toHaveBeenCalledWith(0, 0.5);
    });
  });

  describe('dispose', () => {
    it('stops and disposes brownNoise', async () => {
      await system.init();
      const brownNoise = (system as any).brownNoise;
      const stopSpy = jest.spyOn(brownNoise, 'stop');
      const disposeSpy = jest.spyOn(brownNoise, 'dispose');

      system.dispose();

      expect(stopSpy).toHaveBeenCalled();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('disposes noiseGain', async () => {
      await system.init();
      const noiseGain = (system as any).noiseGain;
      const disposeSpy = jest.spyOn(noiseGain, 'dispose');

      system.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('sets brownNoise and noiseGain to null', async () => {
      await system.init();
      system.dispose();

      expect((system as any).brownNoise).toBeNull();
      expect((system as any).noiseGain).toBeNull();
    });

    it('sets isInitialized to false', async () => {
      await system.init();
      system.dispose();

      expect((system as any).isInitialized).toBe(false);
    });

    it('resets currentTension to 0', async () => {
      await system.init();
      system.setTension(0.7);
      system.dispose();

      expect((system as any).currentTension).toBe(0.0);
    });

    it('is safe to call dispose without init', () => {
      expect(() => system.dispose()).not.toThrow();
    });
  });
});
