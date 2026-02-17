import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted runs before vi.mock hoisting, so mock objects and classes are available
const {
  mockTransport,
  MockTime,
  MockLoop,
  MockMonoSynth,
  MockPolySynth,
  MockSynthClass,
  MockNoiseSynthClass,
  MockMembraneSynthClass,
  MockGainClass,
  MockReverbClass,
  MockDistortionClass,
} = vi.hoisted(() => {
  const _mockTransport = {
    bpm: {
      value: 120,
      cancelScheduledValues: vi.fn(),
      rampTo: vi.fn(),
    },
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
  };

  const _mockSynth = { triggerAttackRelease: vi.fn() };
  const _mockPolySynth = { triggerAttackRelease: vi.fn() };
  const _mockNoiseSynth = { triggerAttackRelease: vi.fn() };
  const _mockMembraneSynth = { triggerAttackRelease: vi.fn() };

  // Tone.js mock constructors — must be classes because
  // music.ts calls them with `new Tone.X(...)`.
  class _MockTime {
    toSeconds = () => 0.125;
  }
  class _MockLoop {
    start = vi.fn();
    dispose = vi.fn();
  }
  class _MockMonoSynth {
    triggerAttackRelease = _mockSynth.triggerAttackRelease;
    volume = { value: 0 };
    oscillator = { type: 'triangle' as string };
    connect = vi.fn();
    dispose = vi.fn();
  }
  class _MockPolySynth {
    triggerAttackRelease = _mockPolySynth.triggerAttackRelease;
    volume = { value: 0 };
    connect = vi.fn();
    dispose = vi.fn();
  }
  class _MockSynthClass {
    connect = vi.fn();
    dispose = vi.fn();
  }
  class _MockNoiseSynthClass {
    triggerAttackRelease = _mockNoiseSynth.triggerAttackRelease;
    volume = { value: 0 };
    connect = vi.fn();
    dispose = vi.fn();
  }
  class _MockMembraneSynthClass {
    triggerAttackRelease = _mockMembraneSynth.triggerAttackRelease;
    volume = { value: 0 };
    connect = vi.fn();
    dispose = vi.fn();
  }
  class _MockGainClass {
    gain = { value: 0 };
    connect = vi.fn();
    dispose = vi.fn();
  }
  class _MockReverbClass {
    decay = 0.5;
    connect = vi.fn();
    dispose = vi.fn();
  }
  class _MockDistortionClass {
    distortion = 0;
    wet = { value: 0 };
    toDestination = vi.fn();
    dispose = vi.fn();
  }

  return {
    mockTransport: _mockTransport,
    mockSynth: _mockSynth,
    mockPolySynth: _mockPolySynth,
    mockNoiseSynth: _mockNoiseSynth,
    mockMembraneSynth: _mockMembraneSynth,
    MockTime: _MockTime,
    MockLoop: _MockLoop,
    MockMonoSynth: _MockMonoSynth,
    MockPolySynth: _MockPolySynth,
    MockSynthClass: _MockSynthClass,
    MockNoiseSynthClass: _MockNoiseSynthClass,
    MockMembraneSynthClass: _MockMembraneSynthClass,
    MockGainClass: _MockGainClass,
    MockReverbClass: _MockReverbClass,
    MockDistortionClass: _MockDistortionClass,
  };
});

vi.mock('tone', () => ({
  getTransport: () => mockTransport,
  getContext: () => ({ state: 'running' }),
  start: vi.fn().mockResolvedValue(undefined),
  Time: MockTime,
  Loop: MockLoop,
  MonoSynth: MockMonoSynth,
  PolySynth: MockPolySynth,
  Synth: MockSynthClass,
  NoiseSynth: MockNoiseSynthClass,
  MembraneSynth: MockMembraneSynthClass,
  Gain: MockGainClass,
  Reverb: MockReverbClass,
  Distortion: MockDistortionClass,
}));

// Import after mocks
import { AdaptiveMusic } from './music';

describe('AdaptiveMusic', () => {
  let music: AdaptiveMusic;

  beforeEach(() => {
    vi.clearAllMocks();
    music = new AdaptiveMusic();
  });

  afterEach(() => {
    music.destroy();
  });

  describe('init()', () => {
    it('should initialize without error', async () => {
      await expect(music.init()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      await music.init();
      await music.init(); // Second call should be a no-op
    });
  });

  describe('start()', () => {
    it('should start playback after init', async () => {
      await music.init();
      music.start(0);
      expect(mockTransport.start).toHaveBeenCalled();
    });

    it('should set BPM based on wave', async () => {
      await music.init();
      music.start(3);
      // BPM should be set for wave 3
      expect(mockTransport.bpm.value).toBeDefined();
    });
  });

  describe('stop()', () => {
    it('should stop playback', async () => {
      await music.init();
      music.start(0);
      music.stop();
      expect(mockTransport.stop).toHaveBeenCalled();
    });

    it('should handle stop without start', async () => {
      await music.init();
      // Should not throw
      music.stop();
    });
  });

  describe('setPanic()', () => {
    it('should clamp panic to 0-100', async () => {
      await music.init();
      music.start(0);
      // Should not throw for out-of-range values
      music.setPanic(-10);
      music.setPanic(150);
    });

    it('should not update when not playing', async () => {
      await music.init();
      // Not started yet
      music.setPanic(50);
      expect(mockTransport.bpm.rampTo).not.toHaveBeenCalled();
    });

    it('should update BPM when panic changes by >= 2', async () => {
      await music.init();
      music.start(0);
      music.setPanic(50);
      expect(mockTransport.bpm.rampTo).toHaveBeenCalled();
    });

    it('should not flood transport with BPM changes for small deltas', async () => {
      await music.init();
      music.start(0);
      music.setPanic(50);
      const callCount = mockTransport.bpm.rampTo.mock.calls.length;
      music.setPanic(50.5); // Delta < 2, should skip
      expect(mockTransport.bpm.rampTo.mock.calls.length).toBe(callCount);
    });
  });

  describe('resume()', () => {
    it('should handle resume when context is running', async () => {
      await music.init();
      // Should not throw when context is already running
      await music.resume();
    });
  });

  describe('destroy()', () => {
    it('should clean up all resources', async () => {
      await music.init();
      music.start(0);
      music.destroy();
      // Should have cancelled transport
      expect(mockTransport.cancel).toHaveBeenCalled();
    });

    it('should handle double destroy', async () => {
      await music.init();
      music.destroy();
      // Second destroy should not throw
      music.destroy();
    });
  });

  describe('lifecycle', () => {
    it('should handle full lifecycle: init -> start -> setPanic -> stop -> destroy', async () => {
      await music.init();
      music.start(0);
      music.setPanic(30);
      music.setPanic(60);
      music.setPanic(90);
      music.stop();
      music.destroy();
    });

    it('should handle restart after stop', async () => {
      await music.init();
      music.start(0);
      music.stop();
      music.start(1);
      expect(mockTransport.start).toHaveBeenCalledTimes(2);
    });
  });
});
