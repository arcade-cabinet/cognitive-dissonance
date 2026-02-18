import { create } from 'zustand';

interface AudioState {
  isInitialized: boolean;
  tension: number;

  initialize: () => Promise<void>;
  updateTension: (newTension: number) => void;
  shutdown: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  isInitialized: false,
  tension: 0.12,

  initialize: async () => {
    if (get().isInitialized) return;

    // Tone.js must be imported dynamically (client-only)
    const Tone = await import('tone');
    await Tone.start();

    const masterGain = new Tone.Gain(0.85).toDestination();

    // Layer 1: Deep sub drone
    const drone = new Tone.Oscillator({ type: 'sine', frequency: 38 }).connect(masterGain);
    drone.start();

    // Layer 2: Soft pads
    const padFilter = new Tone.Filter(600, 'lowpass').connect(masterGain);
    const _pads = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 6, decay: 12, sustain: 0.7, release: 18 },
    }).connect(padFilter);

    // Layer 3: Glitch percussion (Noise -> Envelope -> Filter -> masterGain)
    const glitchFilter = new Tone.Filter(6000, 'highpass').connect(masterGain);
    const glitchEnv = new Tone.AmplitudeEnvelope({
      attack: 0.01,
      decay: 0.4,
      sustain: 0,
      release: 0.2,
    }).connect(glitchFilter);
    const glitchNoise = new Tone.Noise('white').connect(glitchEnv);
    glitchNoise.start();

    // Layer 4: Metallic chimes
    const chimes = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 1.8, release: 4 },
      volume: -14,
    }).connect(masterGain);

    // Import seed store for deterministic audio evolution
    const { useSeedStore } = await import('@/store/seed-store');

    // Evolution loop — uses seeded RNG for deterministic audio
    const _loop = new Tone.Loop((time: number) => {
      const cur = get().tension;
      const rng = useSeedStore.getState().rng;

      drone.frequency.value = 38 + cur * 62;
      padFilter.frequency.value = 600 + cur * 4200;

      if (rng() < 0.4 + cur * 0.9) {
        glitchEnv.triggerAttackRelease(0.06 + cur * 0.6, time);
      }

      if (rng() < 0.25 + cur * 0.75) {
        chimes.triggerAttackRelease(0.03 + rng() * 0.12, time);
      }
    }, '4n').start(0);

    // Seed-driven base BPM
    const seedRng = useSeedStore.getState().rng;
    const baseBpm = 60 + seedRng() * 40; // 60-100 BPM from seed
    Tone.getTransport().bpm.value = baseBpm;
    Tone.getTransport().start();

    set({ isInitialized: true });
  },

  updateTension: async (newTension: number) => {
    set({ tension: newTension });
    // Ramp BPM with tension
    if (get().isInitialized) {
      const Tone = await import('tone');
      const baseBpm = 68;
      Tone.getTransport().bpm.value = baseBpm + newTension * baseBpm;
    }
  },

  shutdown: async () => {
    const Tone = await import('tone');
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    set({ isInitialized: false });
  },
}));
