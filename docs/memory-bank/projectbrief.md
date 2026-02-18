# Project Brief — Cognitive Dissonance

## What It Is

Cognitive Dissonance is a haunting interactive 3D browser experience where you hold a fragile glass AI mind together as its own thoughts try to escape.

## Core Requirements

- **Glass Sphere AI**: Transparent PBR glass sphere with celestial nebula shader inside. Starts calm blue, degrades through yellows/greens to violent reds as tension rises. Physical jitter, crack overlay, shatter at max tension.
- **Heavy Industrial Platter**: Black metal platter with thick rim (18cm+ depth), only rotates on central Y axis. Recessed circular track holds the sphere. Garage-door mechanical slits reveal keys/lever.
- **Pattern Stabilization Gameplay**: Corruption patterns (colored tendrils) escape from sphere center to rim. Hold matching colored keycaps on the platter to pull them back. Missed patterns spawn enemies.
- **Buried Seed**: Hidden deterministic seed (seedrandom) drives all procedural generation. Every run is different but reproducible.
- **Enemy Waves**: Missed patterns spawn holographic SDF enemies (neon-raymarcher for normal, crystalline cubes for bosses). Yuka.js AI behaviors. Logarithmic escalation.
- **Adaptive Audio**: Tone.js spatial score evolving from calm drone to frantic glitch percussion as tension rises.
- **Symmetric Titles**: "COGNITIVE DISSONANCE" (opening) to "COGNITION SHATTERED" (game over).
- **Diegetic Interface**: No HUD. Coherence meter as glowing ring etched into platter surface.
- **Endless**: No forced win condition. Logarithmic advancement with high replay value from buried seed.

## Scope Boundaries

- Web-first (Next.js), mobile via PWA, XR via WebXR hand tracking
- 100% CSP-safe (no eval, no dynamic code generation of any kind)
- All geometry procedural (no imported 3D models)
- All shaders as static GLSL string literals
