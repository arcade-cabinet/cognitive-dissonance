/**
 * DiegeticAccessibility unit tests
 */

const mockSpeak = jest.fn();
const mockImpactAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-haptics', () => ({
  impactAsync: mockImpactAsync,
  ImpactFeedbackStyle: {
    Heavy: 'Heavy',
    Medium: 'Medium',
    Light: 'Light',
  },
}));

jest.mock('expo-speech', () => ({
  speak: mockSpeak,
}));

import { Platform } from 'react-native';
import { DiegeticAccessibility } from '../DiegeticAccessibility';

function createDiegeticAccessibility(): DiegeticAccessibility {
  (DiegeticAccessibility as any).instance = null;
  return DiegeticAccessibility.getInstance();
}

describe('DiegeticAccessibility', () => {
  let system: DiegeticAccessibility;

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'web';
    // Mock navigator.vibrate
    (global as any).navigator = { vibrate: jest.fn(), userAgent: 'Mozilla/5.0' };
    system = createDiegeticAccessibility();
  });

  afterEach(() => {
    system.dispose();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = DiegeticAccessibility.getInstance();
      const b = DiegeticAccessibility.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetting', () => {
      const a = DiegeticAccessibility.getInstance();
      (DiegeticAccessibility as any).instance = null;
      const b = DiegeticAccessibility.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('setHoldKeyCallback()', () => {
    it('stores the callback', () => {
      const cb = jest.fn();
      system.setHoldKeyCallback(cb);
      expect((system as any).holdKeyCallback).toBe(cb);
    });
  });

  describe('startListening()', () => {
    it('sets isListening to true', () => {
      system.startListening();
      expect((system as any).isListening).toBe(true);
    });

    it('does not start twice', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      system.startListening();
      system.startListening();
      // Only one log call from startListening
      expect(consoleSpy.mock.calls.filter(c => c[0]?.includes?.('started')).length).toBe(1);
      consoleSpy.mockRestore();
    });
  });

  describe('stopListening()', () => {
    it('sets isListening to false', () => {
      system.startListening();
      system.stopListening();
      expect((system as any).isListening).toBe(false);
    });

    it('does nothing when not listening', () => {
      expect(() => system.stopListening()).not.toThrow();
    });
  });

  describe('onVoiceCommand()', () => {
    it('calls holdKey callback for valid key letter', () => {
      const cb = jest.fn();
      system.setHoldKeyCallback(cb);
      system.onVoiceCommand('A');
      expect(cb).toHaveBeenCalledWith('A', 1200, 1.0);
    });

    it('converts lowercase to uppercase', () => {
      const cb = jest.fn();
      system.setHoldKeyCallback(cb);
      system.onVoiceCommand('q');
      expect(cb).toHaveBeenCalledWith('Q', 1200, 1.0);
    });

    it('trims whitespace', () => {
      const cb = jest.fn();
      system.setHoldKeyCallback(cb);
      system.onVoiceCommand('  W  ');
      expect(cb).toHaveBeenCalledWith('W', 1200, 1.0);
    });

    it('speaks confirmation via expo-speech', () => {
      const cb = jest.fn();
      system.setHoldKeyCallback(cb);
      system.onVoiceCommand('E');
      expect(mockSpeak).toHaveBeenCalledWith('Stabilizing E', { rate: 0.9, language: 'en-US' });
    });

    it('logs unrecognized command for invalid keys', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      system.onVoiceCommand('UNKNOWN');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unrecognized'));
      consoleSpy.mockRestore();
    });

    it('warns when holdKeyCallback is not set', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      system.onVoiceCommand('A');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('holdKeyCallback not set'));
      consoleSpy.mockRestore();
    });

    it('accepts all 14 valid keys', () => {
      const validKeys = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];
      const cb = jest.fn();
      system.setHoldKeyCallback(cb);
      for (const key of validKeys) {
        system.onVoiceCommand(key);
      }
      expect(cb).toHaveBeenCalledTimes(14);
    });
  });

  describe('setTension()', () => {
    it('stores current tension', () => {
      system.setTension(0.5);
      expect((system as any).currentTension).toBe(0.5);
    });

    it('triggers error haptic when crossing above 0.7 (web)', () => {
      system.setTension(0.6); // Below threshold
      system.setTension(0.8); // Cross above 0.7
      expect((global as any).navigator.vibrate).toHaveBeenCalledWith([100, 50, 100, 50, 100]);
    });

    it('triggers medium haptic when entering 0.4-0.7 zone from below (web)', () => {
      system.setTension(0.3); // Below zone
      system.setTension(0.5); // Enter zone
      expect((global as any).navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('triggers medium haptic when entering 0.4-0.7 zone from above', () => {
      system.setTension(0.8); // Above zone
      jest.clearAllMocks();
      system.setTension(0.5); // Enter zone from above
      expect((global as any).navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('does not trigger haptics when staying within same zone', () => {
      system.setTension(0.5);
      jest.clearAllMocks();
      system.setTension(0.55); // Still in medium zone
      expect((global as any).navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  describe('reset()', () => {
    it('stops listening', () => {
      system.startListening();
      system.reset();
      expect((system as any).isListening).toBe(false);
    });

    it('resets tension to 0', () => {
      system.setTension(0.8);
      system.reset();
      expect((system as any).currentTension).toBe(0.0);
    });
  });

  describe('dispose()', () => {
    it('stops listening', () => {
      system.startListening();
      system.dispose();
      expect((system as any).isListening).toBe(false);
    });

    it('clears holdKey callback', () => {
      system.setHoldKeyCallback(jest.fn());
      system.dispose();
      expect((system as any).holdKeyCallback).toBeNull();
    });

    it('clears singleton instance', () => {
      system.dispose();
      expect((DiegeticAccessibility as any).instance).toBeNull();
    });

    it('does not throw when called without setup', () => {
      (DiegeticAccessibility as any).instance = null;
      const fresh = DiegeticAccessibility.getInstance();
      expect(() => fresh.dispose()).not.toThrow();
    });
  });
});
