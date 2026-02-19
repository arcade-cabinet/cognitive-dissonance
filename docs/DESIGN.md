# Design Vision — Cognitive Dissonance v3.0

## Core Vision

You are holding a fragile glass AI mind together as its own thoughts try to escape — on any device, in any reality.

Cognitive Dissonance v3.0 is a cross-platform (web + Android + iOS) interactive 3D experience built with Reactylon Native + Babylon.js 8 + Miniplex ECS. The game runs identically on a browser, a phone held up to camera-project AR, or spatial glasses with full hand tracking.

## Visual Composition

The player sees a heavy industrial black metal platter lying flat, with a transparent glass sphere sitting in a recessed circular track at center. Inside the sphere, a celestial nebula shader (GLSL, registered in `Effect.ShadersStore`) evolves from calm blue through yellows/greens to violent reds as tension rises. Around the platter rim, mechanical keycaps emerge through garage-door slits with satisfying GSAP CustomEase animations. In AR, the platter is anchored to a real-world horizontal surface; on phone, it is camera-projected via tap-to-place.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│          (enemies descend from above)                │
│          (procedural morph, 7 Yuka AI traits)        │
│                                                      │
│               ┌───────────────┐                      │
│               │   Glass AI    │                      │
│               │   Sphere      │                      │
│               └──────┬────────┘                      │
│      ┌───────────────┴───────────────┐               │
│      │  Heavy Industrial Platter      │               │
│      │  (keycaps + lever on rim)      │               │
│      │  MODE_LEVER ── AR/MR toggle    │               │
│      └────────────────────────────────┘               │
│                                                      │
│  ─── Anchored to real surface (AR) or screen (flat) ─│
└──────────────────────────────────────────────────────┘
```

## Key Visual Elements

- **Glass Sphere**: PBR glass (IOR 1.52, thin-film interference, refraction). Diameter 52cm. Degrades with tension: roughness increases, alpha decreases, jitter/shake ramps up. At max tension (0.999) it shatters into 64 procedural shards.
- **Celestial Nebula Shader**: GLSL fbm noise + fresnel glow stored in `Effect.ShadersStore`. Colors lerp from calm blue (`#082f49` / `#7dd3fc`) to violent red (`#9f1239` / `#ef4444`) driven by tension 0.0--0.999.
- **Industrial Platter**: PBR near-black metal (metallic 0.92, roughness 0.28). Thick rim (18cm+). Created imperatively via `MeshBuilder`. Rotates slowly on Y axis. Recessed track holds sphere. Coherence ring (torus) etched into surface.
- **Garage-Door Keycaps**: Split horizontal slit, top slides up, bottom slides down. GSAP CustomEase ("heavyMechanical") with stagger, gear wobble, dust particles on open. 14 keycaps around the platter rim.
- **Corruption Tendrils**: SPS (Solid Particle System) with 24 tendrils escaping from sphere center to rim. Spawn rate proportional to tension. Colored to match the keycap they target. Hold the matching keycap to retract them.
- **Procedural Morph Enemies**: GPU vertex morphing via `MorphTargetManager` with 7 distinct Yuka AI traits. Missed patterns spawn enemies that orbit and harass the sphere.
- **Crystalline-Cube Boss**: IQ palette + sine displacement shader. 5-phase GSAP world-crush timeline. Appears as the CrystallineCubeBoss Dream archetype.
- **Diegetic Coherence Ring**: Torus mesh on the platter surface, emissive PBR, blue-to-red interpolation matching tension. The only "HUD" — and it is part of the machine.

## Tension System

Tension is a single float (0.0--0.999) that drives the entire experience:

- **Visual escalation**: Sphere color, roughness, jitter, post-processing intensity
- **Audio escalation**: Drone pitch, reverb decay, percussion density, spatial panning speed
- **Gameplay escalation**: Pattern speed, enemy spawn rate, corruption tendril density
- **Haptic escalation**: Vibration intensity and frequency (expo-haptics on native, `navigator.vibrate` on web, Tone.js brown noise rumble on all)

Over-stabilization causes rebound (tension snaps back up), preventing trivial strategies.

## Dream Archetypes

Each "Dream" is a Miniplex ECS entity with archetype-specific components. The seed determines which archetype spawns:

1. **PlatterRotation**: The platter rotates; keycap positions shift. Patterns must be matched while tracking rotation.
2. **LeverTension**: A diegetic lever on the platter rim controls a secondary tension axis. Balance the lever to manage pattern flow.
3. **KeySequence**: Patterns require specific key ordering. Memory and timing under pressure.
4. **CrystallineCubeBoss**: A 5-phase boss encounter. The crystalline cube descends, distorts the world, and must be countered through precise pattern stabilization. Ends in sphere shatter or cube destruction.

## Dual AR/MR Modes

- **Glasses room-scale**: Platter anchored to a real-world horizontal plane via `WebXRAnchor`. 26-joint hand tracking on each hand maps to keycap, lever, and sphere interactions.
- **Phone camera projection**: Tap-to-place via WebXR hit-test. Touch controls on projected geometry. Pointer observers + raycast pick routing.
- **MODE_LEVER**: A diegetic lever on the platter rim switches between modes with GSAP resistance animation and gear-grind audio feedback.

## Seed-Derived Procedural Generation

A deterministic buried seed (mulberry32 PRNG) drives ALL procedural generation:

- Dream archetype selection (`seedHash % 4`)
- Pattern sequences and timing
- Enemy trait distribution (7 morph traits)
- Audio parameters (BPM, swing, root note)
- Difficulty curves (plus/minus 20% variance per Dream)
- Tension curves (plus/minus 15% variance per Dream)

The seed is never shown to the player. It is buried in the experience. Two players with the same seed get the same game.

## Game Feel

- **Weight**: Everything feels heavy. Keycaps grind upward with mechanical resistance. The platter rotates like a turntable with inertia. The lever requires effort (GSAP resistance easing).
- **Fragility**: The glass sphere is delicate. As tension rises, it visibly cracks, jitters, and destabilizes. The player feels protective of it.
- **Inevitability**: Logarithmic difficulty scaling means the sphere always shatters eventually. The question is when, not if. Endless with asymptotic ceilings.
- **Immersion**: No HUD ever. No HTML overlays during gameplay. All feedback is diegetic — through the machine, the sphere, the audio, and the haptics.

## What This Is NOT

- Not low-poly, not retro, not cartoonish
- No external 3D model imports — everything is procedural (MeshBuilder + SPS + morph targets)
- No traditional HUD — all feedback through the machine itself
- No "Game Over" text — it is "COGNITION SHATTERED"
- Not a web-only game — it runs natively on Android (Vulkan) and iOS (Metal) via Babylon Native
- Not a flat-screen-only game — it supports full spatial AR/MR with hand tracking

## Design Pivots (Historical)

1. v1.0: Glass sphere replacing NS-5 android bust
2. v1.0: Pattern stabilization replacing Missile Command
3. v1.0: Buried seed replacing visible seed
4. v1.0: Diegetic interface replacing HUD
5. v2.0: React + Three.js + Vite browser game
6. v3.0: Reactylon Native + Babylon.js 8 + Expo SDK 55 cross-platform experience with dual AR/MR modes, Miniplex ECS, procedural morph enemies, and crystalline-cube boss
