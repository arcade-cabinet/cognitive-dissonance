---
title: Architecture
updated: 2026-04-10
status: current
domain: technical
---

# Architecture — Cognitive Dissonance v3.0

## Overview

Cognitive Dissonance v3.0 is a cross-platform (web + Android + iOS) interactive 3D experience built on **Babylon.js 8 + Miniplex ECS**, with **Reactylon Native** as a dependency for planned native platform support. The architecture supports dual AR/MR play modes (glasses room-scale and phone camera projection), WebGPU rendering on web, procedural morph-based enemies with 7 Yuka AI traits, and a crystalline-cube boss world-crush sequence.

**Note:** Reactylon is in package.json and is being integrated for native platform support, but currently zero source files import from it. All Babylon.js creation is imperative. Native rendering via Reactylon Native is in progress -- the app is currently web-only.

The project uses **Metro** as the universal bundler for all platforms, **Expo SDK 55** as the dev-client layer, and **Miniplex** as the core entity management system.

## High-Level Architecture

```text
Entry Points (Metro)
├── index.web.tsx       → Web (Metro + Expo web + WebGPU)
└── index.native.tsx    → Native (Metro + Expo SDK 55 + Reactylon Native, in progress)
    │
    ▼
App.tsx (Root Component)
├── EngineInitializer   → WebGPU / WebGL2 (native via Reactylon, in progress)
├── SceneManager        → Scene creation, coordinate system
└── GameBootstrap (game loop)
    │
    ▼
ECS Layer (Miniplex)
├── World.ts            → Consolidated entity world
├── components.ts       → Component interfaces for 6 primitives + archetype
├── archetypeSlots.ts   → Seed-driven slot derivation for 25 archetypes
├── primitives.ts       → Factory functions for primitive entities
├── Primitive Entities  → Keycap (14) | Lever (1) | Platter (1) | Sphere (1) | CrystallineCube (N) | MorphCube (N)
├── Archetype Entities  → 25 types, each configures primitives via slot parameters
├── Hand Archetypes     → LeftHand | RightHand (26 joints each)
├── AR Archetypes       → WorldAnchored | Projected | ARSphere
└── Enemy Archetypes    → YukaEnemy (7 traits) | CrystallineCubeBoss
    │
    ▼
Core Systems (31 total: 4 bootstrap + 27 orchestrated singletons)
├── TensionSystem               → 0.0–0.999 tension, over-stabilization rebound
├── DifficultyScalingSystem     → Logarithmic scaling from tension + time + seed
├── PatternStabilizationSystem  → Keycap holds, tendril retraction, coherence bonus
├── CorruptionTendrilSystem     → SPS 24 tendrils, tension-proportional spawn
├── MechanicalAnimationSystem   → GSAP timelines, CustomEase, MotionPath
├── EchoSystem                  → Ghost keycaps, 1800ms dispose, one-per-key
├── ProceduralMorphSystem       → MorphTargetManager, 7 traits, GPU vertex morphing
├── CrystallineCubeBossSystem   → 5-phase GSAP timeline, counter, shatter
├── PostProcessCorruption       → Bloom, vignette, chromatic aberration
├── ImmersionAudioBridge        → Tone.js + expo-audio native bridge
├── SpatialAudioManager         → Event-driven procedural SFX
├── ARSessionManager            → Dual AR/MR: glasses room-scale / phone projection
├── HandInteractionSystem       → 26-joint → keycap/lever/sphere mapping
├── SphereTrackballSystem       → Core trackball sphere interaction
├── MechanicalHaptics           → expo-haptics (native) + navigator.vibrate (web)
│
Standalone modules (not yet in SystemOrchestrator):
├── XRManager                   → WebXR session, hand tracking → Hand_Archetype entities
├── PhoneProjectionTouchSystem  → Pointer observers, raycast pick routing
├── DiegeticAccessibility       → Voice commands (expo-speech), adaptive haptics
└── SharedDreamsSystem          → WebRTC DataChannel, anchor/tension sync
    │
    ▼
Visual Systems
├── SphereNebulaMaterial        → PBR + GLSL nebula, tension-driven color/pulse/jitter
├── MechanicalPlatter           → Factory: cylinder + track + slit + lever + 14 keycaps + sphere
├── DiegeticCoherenceRing       → Torus mesh, emissive PBR, blue→red
├── TitleAndGameOverSystem      → "COGNITIVE DISSONANCE" / "COGNITION SHATTERED" planes
├── MechanicalDegradationSystem → WebGL2: cracks, jitter, lever resistance
└── AROcclusionMaterial         → Environment-depth + stencil fallback
    │
    ▼
State Layer (Zustand)
├── seed-store      → seedString, rng, generateNewSeed, replayLastSeed
├── game-store      → phase: loading/title/playing/shattered/error
└── input-store     → keycap pressed states
```

## Platform Strategy

| Platform | Engine | Renderer | Shaders | Audio | Haptics | AR |
|----------|--------|----------|---------|-------|---------|-----|
| Web (Chrome 113+) | WebGPUEngine | WebGPU | WGSL primary | Tone.js | navigator.vibrate | WebXR immersive-ar |
| Web (fallback) | Engine (WebGL2) | WebGL2 | GLSL fallback | Tone.js | navigator.vibrate | WebXR immersive-ar |
| iOS (iPhone 12+) | Reactylon Native (in progress) | Metal (planned) | WGSL→MSL | expo-audio + Tone.js | expo-haptics | ARKit |
| Android (SD888+) | Reactylon Native (in progress) | Vulkan (planned) | WGSL→SPIR-V | expo-audio + Tone.js | expo-haptics | ARCore |

## Build Pipeline

```text
Web:    Metro → Expo web → babel-plugin-reactylon → esnext bundle
Native: Metro → Expo SDK 55 dev-client → Reactylon Native (in progress)
Shared: TypeScript 5.9 strict, @babylonjs/core subpath imports, tree-shaking
```

## Key Architectural Decisions

### Miniplex ECS as Core

All game objects are Miniplex entities organized into **primitive entities** and **archetype entities**:

**Primitive Entities** — Each interaction surface is its own entity:
- 14 **Keycap** entities (one per key, with `KeycapComponent`: letter, active, emerged, glowIntensity, holdProgress)
- 1 **Lever** entity (with `LeverComponent`: position 0.0–1.0, active, resistance, locked)
- 1 **Platter** entity (with `PlatterComponent`: rotationRPM, direction CW/CCW, active, locked)
- 1 **Sphere** entity (with `SphereComponent`: angularSpeed, active, driftEnabled, driftSpeed)
- N **Crystalline Cube** entities (with `CrystallineCubeComponent`: role, health, facetCount, position, velocity, orbit params)
- N **Morph Cube** entities (with `MorphCubeComponent`: role, morphProgress, currentTrait, position, velocity, orbit params)

**Archetype Entities** — One per active Dream, configures primitives via slot parameters:
- `ArchetypeComponent`: type (1 of 25), slots (per-archetype parameters), seedHash, pacing, cognitiveLoad
- See `src/ecs/components.ts` for all 25 slot interfaces and `ARCHETYPE_METADATA` for static classification
- See `src/ecs/archetypeSlots.ts` for seed-driven slot derivation functions

**Session Orchestration** — `DreamSequencer` manages the 8-Dream pacing cycle:
- Opening (Dreams 1-2) → Development (3-5) → Climax (6-7) → Resolution (8)
- Tension carryover rules: opening caps at 0.15, climax floors at 0.4, resolution caps at 0.3
- No archetype repeats within 7-Dream window

All procedural parameters (spawn rates, hold times, tension curves, difficulty scaling coefficients) are derived directly from the seed PRNG via `mulberry32`. No external JSON config files.

### Metro Everywhere

Metro is the sole bundler for web, Android, and iOS. No Vite, no Webpack, no Turbopack. Expo SDK 55 provides the dev-client layer and build tooling.

### GLSL-First Shader Strategy

All custom shaders are authored in GLSL for maximum platform compatibility:
- Web (WebGPU): GLSL → auto-converted to WGSL by Babylon.js WASM transpiler
- Web (WebGL2): GLSL used directly
- Native (Reactylon Native / bgfx, planned): GLSL used directly (bgfx compiles to Metal MSL / Vulkan SPIR-V)

All shaders stored as static string literals in `Effect.ShadersStore` (CSP-safe, no eval).

### Dual AR/MR Modes

- **Glasses room-scale**: Platter anchored to real-world horizontal plane via WebXRAnchor, 26-joint hand interaction
- **Phone camera projection**: Tap-to-place via WebXR hit-test, touch controls on projected geometry
- **MODE_LEVER**: Diegetic lever on platter rim switches between modes with GSAP resistance and gear-grind audio

### Buried Seed Procedural Generation

A deterministic seed (mulberry32 PRNG from `src/utils/seed-helpers.ts`) drives ALL procedural generation. Note: `seedrandom` is listed in package.json but is a dead dependency -- mulberry32 is the actual PRNG used throughout.
- Level archetype selection via `selectArchetypeFromSeed()` (pacing-aware pool selection, no repeats)
- Per-archetype slot derivation via `deriveArchetypeSlots()` (25 archetype-specific functions)
- Pattern sequences
- Enemy trait distribution
- Audio parameters (BPM, swing, root note)
- Difficulty curves (±20% variance per Dream)
- Tension curves (±15% variance per Dream)

### Logarithmic Difficulty Scaling

`scaledValue = baseValue * (1 + k * Math.log1p(tension * timeScale))`

Endless progression with asymptotic ceilings. Difficulty drives tension increase rate, tension drives difficulty — with seed-derived damping coefficient (0.7–0.9) preventing runaway escalation.

### No HUD Ever

Everything is diegetic (in-world 3D). Zero HTML overlays during gameplay. Coherence displayed as a glowing arc ring on the platter. Titles engraved on platter/sphere.

### GSAP for All Mechanical Animations

CustomEase, MotionPath, and all formerly-paid plugins are now free (GSAP 3.13+, Webflow-sponsored). Used for garage-door keycaps, lever resistance, platter rotation, boss timelines.

### Tone.js Exclusive Audio

Babylon audio engine disabled. All audio through Tone.js + expo-audio bridge on native.

## System Orchestration

### Initialization Order (31 systems: 4 bootstrap + 27 orchestrated)

Systems 1–4 are bootstrap systems initialized by GameBootstrap before SystemOrchestrator.
SystemOrchestrator.initAll() creates and initializes 25 system instances (numbered 5–29):

1. EngineInitializer (bootstrap)
2. SceneManager (bootstrap)
3. DeviceQuality (bootstrap)
4. ECS World (bootstrap)
5. HavokInitializer
6. KeycapPhysics
7. PlatterPhysics
8. HandPhysics
9. TensionSystem
10. DifficultyScalingSystem
11. PatternStabilizationSystem
12. CorruptionTendrilSystem
13. MechanicalAnimationSystem
14. EchoSystem
15. ProceduralMorphSystem
16. CrystallineCubeBossSystem
17. PostProcessCorruption
18. ImmersionAudioBridge
19. SpatialAudioManager
20. DreamTypeHandler
21. ARSessionManager
22. KeyboardInputSystem
23. MechanicalDegradationSystem
24. GamePhaseManager
25. ShatterSequence
26. YukaSteeringSystem
27. HandInteractionSystem
28. SphereTrackballSystem
29. MechanicalHaptics

**Note:** XRManager, PhoneProjectionTouchSystem, DiegeticAccessibility, and SharedDreamsSystem exist as standalone modules in `src/xr/`, `src/accessibility/`, and `src/multiplayer/` but are not yet wired into SystemOrchestrator.

### Per-Frame Update Order (6 callbacks)

6 per-frame update callbacks registered via SystemOrchestrator.registerUpdateCallbacks():

1. DifficultyScalingSystem (difficulty recomputation)
2. CorruptionTendrilSystem (tendril spawn + movement)
3. ProceduralMorphSystem (enemy morph updates)
4. YukaSteeringSystem (enemy AI)
5. PatternStabilizationSystem (pattern spawn + timeout checks)
6. DreamTypeHandler (archetype logic)

## Game Phase State Machine

```text
Loading → Title → Playing → Shattered → Title (with new seed)
   ↓         │                    │
 Error       │                    │
             ▼                    ▼
       DreamSequencer       DreamSequencer
       selectNextDream()    recordDreamShatter()
             │
             ▼
       ArchetypeActivation
       configure primitives
       from slot parameters
```

### Session-Level Dream Flow (DreamSequencer)

```text
Session Start (new seed)
├── Dream 1-2  (Opening)     → calm archetypes, low tension carryover
├── Dream 3-5  (Development) → medium archetypes, introduce cubes
├── Dream 6-7  (Climax)      → intense archetypes, tension floor 0.4
└── Dream 8    (Resolution)  → zen archetypes, tension cap 0.3
    └── Cycle repeats → Dream 9-10 (Opening again) ...
```

- **Loading**: Diegetic platter rim glow pulse, engine + ECS initialization
- **Title**: Calm sphere, "COGNITIVE DISSONANCE" engraving, slit closed, keycaps retracted
- **Playing**: Slit open, keycaps emerge, Dream spawned, all systems active
- **Shattered**: 64-shard fracture, enemy fade, platter stop, "COGNITION SHATTERED" text
- **Error**: Static HTML fallback

## Performance Budget

- **Production bundle**: < 5 MB gzipped (enforced in CI)
- **Runtime FPS**: 45+ on supported devices (iPhone 12+ / A14+, Snapdragon 888+ with 6 GB RAM)
- **Device quality tiers**: low (800 particles, 4 morph targets) / mid (2500 particles, 8 morph targets) / high (5000 particles, 12 morph targets)
- **Tree-shaking**: @babylonjs/core subpath imports only — barrel imports flagged by lint

## Testing Strategy

- **Unit + PBT**: Jest + fast-check (2027 tests across 53 test suites, includes 30 property-based tests)
- **Web E2E**: Playwright against Expo web dev server
- **Mobile E2E**: Maestro flows on Android emulator / iOS simulator
- **CI**: Biome lint, tsc --noEmit, Jest, Expo web build + size check, Gradle debug APK, Playwright web E2E, Maestro mobile E2E

## Deployment

- **Web**: Expo web export → GitHub Pages
- **Android**: Gradle release APK → GitHub Release
- **iOS**: EAS Build (preview profile) → TestFlight

## References

- [Level Archetypes](./LEVEL_ARCHETYPES.md) — 25 Dream archetype definitions, seed slot system, pacing guidelines
- [Design Document](./DESIGN.md) — Visual elements, materials, shaders
- [Deployment Guide](./DEPLOYMENT.md) — Build and deployment procedures
- [Testing Guide](./TESTING.md) — Test infrastructure and strategy
- [Development Guide](./DEVELOPMENT.md) — Local development workflow
