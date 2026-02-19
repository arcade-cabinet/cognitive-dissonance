import * as fc from 'fast-check';
import { useGameStore } from '../../store/game-store';
import { useSeedStore } from '../../store/seed-store';
import type { DreamTypeHandler } from '../DreamTypeHandler';
import { KeyboardInputSystem } from '../KeyboardInputSystem';
import type { MechanicalAnimationSystem } from '../MechanicalAnimationSystem';
import type { PatternStabilizationSystem } from '../PatternStabilizationSystem';

// Mock @babylonjs/core/Events/keyboardEvents
jest.mock('@babylonjs/core/Events/keyboardEvents', () => ({
  KeyboardEventTypes: {
    KEYDOWN: 1,
    KEYUP: 2,
  },
}));

// Mock requestAnimationFrame and cancelAnimationFrame for Node.js environment
global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as unknown as number; // ~60fps
}) as typeof requestAnimationFrame;

global.cancelAnimationFrame = ((id: number) => {
  clearTimeout(id);
}) as typeof cancelAnimationFrame;

// Mock Scene with onKeyboardObservable
const createMockScene = () => {
  const observers: Array<(kbInfo: any) => void> = [];
  return {
    onKeyboardObservable: {
      add: (callback: (kbInfo: any) => void) => {
        observers.push(callback);
      },
      notifyObservers: (kbInfo: any) => {
        for (const observer of observers) {
          observer(kbInfo);
        }
      },
    },
    observers,
  };
};

// Mock KeyboardEvent
const createKeyboardEvent = (key: string, type: 'keydown' | 'keyup'): KeyboardEvent => {
  return {
    key,
    type,
    preventDefault: jest.fn(),
  } as unknown as KeyboardEvent;
};

describe('KeyboardInputSystem', () => {
  let system: KeyboardInputSystem;
  let mockScene: any;
  let mockPatternStabilization: PatternStabilizationSystem;
  let mockMechanicalAnimation: MechanicalAnimationSystem;
  let mockDreamTypeHandler: DreamTypeHandler;

  beforeEach(() => {
    // Reset stores
    useGameStore.getState().reset();
    useSeedStore.getState().setSeed('test-seed');

    // Create mocks
    mockScene = createMockScene();
    mockPatternStabilization = {
      holdKey: jest.fn(),
      releaseKey: jest.fn(),
    } as unknown as PatternStabilizationSystem;
    mockMechanicalAnimation = {
      pullLever: jest.fn(),
      rotatePlatter: jest.fn(),
    } as unknown as MechanicalAnimationSystem;
    mockDreamTypeHandler = {
      getArchetypeName: jest.fn().mockReturnValue('PlatterRotationDream'),
    } as unknown as DreamTypeHandler;

    // Reset singleton and get system instance
    (KeyboardInputSystem as any).instance = null;
    system = KeyboardInputSystem.getInstance();
    system.initialize(mockScene, mockPatternStabilization, mockMechanicalAnimation, mockDreamTypeHandler);
  });

  afterEach(() => {
    system.reset();
  });

  describe('Requirement 31.1: Letter key → holdKey mapping', () => {
    it('should call PatternStabilizationSystem.holdKey when valid keycap letter is pressed', () => {
      const event = createKeyboardEvent('Q', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(mockPatternStabilization.holdKey).toHaveBeenCalledWith('Q', 0, 1.0);
    });

    it('should handle lowercase letters by converting to uppercase', () => {
      const event = createKeyboardEvent('a', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(mockPatternStabilization.holdKey).toHaveBeenCalledWith('A', 0, 1.0);
    });

    it('should ignore invalid keycap letters', () => {
      const event = createKeyboardEvent('Y', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(mockPatternStabilization.holdKey).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 31.2: Key release → releaseKey', () => {
    it('should call PatternStabilizationSystem.releaseKey when key is released', () => {
      // Press key
      const pressEvent = createKeyboardEvent('Q', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event: pressEvent,
      });

      // Release key
      const releaseEvent = createKeyboardEvent('Q', 'keyup');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 2, // KEYUP
        event: releaseEvent,
      });

      expect(mockPatternStabilization.releaseKey).toHaveBeenCalledWith('Q');
    });
  });

  describe('Requirement 31.3: 6-key simultaneous hold limit', () => {
    it('should allow up to 6 simultaneous key holds', () => {
      const keys = ['Q', 'W', 'E', 'R', 'T', 'A'];

      for (const key of keys) {
        const event = createKeyboardEvent(key, 'keydown');
        mockScene.onKeyboardObservable.notifyObservers({
          type: 1, // KEYDOWN
          event,
        });
      }

      expect(system.getActiveKeyCount()).toBe(6);
      expect(mockPatternStabilization.holdKey).toHaveBeenCalledTimes(6);
    });

    it('should reject 7th key when 6 keys are already held', () => {
      const keys = ['Q', 'W', 'E', 'R', 'T', 'A', 'S'];

      for (const key of keys) {
        const event = createKeyboardEvent(key, 'keydown');
        mockScene.onKeyboardObservable.notifyObservers({
          type: 1, // KEYDOWN
          event,
        });
      }

      expect(system.getActiveKeyCount()).toBe(6);
      expect(mockPatternStabilization.holdKey).toHaveBeenCalledTimes(6); // 7th call rejected
    });

    it('should allow new key after releasing one from 6-key hold', () => {
      const keys = ['Q', 'W', 'E', 'R', 'T', 'A'];

      // Press 6 keys
      for (const key of keys) {
        const event = createKeyboardEvent(key, 'keydown');
        mockScene.onKeyboardObservable.notifyObservers({
          type: 1, // KEYDOWN
          event,
        });
      }

      // Release one key
      const releaseEvent = createKeyboardEvent('Q', 'keyup');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 2, // KEYUP
        event: releaseEvent,
      });

      // Press new key
      const newEvent = createKeyboardEvent('S', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event: newEvent,
      });

      expect(system.getActiveKeyCount()).toBe(6);
      expect(mockPatternStabilization.holdKey).toHaveBeenCalledTimes(7); // 6 initial + 1 new
    });
  });

  describe('Requirement 31.4: Spacebar → pullLever with position ramp', () => {
    it('should call MechanicalAnimationSystem.pullLever when spacebar is pressed', (done) => {
      const event = createKeyboardEvent(' ', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      // Wait for first animation frame
      setTimeout(() => {
        expect(mockMechanicalAnimation.pullLever).toHaveBeenCalled();
        const firstCall = (mockMechanicalAnimation.pullLever as jest.Mock).mock.calls[0][0];
        expect(firstCall).toBeGreaterThanOrEqual(0.0);
        expect(firstCall).toBeLessThanOrEqual(1.0);

        // Release spacebar
        const releaseEvent = createKeyboardEvent(' ', 'keyup');
        mockScene.onKeyboardObservable.notifyObservers({
          type: 2, // KEYUP
          event: releaseEvent,
        });

        done();
      }, 50);
    });

    it('should reset lever to neutral position (0.5) on spacebar release', () => {
      const pressEvent = createKeyboardEvent(' ', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event: pressEvent,
      });

      const releaseEvent = createKeyboardEvent(' ', 'keyup');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 2, // KEYUP
        event: releaseEvent,
      });

      const lastCall = (mockMechanicalAnimation.pullLever as jest.Mock).mock.calls.slice(-1)[0][0];
      expect(lastCall).toBe(0.5);
    });
  });

  describe('Requirement 31.5: Enter key → phase transitions', () => {
    it('should transition from title to playing when Enter is pressed', () => {
      useGameStore.getState().setPhase('title');

      const event = createKeyboardEvent('Enter', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(useGameStore.getState().phase).toBe('playing');
    });

    it('should transition from shattered to title with new seed when Enter is pressed', () => {
      useGameStore.getState().setPhase('shattered');
      const oldSeed = useSeedStore.getState().seedString;

      const event = createKeyboardEvent('Enter', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(useGameStore.getState().phase).toBe('title');
      expect(useSeedStore.getState().seedString).not.toBe(oldSeed);
    });

    it('should not transition from playing phase when Enter is pressed', () => {
      useGameStore.getState().setPhase('playing');

      const event = createKeyboardEvent('Enter', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(useGameStore.getState().phase).toBe('playing');
    });
  });

  describe('Requirement 31.6: Arrow keys → platter rotation (PlatterRotationDream only)', () => {
    it('should call rotatePlatter with negative RPM for left arrow in PlatterRotationDream', () => {
      (mockDreamTypeHandler.getArchetypeName as jest.Mock).mockReturnValue('PlatterRotationDream');

      const event = createKeyboardEvent('ArrowLeft', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(mockMechanicalAnimation.rotatePlatter).toHaveBeenCalledWith(-5);
    });

    it('should call rotatePlatter with positive RPM for right arrow in PlatterRotationDream', () => {
      (mockDreamTypeHandler.getArchetypeName as jest.Mock).mockReturnValue('PlatterRotationDream');

      const event = createKeyboardEvent('ArrowRight', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(mockMechanicalAnimation.rotatePlatter).toHaveBeenCalledWith(5);
    });

    it('should not call rotatePlatter in LeverTensionDream', () => {
      (mockDreamTypeHandler.getArchetypeName as jest.Mock).mockReturnValue('LeverTensionDream');

      const event = createKeyboardEvent('ArrowLeft', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(mockMechanicalAnimation.rotatePlatter).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 31.7: Disable when XR/phone projection active', () => {
    it('should not process keys when disabled', () => {
      system.setEnabled(false);

      const event = createKeyboardEvent('Q', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(mockPatternStabilization.holdKey).not.toHaveBeenCalled();
    });

    it('should clear active keys when disabled', () => {
      // Press key
      const pressEvent = createKeyboardEvent('Q', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event: pressEvent,
      });

      expect(system.getActiveKeyCount()).toBe(1);

      // Disable
      system.setEnabled(false);

      expect(system.getActiveKeyCount()).toBe(0);
    });

    it('should resume processing keys when re-enabled', () => {
      system.setEnabled(false);
      system.setEnabled(true);

      const event = createKeyboardEvent('Q', 'keydown');
      mockScene.onKeyboardObservable.notifyObservers({
        type: 1, // KEYDOWN
        event,
      });

      expect(mockPatternStabilization.holdKey).toHaveBeenCalled();
    });
  });

  describe('Property-Based Tests', () => {
    it('should never exceed 6 active keys regardless of input sequence', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H'), {
            minLength: 1,
            maxLength: 20,
          }),
          (keys) => {
            system.reset();

            for (const key of keys) {
              const event = createKeyboardEvent(key, 'keydown');
              mockScene.onKeyboardObservable.notifyObservers({
                type: 1, // KEYDOWN
                event,
              });
            }

            expect(system.getActiveKeyCount()).toBeLessThanOrEqual(6);
          },
        ),
      );
    });

    it('should maintain enabled state consistency', () => {
      fc.assert(
        fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), (enabledStates) => {
          for (const enabled of enabledStates) {
            system.setEnabled(enabled);
            expect(system.isEnabled()).toBe(enabled);
          }
        }),
      );
    });
  });
});
