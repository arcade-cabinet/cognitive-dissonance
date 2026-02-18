'use client';

import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { useAudioStore } from '@/store/audio-store';

/**
 * Spatial Audio — Three procedural Tone.js sound effects:
 *
 * 1. Pattern Escape Whoosh — brown noise burst with filter sweep
 *    Triggered via 'patternEscaped' custom event from pattern-stabilizer.
 *
 * 2. Stabilization Chime — sine synth with reverb, pitch from colorIndex
 *    Triggered via 'patternStabilized' custom event from pattern-stabilizer.
 *
 * 3. Glass Shatter — white noise through highpass with long reverb tail
 *    Triggered via 'sphereShattered' custom event from ai-sphere.
 *
 * All synths are created lazily after Tone.start() (user gesture required).
 * Dynamic import ensures SSR safety.
 */

interface SynthRefs {
  escapeNoise: InstanceType<typeof import('tone').Noise>;
  escapeFilter: InstanceType<typeof import('tone').Filter>;
  escapeEnv: InstanceType<typeof import('tone').AmplitudeEnvelope>;
  chimeSynth: InstanceType<typeof import('tone').Synth>;
  chimeReverb: InstanceType<typeof import('tone').Reverb>;
  shatterNoise: InstanceType<typeof import('tone').Noise>;
  shatterFilter: InstanceType<typeof import('tone').Filter>;
  shatterReverb: InstanceType<typeof import('tone').Reverb>;
  shatterEnv: InstanceType<typeof import('tone').AmplitudeEnvelope>;
}

export default function SpatialAudio() {
  const scene = useScene();
  const synthsRef = useRef<SynthRefs | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!scene) return;
    disposedRef.current = false;

    /**
     * Lazily create all Tone.js synth chains.
     * Only initializes after the audio store confirms Tone.start() has been called.
     */
    const initSynths = async () => {
      const isInit = useAudioStore.getState().isInitialized;
      if (!isInit || synthsRef.current || disposedRef.current) return;

      const Tone = await import('tone');

      // ── 1. Pattern Escape Whoosh ──
      // Brown noise → lowpass filter → amplitude envelope → destination
      // Filter sweeps from 2000Hz→500Hz on each trigger for a descending whoosh
      const escapeFilter = new Tone.Filter(2000, 'lowpass').toDestination();
      const escapeEnv = new Tone.AmplitudeEnvelope({
        attack: 0.01,
        decay: 0.15,
        sustain: 0.1,
        release: 0.2,
      }).connect(escapeFilter);
      const escapeNoise = new Tone.Noise('brown').connect(escapeEnv);
      escapeNoise.volume.value = -12;
      escapeNoise.start();

      // ── 2. Stabilization Chime ──
      // Sine synth → reverb → destination
      // Pitch derived from colorIndex: chromatic scale centered on A4 (440Hz)
      const chimeReverb = new Tone.Reverb(1.5).toDestination();
      await chimeReverb.ready;
      const chimeSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0, release: 0.8 },
        volume: -8,
      }).connect(chimeReverb);

      // ── 3. Glass Shatter ──
      // White noise → highpass filter → reverb (long tail) → amplitude envelope → destination
      const shatterReverb = new Tone.Reverb(4).toDestination();
      await shatterReverb.ready;
      const shatterFilter = new Tone.Filter(8000, 'highpass').connect(shatterReverb);
      const shatterEnv = new Tone.AmplitudeEnvelope({
        attack: 0.005,
        decay: 1.5,
        sustain: 0.3,
        release: 2.0,
      }).connect(shatterFilter);
      const shatterNoise = new Tone.Noise('white').connect(shatterEnv);
      shatterNoise.volume.value = -6;
      shatterNoise.start();

      if (!disposedRef.current) {
        synthsRef.current = {
          escapeNoise,
          escapeFilter,
          escapeEnv,
          chimeSynth,
          chimeReverb,
          shatterNoise,
          shatterFilter,
          shatterReverb,
          shatterEnv,
        };
      }
    };

    // ── Event Handlers ──

    const onPatternEscaped = async () => {
      await initSynths();
      if (!synthsRef.current) return;
      const Tone = await import('tone');
      const { escapeEnv, escapeFilter } = synthsRef.current;
      // Descending filter sweep: 2000 → 500Hz over 0.3s
      escapeFilter.frequency.setValueAtTime(2000, Tone.now());
      escapeFilter.frequency.linearRampToValueAtTime(500, Tone.now() + 0.3);
      escapeEnv.triggerAttackRelease(0.3);
    };

    const onPatternStabilized = async (e: Event) => {
      await initSynths();
      if (!synthsRef.current) return;
      const detail = (e as CustomEvent).detail;
      const colorIndex = detail?.colorIndex ?? 0;
      // Map colorIndex (0-11) to chromatic scale around A4
      const baseFreq = 440;
      const freq = baseFreq * 2 ** ((colorIndex - 6) / 12);
      synthsRef.current.chimeSynth.triggerAttackRelease(freq, 0.15);
    };

    const onSphereShattered = async () => {
      await initSynths();
      if (!synthsRef.current) return;
      synthsRef.current.shatterEnv.triggerAttackRelease(3.0);
    };

    window.addEventListener('patternEscaped', onPatternEscaped);
    window.addEventListener('patternStabilized', onPatternStabilized);
    window.addEventListener('sphereShattered', onSphereShattered);

    // Subscribe to audio store so we initialize synths once Tone is ready
    const unsub = useAudioStore.subscribe((state) => {
      if (state.isInitialized && !synthsRef.current) initSynths();
    });

    return () => {
      disposedRef.current = true;
      window.removeEventListener('patternEscaped', onPatternEscaped);
      window.removeEventListener('patternStabilized', onPatternStabilized);
      window.removeEventListener('sphereShattered', onSphereShattered);
      unsub();

      if (synthsRef.current) {
        const s = synthsRef.current;
        s.escapeNoise.stop();
        s.escapeNoise.dispose();
        s.escapeFilter.dispose();
        s.escapeEnv.dispose();
        s.chimeSynth.dispose();
        s.chimeReverb.dispose();
        s.shatterNoise.stop();
        s.shatterNoise.dispose();
        s.shatterFilter.dispose();
        s.shatterReverb.dispose();
        s.shatterEnv.dispose();
        synthsRef.current = null;
      }
    };
  }, [scene]);

  return null;
}
