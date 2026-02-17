/**
 * Adaptive Music System using Tone.js
 *
 * Provides a playful chiptune soundtrack that smoothly transitions
 * from organized/calm at low panic to frantic/chaotic at high panic.
 * Wave progression adds layers and intensity.
 */

import * as Tone from 'tone';

// Musical scales
const CALM_NOTES = ['C4', 'E4', 'G4', 'A4', 'C5', 'E5']; // C major pentatonic-ish
const TENSE_NOTES = ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5']; // C minor
const PANIC_NOTES = ['C4', 'Db4', 'E4', 'F#4', 'G4', 'Bb4', 'B4', 'C5']; // Chromatic tension

const BASS_CALM = ['C2', 'C2', 'G2', 'G2', 'A2', 'A2', 'F2', 'F2'];
const BASS_TENSE = ['C2', 'Eb2', 'F2', 'G2', 'Ab2', 'G2', 'F2', 'Eb2'];
const BASS_PANIC = ['C2', 'C2', 'Db2', 'C2', 'B1', 'C2', 'Eb2', 'C2'];

export class AdaptiveMusic {
  private bassSynth: Tone.MonoSynth | null = null;
  private leadSynth: Tone.PolySynth | null = null;
  private arpSynth: Tone.MonoSynth | null = null;
  private kickSynth: Tone.MembraneSynth | null = null;
  private hihatSynth: Tone.NoiseSynth | null = null;

  private bassLoop: Tone.Loop | null = null;
  private melodyLoop: Tone.Loop | null = null;
  private arpLoop: Tone.Loop | null = null;
  private kickLoop: Tone.Loop | null = null;
  private hihatLoop: Tone.Loop | null = null;

  private masterGain: Tone.Gain | null = null;
  private reverbSend: Tone.Reverb | null = null;
  private distortion: Tone.Distortion | null = null;

  private initialized = false;
  private playing = false;
  private panic = 0;
  private wave = 0;
  private beatIndex = 0;
  private arpIndex = 0;

  async init(): Promise<void> {
    if (this.initialized) return;

    // Master volume → distortion → destination
    this.distortion = new Tone.Distortion({ distortion: 0, wet: 0 });
    this.distortion.toDestination();

    this.masterGain = new Tone.Gain(0.25);
    this.masterGain.connect(this.distortion);

    // Effects
    this.reverbSend = new Tone.Reverb({ decay: 1.5, wet: 0.2 });
    this.reverbSend.connect(this.masterGain);

    // Bass synth - warm triangle/square
    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.1 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.2,
        baseFrequency: 200,
        octaves: 2,
      },
    });
    this.bassSynth.volume.value = -8;
    this.bassSynth.connect(this.masterGain);

    // Lead synth - playful square wave
    this.leadSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.1 },
    });
    this.leadSynth.volume.value = -16;
    this.leadSynth.connect(this.reverbSend);

    // Arp synth - high pitched, playful
    this.arpSynth = new Tone.MonoSynth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 },
    });
    this.arpSynth.volume.value = -20;
    this.arpSynth.connect(this.reverbSend);

    // Kick - membrane synth for retro feel
    this.kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    });
    this.kickSynth.volume.value = -10;
    this.kickSynth.connect(this.masterGain);

    // Hi-hat - noise synth
    this.hihatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    });
    this.hihatSynth.volume.value = -22;
    this.hihatSynth.connect(this.masterGain);

    this.initialized = true;
  }

  /**
   * Start the adaptive soundtrack for a given wave
   */
  start(wave: number): void {
    if (!this.initialized) return;
    this.stop();
    this.wave = wave;
    this.beatIndex = 0;
    this.arpIndex = 0;

    // Set initial tempo based on wave
    const baseBPM = 120 + wave * 8;
    Tone.getTransport().bpm.value = baseBPM;

    this.setupLoops();
    Tone.getTransport().start();
    this.playing = true;
  }

  /**
   * Stop all music
   */
  stop(): void {
    if (!this.playing) return;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();

    this.bassLoop?.dispose();
    this.melodyLoop?.dispose();
    this.arpLoop?.dispose();
    this.kickLoop?.dispose();
    this.hihatLoop?.dispose();

    this.bassLoop = null;
    this.melodyLoop = null;
    this.arpLoop = null;
    this.kickLoop = null;
    this.hihatLoop = null;

    this.playing = false;
  }

  /**
   * Update panic level (0-100) - called every frame
   * Smoothly morphs the music characteristics
   */
  setPanic(panic: number): void {
    if (!this.playing || !this.initialized) return;
    this.panic = Math.max(0, Math.min(100, panic));

    // Smooth BPM changes based on panic
    const baseBPM = 120 + this.wave * 8;
    const panicBPM = baseBPM + this.panic * 0.4;
    Tone.getTransport().bpm.rampTo(panicBPM, 0.5);

    // Distortion increases with panic
    if (this.distortion) {
      this.distortion.distortion = this.panic > 60 ? (this.panic - 60) / 200 : 0;
      this.distortion.wet.value = this.panic > 60 ? (this.panic - 60) / 100 : 0;
    }

    // Bass gets louder and more aggressive
    if (this.bassSynth) {
      this.bassSynth.volume.value = -8 + (this.panic / 100) * 4;
      const bassType = this.panic > 66 ? 'sawtooth' : this.panic > 33 ? 'square' : 'triangle';
      if (this.bassSynth.oscillator.type !== bassType) {
        this.bassSynth.oscillator.type = bassType as Tone.ToneOscillatorType;
      }
    }

    // Lead gets louder and more present at higher panic
    if (this.leadSynth) {
      this.leadSynth.volume.value = -16 + (this.panic / 100) * 6;
    }

    // Arp gets more active
    if (this.arpSynth) {
      this.arpSynth.volume.value = this.panic > 33 ? -20 + (this.panic / 100) * 8 : -40;
    }

    // Hi-hat gets louder
    if (this.hihatSynth) {
      this.hihatSynth.volume.value = -22 + (this.panic / 100) * 6;
    }
  }

  private setupLoops(): void {
    // Bass loop - plays on every beat
    this.bassLoop = new Tone.Loop((time) => {
      if (!this.bassSynth) return;
      const idx = this.beatIndex % 8;
      const notes = this.panic > 66 ? BASS_PANIC : this.panic > 33 ? BASS_TENSE : BASS_CALM;
      this.bassSynth.triggerAttackRelease(notes[idx], '8n', time);
      this.beatIndex++;
    }, '8n');
    this.bassLoop.start(0);

    // Kick on beats 1 and 3
    this.kickLoop = new Tone.Loop((time) => {
      if (!this.kickSynth) return;
      this.kickSynth.triggerAttackRelease('C1', '16n', time);
    }, '4n');
    this.kickLoop.start(0);

    // Hi-hat on every 8th note (gets 16th notes at high panic)
    this.hihatLoop = new Tone.Loop((time) => {
      if (!this.hihatSynth) return;
      this.hihatSynth.triggerAttackRelease('16n', time);
      // Double-time hi-hat at high panic
      if (this.panic > 50) {
        this.hihatSynth.triggerAttackRelease('32n', time + Tone.Time('16n').toSeconds());
      }
    }, '8n');
    this.hihatLoop.start(0);

    // Melody - plays a note every beat, scale depends on panic
    this.melodyLoop = new Tone.Loop((time) => {
      if (!this.leadSynth) return;
      // Only play melody when wave > 0 or panic > 20
      if (this.wave === 0 && this.panic < 20) return;

      const notes = this.panic > 66 ? PANIC_NOTES : this.panic > 33 ? TENSE_NOTES : CALM_NOTES;
      const idx = Math.floor(Math.random() * notes.length);
      // Sometimes skip notes for rhythm variation
      if (Math.random() < 0.7) {
        this.leadSynth.triggerAttackRelease(notes[idx], '16n', time);
      }
    }, '4n');
    this.melodyLoop.start('4n'); // Offset by a quarter note

    // Arp - fast arpeggiation, active at medium+ panic
    this.arpLoop = new Tone.Loop((time) => {
      if (!this.arpSynth || this.panic < 30) return;
      const notes = this.panic > 66 ? PANIC_NOTES : TENSE_NOTES;
      const note = notes[this.arpIndex % notes.length];
      this.arpSynth.triggerAttackRelease(note, '32n', time);
      this.arpIndex++;
    }, '16n');
    this.arpLoop.start(0);
  }

  /**
   * Resume audio context after user interaction
   */
  async resume(): Promise<void> {
    if (Tone.getContext().state === 'suspended') {
      await Tone.start();
    }
  }

  destroy(): void {
    this.stop();
    this.bassSynth?.dispose();
    this.leadSynth?.dispose();
    this.arpSynth?.dispose();
    this.kickSynth?.dispose();
    this.hihatSynth?.dispose();
    this.masterGain?.dispose();
    this.reverbSend?.dispose();
    this.distortion?.dispose();
    this.bassSynth = null;
    this.leadSynth = null;
    this.arpSynth = null;
    this.kickSynth = null;
    this.hihatSynth = null;
    this.masterGain = null;
    this.reverbSend = null;
    this.distortion = null;
    this.initialized = false;
  }
}
