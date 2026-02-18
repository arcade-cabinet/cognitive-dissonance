import { create } from 'zustand';

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
  updateTension: (newTension: number) => void;
  shutdown: () => Promise<void>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  isInitialized: false,
  tension: 0.12,
  graph: null,

  initialize: async () => {
    if (get().isInitialized || get().graph) return;

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

    const { useSeedStore } = await import('@/store/seed-store');
    const seedRng = useSeedStore.getState().rng;
    const glitchPattern = Array.from({ length: 32 }, () => seedRng());
    const chimePattern = Array.from({ length: 32 }, () => seedRng());

    const loop = new Tone.Loop((time: number) => {
      const state = get();
      if (!state.graph) return;

      const cur = state.tension;
      const g = state.graph;
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

    set({
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
    });
  },

  updateTension: async (newTension: number) => {
    set({ tension: newTension });
    if (get().isInitialized) {
      const Tone = await import('tone');
      const baseBpm = 68;
      Tone.getTransport().bpm.value = baseBpm + newTension * baseBpm;
    }
  },

  shutdown: async () => {
    const graph = get().graph;
    const Tone = await import('tone');
    Tone.getTransport().stop();
    Tone.getTransport().cancel();

    if (graph) {
      graph.loop.stop();
      graph.loop.dispose();
      graph.glitchNoise.stop();
      graph.glitchNoise.dispose();
      graph.glitchEnv.dispose();
      graph.glitchFilter.dispose();
      graph.chimes.dispose();
      graph.pads.dispose();
      graph.padFilter.dispose();
      graph.drone.stop();
      graph.drone.dispose();
      graph.masterGain.dispose();
    }

    set({ isInitialized: false, graph: null });
  },
}));
