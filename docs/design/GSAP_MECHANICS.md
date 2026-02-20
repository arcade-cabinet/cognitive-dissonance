# GSAP Mechanics - Cognitive Dissonance

**Core Usage**
- GSAP 3.13+ for all mechanical animations on the platter (garage-door, key/lever emergence, RGB pulsing, dust bursts).
- CustomEase for heavy inertia and settle.
- MotionPath for curved key emergence.
- Flip for state-based transformations.
- Stagger, timeline, labels for precise sequencing.
- All GSAP plugins are now free (Webflow-sponsored), including CustomEase, MotionPath, and Flip.

**Key Techniques**

- **CustomEase "heavyMechanical"**: Registered in `MechanicalAnimationSystem` constructor. Simulates weight and inertia: slow start, momentum build, heavy settle with overshoot. Used for garage-door slit open/close, keycap emergence.

- **Timeline sequencing**: Staggered top/bottom garage-door (top is lighter, starts first; bottom is heavier, starts 0.15s later). Used for the choreographed start-game sequence (PLAY keycap depress → mechanical click → orb roll → playing phase).

- **MotionPath**: Curved parabolic arc for keycap emergence from platter center to rim position. `curviness: 1.2` for organic mechanical feel.

- **Flip**: Smooth state changes for key/lever visibility transitions.

- **Stagger**: Different timing for top/bottom halves to simulate weight difference. Top slit slides up in 1.2s, bottom slides down in 1.4s.

- **back.out ease**: Used for MODE_LEVER pull to simulate spring resistance. `back.out(1.7)` gives a satisfying overshoot-and-settle feel.

**CustomEase Definitions**
```typescript
CustomEase.create('heavyMechanical',
  'M0,0 C0.14,0 0.242,0.438 0.272,0.561 ...');
```

**Integration**
- All animations triggered from gameplay events (pattern stabilization, tension changes, first pattern escape, Enter key press).
- Synced with buried seed and tension system.
- GSAP operates directly on Babylon.js `Vector3` properties (`mesh.position`, `mesh.rotation`, `mesh.scaling`).
- Start-game choreography uses a GSAP timeline: PLAY keycap depress (0.15s) → mechanical click SFX → sphere roll to face camera (0.6s) → hold → roll back → phase transition.

**Key Files**
- `src/systems/MechanicalAnimationSystem.ts` — All GSAP timelines (slit, lever, keycap, platter)
- `src/engine/GameBootstrap.tsx` — Start-game choreography timeline
- `src/sequences/ShatterSequence.ts` — 64-shard fracture timeline

This gives the platter the satisfying mechanical feel that defines the game.
