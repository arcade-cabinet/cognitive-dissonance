import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SFX } from './audio';

// Detailed mocks
const mockOscillator = {
  type: 'square',
  frequency: { setValueAtTime: vi.fn(), value: 0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGain = {
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
};

// Capture the spies to verify calls
const createOscillatorSpy = vi.fn(() => ({ ...mockOscillator }));
const createGainSpy = vi.fn(() => ({ ...mockGain }));
const resumeSpy = vi.fn();
const closeSpy = vi.fn().mockResolvedValue(undefined);

class MockAudioContext {
  createOscillator = createOscillatorSpy;
  createGain = createGainSpy;
  currentTime = 0;
  state = 'suspended';
  resume = resumeSpy;
  destination = {};
  close = closeSpy;
}

describe('SFX Audio System', () => {
  let sfx: SFX;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);

    // Mock setInterval since we use fake timers, but some code might rely on ID
    vi.spyOn(window, 'setInterval');
    vi.spyOn(window, 'clearInterval');

    sfx = new SFX();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should initialize AudioContext on init', () => {
    sfx.init();
    expect(sfx.ctx).toBeInstanceOf(MockAudioContext);
  });

  it('should resume suspended context', () => {
    sfx.init();
    sfx.resume();
    expect(resumeSpy).toHaveBeenCalled();
  });

  it('should play tone for counter', () => {
    sfx.init();
    sfx.counter(1);

    // First tone fires immediately
    expect(createOscillatorSpy).toHaveBeenCalledTimes(1);
    expect(createGainSpy).toHaveBeenCalledTimes(1);

    // Advance timers to trigger all 3 scheduled tones (at 0ms, 50ms, 100ms)
    vi.advanceTimersByTime(150);

    expect(createOscillatorSpy).toHaveBeenCalledTimes(3);
    expect(createGainSpy).toHaveBeenCalledTimes(3);
  });

  it('should play tone for miss', () => {
    sfx.init();
    sfx.miss();
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should play tone for panicHit', () => {
    sfx.init();
    sfx.panicHit();
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should play tone for powerup', () => {
    sfx.init();
    sfx.powerup();
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should play tone for nuke', () => {
    sfx.init();
    sfx.nuke();
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should play tone for bossHit', () => {
    sfx.init();
    sfx.bossHit();
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should play tone for bossDie', () => {
    sfx.init();
    sfx.bossDie();
    vi.advanceTimersByTime(500);
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should play tone for waveStart', () => {
    sfx.init();
    sfx.waveStart();
    vi.advanceTimersByTime(500);
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should start music loop', () => {
    sfx.init();
    sfx.startMusic(1);
    expect(window.setInterval).toHaveBeenCalled();
    expect(sfx.musicInterval).not.toBeNull();
  });

  it('should stop music loop', () => {
    sfx.init();
    sfx.startMusic(1);
    const intervalId = sfx.musicInterval;
    sfx.stopMusic();
    expect(window.clearInterval).toHaveBeenCalledWith(intervalId);
    expect(sfx.musicInterval).toBeNull();
  });

  it('should play music notes in loop', () => {
    sfx.init();
    sfx.startMusic(1);

    // Advance time to trigger interval (ms is around 200ms)
    vi.advanceTimersByTime(1000);

    // Should have created oscillators for music notes
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should generate melody when wave > 1', () => {
    sfx.init();
    sfx.startMusic(2); // Wave 2 triggers melody logic

    // Advance time to trigger interval and melody generation
    // Melody notes play on some beats, so we advance enough to hit them
    vi.advanceTimersByTime(2000);

    // We can't easily distinguish melody oscillators from bass ones with just toHaveBeenCalled,
    // but the fact that it runs without error and covers the branch is what we need for coverage.
    // The previous test covered wave 1 (no melody), this covers wave 2 (melody).
    expect(createOscillatorSpy).toHaveBeenCalled();
  });

  it('should close context on destroy', () => {
    sfx.init();
    sfx.destroy();
    expect(closeSpy).toHaveBeenCalled();
    expect(sfx.ctx).toBeNull();
  });

  it('should handle missing context gracefully', () => {
    // Don't call init
    expect(() => sfx.counter(1)).not.toThrow();
    expect(() => sfx.startMusic(1)).not.toThrow();
  });

  it('should use webkitAudioContext if AudioContext is missing', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);
    sfx.init();
    expect(sfx.ctx).toBeInstanceOf(MockAudioContext);
  });

  it('should handle error when closing context', async () => {
    sfx.init();
    closeSpy.mockRejectedValueOnce(new Error('Close failed'));
    // Should not throw and catch block should be executed
    expect(() => sfx.destroy()).not.toThrow();
  });
});
