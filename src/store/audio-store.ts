/**
 * Koota-backed proxy for audio state + Tone.js graph lifecycle.
 *
 * Audio state (isInitialized, tension, graph) lives in the `Audio` trait on
 * the world (src/sim/world.ts). The `initialize()` and `shutdown()` methods
 * here own the Tone.js signal chain; they're on the store rather than in
 * src/sim/actions.ts because they have significant async logic and tight
 * coupling to Tone.
 */

import { useSyncExternalStore } from 'react';
import { Audio, world } from '@/sim/world';
import { useSeedStore } from './seed-store';

interface AudioGraph {
  masterGain: import('tone').Gain;
  drone: import('tone').Oscillator;
  padFilter: import('tone').Filter;
  pads: import('tone').PolySynth;
  glitchFilter: import('tone').Filter;
  glitchEnv: import('tone').AmplitudeEnvelope;
  glitchNoise: import('tone').Noise;
  chimes: import('tone').MetalSynth;
  loop: import('tone').Loop;
  stepIndex: number;
  glitchPattern: number[];
  chimePattern: number[];
}

interface AudioState {
  isInitialized: boolean;
  tension: number;
  graph: AudioGraph | null;
  initialize: () => Promise<void>;
  updateTension: (newTension: number) => Promise<void>;
  shutdown: () => Promise<void>;
}

async function initialize(): Promise<void> {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const cur = world.get(Audio)!;
  if (cur.isInitialized || cur.graph) return;

  const Tone = await import('tone');
  await Tone.start();

  const masterGain = new Tone.Gain(0.85).toDestination();

  const drone = new Tone.Oscillator({ type: 'sine', frequency: 38 }).connect(masterGain);
  drone.start();

  const padFilter = new Tone.Filter(600, 'lowpass').connect(masterGain);
  const pads = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 6, decay: 12, sustain: 0.7, release: 18 },
  }).connect(padFilter);

  const glitchFilter = new Tone.Filter(6000, 'highpass').connect(masterGain);
  const glitchEnv = new Tone.AmplitudeEnvelope({
    attack: 0.01,
    decay: 0.4,
    sustain: 0,
    release: 0.2,
  }).connect(glitchFilter);
  const glitchNoise = new Tone.Noise('white').connect(glitchEnv);
  glitchNoise.start();

  const chimes = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 1.8, release: 4 },
    volume: -14,
  }).connect(masterGain);

  const seedRng = useSeedStore.getState().rng;
  const glitchPattern = Array.from({ length: 32 }, () => seedRng());
  const chimePattern = Array.from({ length: 32 }, () => seedRng());

  const loop = new Tone.Loop((time: number) => {
    // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
    const state = world.get(Audio)!;
    if (!state.graph) return;
    const g = state.graph as AudioGraph;
    const cur = state.tension;
    const idx = g.stepIndex % g.glitchPattern.length;

    g.drone.frequency.value = 38 + cur * 62;
    g.padFilter.frequency.value = 600 + cur * 4200;

    if (g.glitchPattern[idx] < 0.4 + cur * 0.9) {
      g.glitchEnv.triggerAttackRelease(0.06 + cur * 0.6, time);
    }
    if (g.chimePattern[idx] < 0.25 + cur * 0.75) {
      g.chimes.triggerAttackRelease(0.03 + g.chimePattern[idx] * 0.12, time);
    }
    g.stepIndex += 1;
  }, '4n').start(0);

  const baseBpm = 60 + seedRng() * 40;
  Tone.getTransport().bpm.value = baseBpm;
  Tone.getTransport().start();

  world.set(Audio, (prev) => ({
    ...prev,
    isInitialized: true,
    graph: {
      masterGain,
      drone,
      padFilter,
      pads,
      glitchFilter,
      glitchEnv,
      glitchNoise,
      chimes,
      loop,
      stepIndex: 0,
      glitchPattern,
      chimePattern,
    },
  }));
}

async function updateTension(newTension: number): Promise<void> {
  world.set(Audio, (prev) => ({ ...prev, tension: newTension }));
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  if (world.get(Audio)!.isInitialized) {
    const Tone = await import('tone');
    const baseBpm = 68;
    Tone.getTransport().bpm.value = baseBpm + newTension * baseBpm;
  }
}

async function shutdown(): Promise<void> {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const cur = world.get(Audio)!;
  const Tone = await import('tone');
  Tone.getTransport().stop();
  Tone.getTransport().cancel();

  if (cur.graph) {
    const g = cur.graph as AudioGraph;
    g.loop.stop();
    g.loop.dispose();
    g.glitchNoise.stop();
    g.glitchNoise.dispose();
    g.glitchEnv.dispose();
    g.glitchFilter.dispose();
    g.chimes.dispose();
    g.pads.dispose();
    g.padFilter.dispose();
    g.drone.stop();
    g.drone.dispose();
    g.masterGain.dispose();
  }
  world.set(Audio, (prev) => ({ ...prev, isInitialized: false, graph: null }));
}

function buildState(): AudioState {
  // biome-ignore lint/style/noNonNullAssertion: singleton trait is guaranteed by createWorld
  const { isInitialized, tension, graph } = world.get(Audio)!;
  return {
    isInitialized,
    tension,
    graph: graph as AudioGraph | null,
    initialize,
    updateTension,
    shutdown,
  };
}

function subscribe(listener: () => void): () => void {
  return world.onChange(Audio, listener);
}

type Selector<T> = (state: AudioState) => T;

function useAudioStoreImpl<T = AudioState>(selector?: Selector<T>): T {
  const getSnapshot = () => {
    const state = buildState();
    return selector ? selector(state) : (state as unknown as T);
  };
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useAudioStore = Object.assign(useAudioStoreImpl, {
  getState: buildState,
  /** Test-only: write a partial state slice into the underlying Audio trait. */
  setState: (partial: Partial<Pick<AudioState, 'isInitialized' | 'tension' | 'graph'>>): void => {
    world.set(Audio, (prev) => ({ ...prev, ...partial }) as never);
  },
  subscribe: (listener: (state: AudioState, prev: AudioState) => void): (() => void) => {
    let prev = buildState();
    return subscribe(() => {
      const next = buildState();
      listener(next, prev);
      prev = next;
    });
  },
});
