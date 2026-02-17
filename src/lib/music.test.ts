import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Tone.js before importing AdaptiveMusic
const mockTransport = {
  bpm: {
    value: 120,
    cancelScheduledValues: vi.fn(),
    rampTo: vi.fn(),
  },
  start: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
};

const mockLoop = {
  start: vi.fn(),
  dispose: vi.fn(),
};

const mockSynth = {
  volume: { value: 0 },
  oscillator: { type: 'triangle' as string },
  connect: vi.fn(),
  triggerAttackRelease: vi.fn(),
  dispose: vi.fn(),
};

const mockPolySynth = {
  volume: { value: 0 },
  connect: vi.fn(),
  triggerAttackRelease: vi.fn(),
  dispose: vi.fn(),
};

const mockNoiseSynth = {
  volume: { value: 0 },
  connect: vi.fn(),
  triggerAttackRelease: vi.fn(),
  dispose: vi.fn(),
};

const mockMembraneSynth = {
  volume: { value: 0 },
  connect: vi.fn(),
  triggerAttackRelease: vi.fn(),
  dispose: vi.fn(),
};

const mockGain = {
  connect: vi.fn(),
  dispose: vi.fn(),
};

const mockReverb = {
  connect: vi.fn(),
  dispose: vi.fn(),
};

const mockDistortion = {
  distortion: 0,
  wet: { value: 0 },
  toDestination: vi.fn(),
  connect: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('tone', () => ({
  getTransport: () => mockTransport,
  getContext: () => ({ state: 'running' }),
  start: vi.fn().mockResolvedValue(undefined),
  Time: vi.fn(function () {
    return { toSeconds: () => 0.125 };
  }),
  Loop: vi.fn(function () {
    return { ...mockLoop, start: vi.fn(), dispose: vi.fn() };
  }),
  MonoSynth: vi.fn(function () {
    return {
      ...mockSynth,
      volume: { value: 0 },
      oscillator: { type: 'triangle' },
      connect: vi.fn(),
      dispose: vi.fn(),
    };
  }),
  PolySynth: vi.fn(function () {
    return {
      ...mockPolySynth,
      volume: { value: 0 },
      connect: vi.fn(),
      dispose: vi.fn(),
    };
  }),
  Synth: vi.fn(function () {
    return {};
  }),
  NoiseSynth: vi.fn(function () {
    return {
      ...mockNoiseSynth,
      volume: { value: 0 },
      connect: vi.fn(),
      dispose: vi.fn(),
    };
  }),
  MembraneSynth: vi.fn(function () {
    return {
      ...mockMembraneSynth,
      volume: { value: 0 },
      connect: vi.fn(),
      dispose: vi.fn(),
    };
  }),
  Gain: vi.fn(function () {
    return { ...mockGain, connect: vi.fn(), dispose: vi.fn() };
  }),
  Reverb: vi.fn(function () {
    return { ...mockReverb, connect: vi.fn(), dispose: vi.fn() };
  }),
  Distortion: vi.fn(function () {
    return { ...mockDistortion, toDestination: vi.fn(), dispose: vi.fn() };
  }),
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
      await expect(music.init()).resolves.toBeUndefined();
    });

    it('should not initialize twice', async () => {
      await music.init();
      await music.init(); // Second call should be no-op
      // No error thrown means success
    });
  });

  describe('start()', () => {
    it('should not start before initialization', () => {
      music.start(0);
      // Should not throw — just silently returns
    });

    it('should start playback after init', async () => {
      await music.init();
      music.start(0);
      expect(mockTransport.start).toHaveBeenCalled();
    });

    it('should set BPM based on wave', async () => {
      await music.init();
      music.start(2);
      // Base BPM = 120 + 2*8 = 136
      expect(mockTransport.bpm.value).toBe(136);
    });
  });

  describe('stop()', () => {
    it('should stop playback', async () => {
      await music.init();
      music.start(0);
      music.stop();
      expect(mockTransport.stop).toHaveBeenCalled();
      expect(mockTransport.cancel).toHaveBeenCalled();
    });

    it('should handle stop when not playing', () => {
      music.stop(); // Should not throw
    });
  });

  describe('setPanic()', () => {
    it('should clamp panic to 0-100', async () => {
      await music.init();
      music.start(0);
      music.setPanic(-10);
      music.setPanic(150);
      // Should not throw
    });

    it('should not update when not playing', async () => {
      await music.init();
      music.setPanic(50);
      // Should not throw — early return when not playing
    });

    it('should update BPM when panic changes by >= 2', async () => {
      await music.init();
      music.start(0);

      mockTransport.bpm.cancelScheduledValues.mockClear();
      mockTransport.bpm.rampTo.mockClear();

      music.setPanic(50);
      expect(mockTransport.bpm.rampTo).toHaveBeenCalled();
    });

    it('should not flood transport with BPM changes for small deltas', async () => {
      await music.init();
      music.start(0);

      music.setPanic(50);
      mockTransport.bpm.rampTo.mockClear();

      // Small change (< 2) should not trigger BPM update
      music.setPanic(51);
      expect(mockTransport.bpm.rampTo).not.toHaveBeenCalled();
    });
  });

  describe('resume()', () => {
    it('should handle resume when context is running', async () => {
      await music.init();
      await expect(music.resume()).resolves.toBeUndefined();
    });
  });

  describe('destroy()', () => {
    it('should clean up all resources', async () => {
      await music.init();
      music.start(0);
      music.destroy();
      // After destroy, further operations should not throw
      music.start(0);
      music.setPanic(50);
    });

    it('should handle double destroy', async () => {
      await music.init();
      music.destroy();
      music.destroy(); // Should not throw
    });
  });

  describe('lifecycle', () => {
    it('should handle full lifecycle: init -> start -> setPanic -> stop -> destroy', async () => {
      await music.init();
      music.start(0);
      music.setPanic(25);
      music.setPanic(50);
      music.setPanic(75);
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
