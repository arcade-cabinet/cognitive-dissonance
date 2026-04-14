/**
 * Audio engine — Tone.js driven by Koota tension.
 *
 * Must be lazy-initialized on the first user gesture (browsers require a
 * user interaction before audio-context starts). The initialize() helper
 * is idempotent; call from any pointer/keydown/touchstart handler.
 *
 * The graph is minimal on purpose — we ship the essentials and tune by ear:
 *   - droneSynth: sustained low-frequency triangle, the "engine hum"
 *   - padFilter + pads: duochord pads that swell with tension
 *   - glitchNoise + glitchEnv: white-noise bursts gated by an LFO,
 *     density scales with tension — the "corruption" sound
 *   - chimes: a sparse arpeggio that drops notes as tension rises
 *     (communicating "the machine is losing the melody")
 *
 * Four stems map to the 4 tension bands:
 *   calm      (0.0–0.3)  drone + pads, no glitch, full chimes
 *   warn      (0.3–0.6)  drone + pads hotter, chimes dropping
 *   danger    (0.6–0.85) drone + pads + glitch active, chimes chaotic
 *   collapse  (0.85–1.0) all layers max + dedicated collapse stem on top
 *
 * The collapse stem is two voices that gate in only above tension 0.85:
 *   - subPulse: a low sine sub-bass that thumps at the drone's fundamental
 *     octave, growing in volume as we approach 1.0
 *   - hiSweep: a filtered noise sweep whose filter frequency tracks tension
 *     in the 0.85–1.0 band, giving a "the cabinet is straining" wash
 * Both are at zero gain below the threshold, ramped in linearly above it,
 * and torn down on dispose.
 */

import type { World } from 'koota';
import * as Tone from 'tone';
import { Audio, Level } from '@/sim/world';

export interface AudioEngine {
  /** Lazy-initialize Tone.js. Safe to call multiple times. */
  initialize(): Promise<void>;
  /** Teardown — call before page unload. */
  dispose(): void;
}

export function createAudioEngine(world: World): AudioEngine {
  let masterGain: Tone.Gain | null = null;
  let drone: Tone.Oscillator | null = null;
  let padFilter: Tone.Filter | null = null;
  let pads: Tone.PolySynth | null = null;
  let glitchFilter: Tone.Filter | null = null;
  let glitchNoise: Tone.Noise | null = null;
  let glitchEnv: Tone.AmplitudeEnvelope | null = null;
  let chimes: Tone.PolySynth | null = null;
  let loop: Tone.Loop | null = null;
  // Collapse stem (tension > 0.85) — sub-bass pulse + filtered noise sweep.
  let collapseGain: Tone.Gain | null = null;
  let subPulse: Tone.Oscillator | null = null;
  let subTremolo: Tone.LFO | null = null;
  let subTremoloGain: Tone.Gain | null = null;
  let hiSweepFilter: Tone.Filter | null = null;
  let hiSweepNoise: Tone.Noise | null = null;
  let frame: number | null = null;

  // Threshold above which collapse layer becomes audible. Below = silent.
  const COLLAPSE_THRESHOLD = 0.85;

  async function initialize(): Promise<void> {
    if (world.get(Audio)?.isInitialized) return;
    await Tone.start();

    masterGain = new Tone.Gain(0.55).toDestination();

    // Drone — constant low hum, pitch bends slightly with tension.
    drone = new Tone.Oscillator({ frequency: 48, type: 'triangle', volume: -22 });
    drone.connect(masterGain);
    drone.start();

    // Pads — two-voice polyphonic sustained chord.
    padFilter = new Tone.Filter({ frequency: 800, type: 'lowpass', Q: 2 });
    padFilter.connect(masterGain);
    pads = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 2, decay: 1, sustain: 0.7, release: 3 },
      volume: -18,
    });
    pads.maxPolyphony = 6;
    pads.connect(padFilter);
    pads.triggerAttack(['C2', 'G2', 'Eb3']);

    // Glitch — noise gated by an envelope, fires on a loop with randomized gaps.
    glitchFilter = new Tone.Filter({ frequency: 2400, type: 'bandpass', Q: 4 });
    glitchFilter.connect(masterGain);
    glitchNoise = new Tone.Noise('pink');
    glitchEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.06, sustain: 0, release: 0.08 });
    glitchNoise.chain(glitchEnv, glitchFilter);
    glitchNoise.start();

    // Chimes — a polysynth that plays a rotating pentatonic pattern.
    chimes = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.1, release: 0.4 },
      volume: -12,
    });
    chimes.maxPolyphony = 8;
    chimes.connect(masterGain);

    const pentatonic = ['C5', 'Eb5', 'G5', 'Bb5', 'C6'];
    let step = 0;
    loop = new Tone.Loop((time) => {
      const tension = world.get(Level)?.tension ?? 0;
      // Note density: 1 note per 4 beats at calm, 1 per 12 at crisis.
      // Calm = steady, crisis = sparse (the melody losing the plot).
      const playChance = 0.35 * (1 - tension * 0.85);
      if (Math.random() < playChance) {
        const noteIdx = (step + (Math.random() < tension ? Math.floor(Math.random() * 3) : 0)) % pentatonic.length;
        chimes?.triggerAttackRelease(pentatonic[noteIdx], '16n', time);
      }
      step = (step + 1) % 16;
    }, '4n');
    loop.start(0);

    // Collapse stem — silent until tension crosses COLLAPSE_THRESHOLD,
    // then ramped in by the per-frame tick. A dedicated gain node lets us
    // mute the entire layer cheaply when tension drops back.
    collapseGain = new Tone.Gain(0).connect(masterGain);
    subPulse = new Tone.Oscillator({ frequency: 32, type: 'sine', volume: -8 });
    // Slow tremolo on the sub so it pulses like a labored heartbeat.
    subTremolo = new Tone.LFO({ frequency: 1.4, min: 0.4, max: 1.0 }).start();
    subTremoloGain = new Tone.Gain(0).connect(collapseGain);
    subTremolo.connect(subTremoloGain.gain);
    subPulse.connect(subTremoloGain);
    subPulse.start();

    hiSweepFilter = new Tone.Filter({ frequency: 1200, type: 'bandpass', Q: 6 }).connect(collapseGain);
    hiSweepNoise = new Tone.Noise({ type: 'white', volume: -16 });
    hiSweepNoise.connect(hiSweepFilter);
    hiSweepNoise.start();

    Tone.getTransport().start();

    // Per-frame parameter drive. Runs from rAF, not Tone's transport.
    function tick(): void {
      const tension = world.get(Level)?.tension ?? 0;

      if (drone) {
        // Pitch bends up slightly with tension — 48Hz calm → 56Hz crisis.
        drone.frequency.rampTo(48 + tension * 8, 0.1);
        drone.volume.rampTo(-22 + tension * 4, 0.1);
      }
      if (padFilter) {
        // Filter opens up as tension rises — more "brightness" in the pads.
        padFilter.frequency.rampTo(800 + tension * 2400, 0.1);
      }
      if (glitchFilter) {
        glitchFilter.frequency.rampTo(800 + tension * 3000, 0.1);
      }
      if (glitchEnv) {
        // Fire glitch envelopes more often as tension climbs.
        if (Math.random() < tension * 0.12) {
          glitchEnv.triggerAttackRelease(0.05 + Math.random() * 0.1);
        }
      }
      if (masterGain) {
        masterGain.gain.rampTo(0.4 + tension * 0.4, 0.1);
      }

      // Collapse stem — silent below threshold, ramps in 0→1 across the
      // 0.85–1.0 band, drives the noise sweep filter higher as we approach 1.
      if (collapseGain) {
        const t = Math.max(0, (tension - COLLAPSE_THRESHOLD) / (1 - COLLAPSE_THRESHOLD));
        collapseGain.gain.rampTo(t * 0.6, 0.1);
        if (hiSweepFilter) {
          hiSweepFilter.frequency.rampTo(800 + t * 4800, 0.15);
        }
      }

      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    world.set(Audio, (prev) => ({ ...prev, isInitialized: true }));
  }

  function dispose(): void {
    if (frame !== null) cancelAnimationFrame(frame);
    loop?.dispose();
    chimes?.dispose();
    glitchEnv?.dispose();
    glitchNoise?.dispose();
    glitchFilter?.dispose();
    pads?.dispose();
    padFilter?.dispose();
    drone?.dispose();
    hiSweepNoise?.dispose();
    hiSweepFilter?.dispose();
    subPulse?.dispose();
    subTremolo?.dispose();
    subTremoloGain?.dispose();
    collapseGain?.dispose();
    masterGain?.dispose();
    try {
      Tone.getTransport().stop();
    } catch {
      // Transport may already be stopped.
    }
    world.set(Audio, (prev) => ({ ...prev, isInitialized: false }));
  }

  return { initialize, dispose };
}

/**
 * Wire first-gesture listeners that kick off audio. Removes themselves
 * after the first successful init so subsequent gestures are free.
 */
export function mountFirstGestureAudio(engine: AudioEngine): () => void {
  let unmounted = false;

  async function kick(): Promise<void> {
    if (unmounted) return;
    await engine.initialize();
    detach();
  }

  function detach(): void {
    unmounted = true;
    window.removeEventListener('pointerdown', kick);
    window.removeEventListener('keydown', kick);
    window.removeEventListener('touchstart', kick);
  }

  window.addEventListener('pointerdown', kick, { passive: true });
  window.addEventListener('keydown', kick);
  window.addEventListener('touchstart', kick, { passive: true });

  return detach;
}
