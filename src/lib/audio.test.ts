import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SFX } from '../lib/audio';

// Mock AudioContext
class MockAudioContext {
  createOscillator() {
    return {
      type: 'square',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
  currentTime = 0;
  state = 'running';
  resume = vi.fn();
  destination = {};
}

global.AudioContext = MockAudioContext as any;

describe('SFX Audio System', () => {
  let sfx: SFX;

  beforeEach(() => {
    sfx = new SFX();
  });

  it('should initialize without errors', () => {
    expect(sfx).toBeDefined();
  });

  it('should initialize audio context', () => {
    sfx.init();
    expect(sfx.ctx).toBeDefined();
  });

  it('should have all sound effect methods', () => {
    expect(typeof sfx.counter).toBe('function');
    expect(typeof sfx.miss).toBe('function');
    expect(typeof sfx.panicHit).toBe('function');
    expect(typeof sfx.powerup).toBe('function');
    expect(typeof sfx.nuke).toBe('function');
    expect(typeof sfx.bossHit).toBe('function');
    expect(typeof sfx.bossDie).toBe('function');
    expect(typeof sfx.waveStart).toBe('function');
  });

  it('should not crash when calling sounds before init', () => {
    expect(() => sfx.counter(1)).not.toThrow();
    expect(() => sfx.miss()).not.toThrow();
    expect(() => sfx.nuke()).not.toThrow();
  });

  it('should start and stop music correctly', () => {
    sfx.init();
    
    // Start music
    sfx.startMusic(1);
    expect(sfx.musicInterval).toBeDefined();
    
    // Stop music
    sfx.stopMusic();
    expect(sfx.musicInterval).toBeNull();
  });

  it('should clear music interval when stopMusic is called', () => {
    sfx.init();
    sfx.startMusic(1);
    
    const interval = sfx.musicInterval;
    expect(interval).not.toBeNull();
    
    sfx.stopMusic();
    expect(sfx.musicInterval).toBeNull();
  });
});
