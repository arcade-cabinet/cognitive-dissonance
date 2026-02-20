# What The Game Is - Cognitive Dissonance

**For Players**
You are the only one keeping a fragile glass AI mind from shattering.

Hold the matching colored keycaps on the heavy industrial platter to pull back escaping corruption patterns from the sphere. On keyboard, press the letter keys (Q, W, E, R, T, A, S, D, F, G, H, Z, X, C). In AR with hand tracking, physically press the keycaps with your fingers.

Missed patterns spawn enemies that try to destroy the sphere.
The sphere degrades from calm blue to violent red as tension rises.
Survive as long as possible until the sphere inevitably shatters.

Each run is a unique "dream" — the buried seed generates different patterns, enemies, audio, and visual signatures every time.

**For Developers**
- Core loop: pattern stabilization via hold keycaps (PatternStabilizationSystem).
- Progression: logarithmic enemy waves and tension ramp (DifficultyScalingSystem + TensionSystem).
- Loss: sphere reaches tension 0.999 → shatters into 64 procedural shards → "COGNITION SHATTERED" diegetic text.
- Replay: buried seed (mulberry32 PRNG) creates unique runs via 4 Dream archetypes.
- Immersion: fully diegetic, no HUD, everything is part of the machine.
- Platforms: web (WebGPU/WebGL2), Android (Vulkan), iOS (Metal), AR glasses (WebXR hand tracking), AR phone (tap-to-place).
- Architecture: Reactylon Native + Babylon.js 8 + Miniplex 2.0 ECS + GSAP 3.13+ + Tone.js + Havok WASM.

This is the single document that defines the game for both players and developers.
