// store/audio-store.ts
import { create } from 'zustand'
import * as Tone from 'tone'
import { useSeedStore } from './seed-store'

interface AudioState {
  isInitialized: boolean
  tension: number
  masterGain: Tone.Gain

  initialize: () => Promise<void>
  updateTension: (newTension: number) => void
  shutdown: () => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  isInitialized: false,
  tension: 0.12,
  masterGain: new Tone.Gain(0.85).toDestination(),

  initialize: async () => {
    if (get().isInitialized) return

    await Tone.start()

    const { rng, seedString } = useSeedStore.getState()

    // Seed Tone.js from buried seed for deterministic evolution
    const seededRng = seedrandom(seedString)
    Tone.Transport.bpm.value = 68 + seededRng() * 48
    Tone.Transport.swing = seededRng() * 0.4

    // Layer 1: Deep sub drone (pitch rises with tension)
    const drone = new Tone.Oscillator({ type: 'sine', frequency: 38 }).connect(get().masterGain)
    drone.start()

    // Layer 2: Soft pads (filter opens with tension)
    const padFilter = new Tone.Filter(600, 'lowpass').connect(get().masterGain)
    const pads = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 6, decay: 12, sustain: 0.7, release: 18 }
    }).connect(padFilter)

    // Layer 3: Glitch percussion (rate + distortion increase with tension)
    const glitchNoise = new Tone.Noise('white').connect(new Tone.Filter(6000, 'highpass').connect(get().masterGain))
    const glitchEnv = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.4, sustain: 0, release: 0.2 }).connect(glitchNoise)

    // Layer 4: Metallic chimes (becomes frantic)
    const chimes = new Tone.MetalSynth({
      frequency: 1800,
      envelope: { attack: 0.001, decay: 1.8, release: 4 },
      volume: -14
    }).connect(get().masterGain)

    // Main evolution loop
    const loop = new Tone.Loop((time) => {
      const cur = get().tension

      // Drone pitch
      drone.frequency.value = 38 + cur * 62

      // Pad filter
      padFilter.frequency.value = 600 + cur * 4200

      // Glitch hits
      if (Math.random() < 0.4 + cur * 0.9) {
        glitchEnv.triggerAttackRelease(0.06 + cur * 0.6, time)
      }

      // Chimes become more frequent and detuned
      if (Math.random() < 0.25 + cur * 0.75) {
        chimes.triggerAttackRelease(0.03 + Math.random() * 0.12, time)
        chimes.frequency.value = 800 + Math.random() * 3200 * cur
      }
    }, "4n").start(0)

    Tone.Transport.start()

    set({ isInitialized: true })
  },

  updateTension: (newTension) => {
    set({ tension: newTension })
    Tone.Transport.bpm.value = 68 + newTension * 68
  },

  shutdown: () => {
    Tone.Transport.stop()
    Tone.Transport.cancel()
  }
}))