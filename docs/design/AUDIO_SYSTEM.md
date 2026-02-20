# Audio System - Cognitive Dissonance

**Architecture**
- **Tone.js** for all audio on all platforms (Babylon audio engine is disabled).
- **expo-audio** bridge for native iOS/Android integration via `ImmersionAudioBridge`.
- **ImmersionAudioBridge** singleton manages the Tone.js audio graph:
  - `Tone.Reverb` with tension-driven wet (0.3 calm → 0.9 frantic).
  - `Tone.MetalSynth` for mechanical click sounds (keycap depress, lever snap).
  - AudioContext deferred to first user gesture (Enter to start game).

**Spatial Audio**
- All SFX positioned in 3D space relative to their source mesh.
- Panner node tracks mesh world position per frame.
- AR mode: spatial audio matches real-world anchor position.

**Seed-Driven Evolution**
- BPM, swing, and root note derived from buried seed.
- Deterministic audio evolution ensures identical sound for identical seeds.
- Sequences change with Dream archetype.

**Tension Ramps**
- **Calm (0.0--0.3)**: Low drone, slow LFO modulation, reverb wet 0.3.
- **Uneasy (0.3--0.6)**: Percussive layers emerge, swing increases, reverb wet 0.48.
- **Panic (0.6--0.9)**: Frantic glitch percussion, pitch-shifted drones, reverb wet 0.66.
- **Shatter (0.999)**: Massive reverb tail into silence.

**Brown Noise Corruption Static**
- `Tone.Noise('brown')` connected through `Tone.Filter` (lowpass 400 Hz).
- Volume ramps with tension: -60 dB (calm) → -18 dB (frantic).
- Provides sub-bass "feel" as tactile audio haptics on all platforms.
- Acts as a secondary feedback channel alongside visual corruption.

**Procedural SFX**
- Keycap emerge: Metallic slide + gear grind (synthesized via MetalSynth).
- Tendril retraction: Tonal sweep downward.
- Enemy spawn: Distorted ping with spatial positioning.
- Sphere shatter: Layered glass break + massive reverb tail.
- Boss phases: Progressive distortion layers.
- Mechanical click: MetalSynth with envelope (attack 0.001, decay 0.08, release 0.01).

**expo-audio Bridge (Native)**
- expo-audio v14+ (Expo SDK 55) handles AudioContext bridging automatically on iOS/Android.
- Tone.js audio graph runs identically on web and native via the bridge.
- AudioContext resume deferred to first user gesture (Enter key in start-game choreography).
- `ImmersionAudioBridge.resumeOnUserGesture()` called from GameBootstrap's start-game GSAP timeline.

**Key Files**
- `src/audio/ImmersionAudioBridge.ts` — Tone.js reverb + MetalSynth + tension-driven wet
- `src/audio/SpatialAudioManager.ts` — Event-driven 3D-positioned procedural SFX
- `src/store/game-store.ts` — Phase transitions that trigger audio state changes

**Implementation Notes**
- AudioContext requires user gesture on web — `resumeOnUserGesture()` called from first Enter key press in start-game choreography.
- On native, expo-audio v14+ (Expo SDK 55) handles AudioContext bridging automatically.
- Reverb impulse response generated during initialization (works even while context is suspended).
