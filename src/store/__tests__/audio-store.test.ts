import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = {
  bpm: { value: 120 },
  start: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
};

const Gain = vi.fn(function Gain() {
  return { toDestination: vi.fn().mockReturnThis(), dispose: vi.fn() };
});

const Oscillator = vi.fn(function Oscillator() {
  return {
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    frequency: { value: 0 },
  };
});

const Filter = vi.fn(function Filter() {
  return { connect: vi.fn().mockReturnThis(), dispose: vi.fn(), frequency: { value: 0 } };
});

const PolySynth = vi.fn(function PolySynth() {
  return { connect: vi.fn().mockReturnThis(), dispose: vi.fn() };
});

const AmplitudeEnvelope = vi.fn(function AmplitudeEnvelope() {
  return {
    connect: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn(),
  };
});

const Noise = vi.fn(function Noise() {
  return { connect: vi.fn().mockReturnThis(), start: vi.fn(), stop: vi.fn(), dispose: vi.fn() };
});

const MetalSynth = vi.fn(function MetalSynth() {
  return { connect: vi.fn().mockReturnThis(), triggerAttackRelease: vi.fn(), dispose: vi.fn() };
});

const Loop = vi.fn(function Loop() {
  return { start: vi.fn().mockReturnThis(), stop: vi.fn(), dispose: vi.fn() };
});

vi.mock('tone', () => ({
  start: vi.fn(),
  Gain,
  Oscillator,
  Filter,
  PolySynth,
  Synth: vi.fn(),
  AmplitudeEnvelope,
  Noise,
  MetalSynth,
  Loop,
  getTransport: vi.fn(() => transport),
}));

vi.mock('@/store/seed-store', () => {
  let v = 0;
  return {
    useSeedStore: {
      getState: () => ({
        rng: () => {
          v = (v + 0.17) % 1;
          return v;
        },
      }),
    },
  };
});

import { useAudioStore } from '../audio-store';

describe('audio-store', () => {
  beforeEach(() => {
    useAudioStore.setState({
      isInitialized: false,
      tension: 0.12,
      graph: null,
    });
  });

  it('initial state is not initialized with tension 0.12', () => {
    const s = useAudioStore.getState();
    expect(s.isInitialized).toBe(false);
    expect(s.tension).toBe(0.12);
    expect(s.graph).toBeNull();
  });

  it('updateTension changes tension value', () => {
    useAudioStore.getState().updateTension(0.5);
    expect(useAudioStore.getState().tension).toBe(0.5);
  });

  it('initialize sets graph and shutdown clears it', async () => {
    await useAudioStore.getState().initialize();
    expect(useAudioStore.getState().isInitialized).toBe(true);
    expect(useAudioStore.getState().graph).not.toBeNull();

    await useAudioStore.getState().shutdown();
    expect(useAudioStore.getState().isInitialized).toBe(false);
    expect(useAudioStore.getState().graph).toBeNull();
  });
});
