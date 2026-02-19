# Product — Cognitive Dissonance v3.0

Cognitive Dissonance is a cross-platform (web + Android + iOS) interactive 3D experience where you hold a fragile glass AI mind together as its own thoughts try to escape. Built with Reactylon Native + Babylon.js 8, dual AR/MR play modes, Miniplex ECS, and procedural generation driven by a buried deterministic seed.

## Core Loop

1. A glass sphere with a celestial nebula shader sits on a heavy industrial platter.
2. Colored corruption tendrils (SolidParticleSystem) escape from the sphere center toward the rim.
3. Hold matching colored keycaps on the platter rim to pull tendrils back and reduce tension.
4. Missed patterns spawn procedural morph-based Yuka AI enemies with 7 distinct behavioral traits.
5. Enemies reaching the sphere cause tension spikes and glass degradation.
6. At tension 0.999 the sphere shatters into 64 glass shards → "COGNITION SHATTERED" → game over.
7. Endless mode with logarithmic difficulty scaling. High replay value from the buried seed.

## Key Concepts

- **Buried Seed**: A deterministic seed (mulberry32 PRNG) drives ALL procedural generation — patterns, enemies, audio, difficulty curves, level archetypes.
- **Level Archetypes (Dreams)**: Each run selects one of 4 fundamentally different gameplay modes via `seedHash % 4`:
  - PlatterRotationDream: platter physically rotates, keycaps orbit, timed holds in 90° reach zone
  - LeverTensionDream: MODE_LEVER is primary input, frequency matching, rhythmic slit cycles
  - KeySequenceDream: ordered multi-key sequences (2–5 keys), ghost highlights, time windows
  - CrystallineCubeBossDream: immediate boss encounter, dual lever+keycap counter, 3 slam cycles
- **Tension System**: 0.0–0.999 float with over-stabilization rebound (2% chance of +0.12 below 0.05). Propagates to audio, visuals, enemies, difficulty.
- **Moment of Clarity**: At 100% coherence, a brief calm respite before coherence drops sharply. No win state.
- **Garage-Door Keycaps**: Mechanical keycaps emerge from platter rim via GSAP MotionPath animations.
- **Symmetric Titles**: "COGNITIVE DISSONANCE" (start) → "COGNITION SHATTERED" (game over).
- **Diegetic GUI**: Zero HUD. Coherence displayed as a glowing arc ring on the platter. Titles engraved on platter/sphere.
- **Dual AR/MR Modes**: Glasses room-scale (platter anchored to real surface, 26-joint hand tracking) or phone camera projection (tap-to-place, touch controls). MODE_LEVER switches between them.
- **7 Enemy Morph Traits**: NeonRaymarcher, TendrilBinder, PlatterCrusher, GlassShatterer, EchoRepeater, LeverSnatcher, SphereCorruptor — each with unique vertex morph and Yuka AI behavior.
- **Crystalline-Cube Boss**: 5-phase GSAP world-crush timeline, AR-anchored above platter, counter via grip strength.
- **Logarithmic Difficulty Scaling**: `baseValue * (1 + k * Math.log1p(tension * timeScale))` — endless progression, asymptotic ceilings, seed-derived ±20% variance per Dream.
- **Echo System**: Missed patterns replay as ghostly echoes (+0.035 tension), one active echo per key max.
- **Mechanical Degradation**: WebGL2 fallback shows diegetic platter degradation (cracks, jitter, lever resistance) — never changes sphere visuals.
