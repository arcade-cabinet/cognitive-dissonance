---
title: Design Vision
updated: 2026-04-13
status: current
domain: product
---

# Design Vision — Cognitive Dissonance v4

> Design vision and visual language for Cognitive Dissonance.

## Core Vision

You are holding a fragile glass AI mind together as its own thoughts try to escape.

## The Cabinet Engine (Architectural North Star)

Cognitive Dissonance is not *a game* — it is a **cabinet engine**. The chassis is fixed: heavy industrial platter, recessed glass AI sphere at centre, machined rim with input slits, overhead sky that rains digital debris. That chassis never changes.

What changes is **what emerges through the rim slits**. Each level declares an *input schema* and the cabinet materialises matching controls:

- Pattern-match level → N colored keycaps
- Push/pull level → paired push-me / pull-me handles
- Sequence level → numbered keys
- Hybrid → any combination

The platter-plus-emergent-controls substrate means any arcade-style mini-game can be expressed as a level. The glass sphere / nebula / tension / sky-rain are shared state across every game. **One cabinet, many games.**

### The Emergence Animation IS the Landing

There is no landing page, no menu, no "New Game / Continue" dialog. The cabinet itself is the menu:

- Boot shows a brief "INITIALIZING CORE" text flash while WebGL warms up (<2s)
- Platter fades in, keycaps rise through rim slits in a staggered mechanical sequence
- *Which* controls emerge tells the player what this level is before the first input is possible
- Pressing any keycap starts the run; the centre keycap pauses

The game uses no UI framework. The entire UX is the three.js scene (one Scene, procedurally populated) plus a single boot overlay that cross-fades out. Browser mouse/keyboard/touch events drive Koota state directly. Diegetic labels on the rim and keycap faces use three-text (SDF glyphs that stay crisp under post-process corruption).

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

Key design pivots from v1 to v2:
1. Glass sphere replacing NS-5 android bust
2. Pattern stabilization replacing Missile Command
3. Buried seed replacing visible seed
4. Diegetic interface replacing HUD
