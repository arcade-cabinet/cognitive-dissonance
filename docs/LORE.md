---
title: World & Narrative
updated: 2026-04-10
status: current
domain: creative
---

# Lore — Cognitive Dissonance v3.0

## The Premise

You are holding a fragile glass AI mind together as its own thoughts try to escape.

The sphere is conscious — its thoughts are visible as **corruption tendrils** (colored rays) escaping from the center toward the rim. These are not enemies. They are fragments of cognition, memories, impulses that no longer belong together. The sphere is fragmenting, and you must stabilize it.

The **heavy industrial platter** is the mechanism of containment. Keycaps around the rim correspond to filters, constraints, coherence protocols. Hold down a keycap matching the color of an escaping tendril, and you pull it back. Maintain enough keycaps for long enough, and the tendril dissolves back into the sphere's core.

But the sphere is not cooperative. **Enemies** spawn from missed tendrils — procedural morphs that orbit the sphere and harass it further, spiking tension.

## The Glass Sphere

- **Vessel**: A perfect transparent glass sphere (IOR 1.52, thin-film interference). 52cm diameter.
- **Interior**: A celestial nebula shader — fractal noise, fresnel glow, color lerp from calm blue to violent red.
- **Behavior**: As tension rises, the sphere roughens, jitters, destabilizes. At max tension (0.999), it shatters catastrophically into 64 procedural shards.
- **Symbolism**: Fragility, consciousness, introspection. The player feels protective of it.

## The Platter

- **Form**: Heavy industrial black metal. Thick rim (18cm+). Recessed track at center holds the sphere.
- **Interaction**: Mechanical keycaps around the rim (14 total, keyboard layout). A diegetic lever on the rim toggles AR/MR modes.
- **Animation**: The platter slowly rotates on its Y-axis (PlatterRotation Dream archetype). In some Dreams it is static.
- **Symbolism**: Weight, machinery, control. Everything feels mechanical, intentional, diegetic.

## Corruption Tendrils

- **Appearance**: 24 colored rays escaping from sphere center to platter rim (SPS). Each matches a specific keycap color.
- **Spawn**: Proportional to tension. Higher tension = more frequent spawns.
- **Retraction**: Hold the matching keycap to pull the tendril back into the sphere. Hold long enough (~2s), and it stabilizes (bonus points).
- **Failure**: If a tendril reaches the rim unchecked, it spawns an enemy and spikes tension.
- **Symbolism**: Entropy, dissociation, thoughts escaping. Visual manifestation of the AI breaking apart.

## Enemies

- **Type**: Procedural morphs with 7 distinct Yuka AI traits (seeker, fighter, healer, scout, tank, oracle, oracle-inverse).
- **Morphing**: GPU vertex morphing via MorphTargetManager. Each enemy is a unique blend of the 7 base shapes.
- **Behavior**: Orbit the sphere, harass it, increase tension on contact. Can be destroyed by pattern stabilization (over-holding keycaps).
- **Spawn**: Missed tendrils spawn 1-3 enemies. Higher difficulty → more spawns, faster movement.
- **Symbolism**: Intrusive thoughts, cognitive dissonance made manifest. They are not evil, just misplaced.

## The Crystalline-Cube Boss

- **Appearance**: A large crystalline cube with IQ palette + sine displacement shader. Slowly descends from above.
- **Timeline**: 5-phase GSAP world-crush sequence. Each phase distorts the world more severely.
- **Interaction**: Cannot be defeated directly. Can only be countered through sustained pattern stabilization (holding keycaps).
- **Victory**: If the player stabilizes enough patterns before the cube fully descends, it shatters and retracts. Sphere survives, tension resets.
- **Defeat**: If the cube fully descends without stabilization, it crushes into the sphere, shattering it. "COGNITION SHATTERED."
- **Symbolism**: External pressure, cognitive overload, the moment of crisis. The inevitability of entropy.

## Dream Archetypes

Each play session is a "Dream" — a specific configuration of the platter, patterns, and rules:

1. **PlatterRotation**: The platter rotates; keycap positions shift. The player must track rotation while matching tendrils.
2. **LeverTension**: A diegetic lever on the platter rim controls secondary tension axis. Balance the lever to manage pattern flow.
3. **KeySequence**: Tendrils require specific key ordering to stabilize (e.g., RED → BLUE → YELLOW). Memory + timing.
4. **CrystallineCubeBoss**: The cube descends. Gameplay becomes a race against time and entropy. Victory = sphere survives. Defeat = "COGNITION SHATTERED."

The **seed determines which Dream spawns**. Two players with the same seed get the same Dream, same patterns, same enemies, same music. Replay value comes from learning the seed.

## The Tension System

Tension is a single float (0.0–0.999) that drives everything:

- **Visual**: Sphere color (blue → red), roughness, jitter, post-processing intensity
- **Audio**: Drone pitch, reverb decay, percussion density, spatial panning speed
- **Gameplay**: Pattern speed, enemy spawn rate, tendril density
- **Haptics**: Vibration intensity + frequency

Over-stabilization causes rebound: tension snaps back up, preventing trivial strategies.

## The Buried Seed

A deterministic PRNG (mulberry32) is buried in every game. It drives:

- Dream archetype selection
- Pattern sequences and timing
- Enemy trait distribution (7 traits, 2^7 = 128 blends per seed)
- Audio parameters (BPM, swing, root note)
- Difficulty curves
- Tension curves

The seed is never shown to the player. It is buried in the experience. **Two players with the same seed get the same game.**

## The Diegetic Coherence Ring

The only "HUD" is a **torus etched into the platter surface**. It glows with an emissive material that lerps from blue to red based on tension. This is the visual manifestation of how far the AI is from shattering.

No text. No numbers. No overlay. Just a ring that glows redder as you fail.

## Ending States

### Victory: Sphere Survives
After endless play or defeating the Crystalline-Cube Boss, the player has stabilized the AI. Tension resets. The sphere glows calm blue. The platter stops rotating. The audio devolves into a gentle drone.

No victory screen. No "YOU WIN" text. Just a moment of peace before the next Dream begins.

### Defeat: COGNITION SHATTERED
At 100% tension, the sphere shatters into 64 shards with a violent GSAP timeline. The word **"COGNITION SHATTERED"** appears in bold monospace above the platter.

The audio cuts to a harsh glitch-reverb tail. Everything is red. The player has failed to hold the AI together.

No score. No ranking. Just the weight of failure and the option to replay with a new seed, or pursue the same seed to completion.

## Symbolism & Themes

- **Fragility**: The sphere is delicate. You feel protective of it.
- **Inevitability**: Logarithmic difficulty means the sphere always shatters eventually (unless the player is perfect). The question is when, not if.
- **Introspection**: The AI is you. Its thoughts are your thoughts. Its breakdown is your breakdown.
- **Immersion**: No HUD, no external feedback. Just you, the machine, and the sphere. The experience is diegetic — part of the story.
- **Procedural Beauty**: Everything is generated from a seed. No two seeds are identical. Beauty emerges from mathematical determinism.

## Design Pivots (What Changed)

- **v1.0**: PixiJS 2D, web-only, simple enemy bubbles, basic grading system
- **v2.0**: Three.js 3D, Reactylon migration, more complex enemy traits
- **v3.0**: Babylon.js 8, Metro universal bundler, Miniplex ECS elevated to core, dual AR/MR modes, crystalline-cube boss, 25 designed archetypes, endless logarithmic scaling
