# Design Vision — Cognitive Dissonance v2

> Full design corpus in `docs/memory-bank/grok-doc/`. Start with `main-conversation/INDEX.md`.
> For the definitive memory bank, see `docs/memory-bank/`.

## Core Vision

You are holding a fragile glass AI mind together as its own thoughts try to escape.

## Visual Composition

The player sees a heavy industrial black metal platter lying flat, with a transparent glass sphere sitting in a recessed circular track at center. Inside the sphere, a celestial nebula shader evolves from calm blue through yellows/greens to violent reds as tension rises. Around the platter rim, mechanical keycaps emerge through garage-door slits with satisfying GSAP animations.

```
┌─────────────────────────────────────────────┐
│                                             │
│         (enemies descend from above)        │
│                                             │
│              ┌───────────┐                  │
│              │  Glass AI  │                  │
│              │  Sphere    │                  │
│              └─────┬─────┘                  │
│     ┌──────────────┴──────────────┐         │
│     │  Heavy Industrial Platter    │         │
│     │  (keycaps emerge from rim)   │         │
│     └──────────────────────────────┘         │
│                                             │
└─────────────────────────────────────────────┘
```

## Key Visual Elements

- **Glass Sphere**: PBR glass (IOR 1.52, thin-film interference, refraction). Diameter 52cm. Degrades with tension: roughness increases, alpha decreases, jitter/shake ramps up.
- **Celestial Nebula Shader**: fbm noise + fresnel glow. Colors lerp from calm blue (#082f49 / #7dd3fc) to violent red (#9f1239 / #ef4444) driven by tension 0-1.
- **Industrial Platter**: Black metal (metallic 0.92, roughness 0.28). Thick rim (18cm+). Rotates slowly on Y axis only. Recessed track holds sphere.
- **Garage-Door Keycaps**: Split horizontal slit, top slides up, bottom slides down. GSAP CustomEase ("heavyMechanical") with stagger, gear wobble, dust particles on open.
- **Enemy Shaders**: Neon-raymarcher (holographic green SDF boxes) for normal enemies. Crystalline cube (IQ palette + sine displacement) for bosses. Both on billboard quads.
- **Post-Process Corruption**: Chromatic aberration, film noise, vignette, scanlines — all ramp with tension.
- **Diegetic GUI**: Coherence ring (torus) etched into platter surface, glows brighter with coherence.

## What This Is NOT

- Not low-poly, not retro, not cartoonish
- No external 3D model imports — everything is procedural
- No traditional HUD — all feedback through the machine itself
- No "Game Over" text — it is "COGNITION SHATTERED"

## Design Pivots (Historical)

See `docs/memory-bank/design-decisions.md` for the full rationale behind:
1. Glass sphere replacing NS-5 android bust
2. Pattern stabilization replacing Missile Command
3. Buried seed replacing visible seed
4. Diegetic interface replacing HUD
