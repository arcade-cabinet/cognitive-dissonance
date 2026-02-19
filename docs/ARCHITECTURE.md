# Architecture — Cognitive Dissonance v3.0

## Overview

Cognitive Dissonance v3.0 is a cross-platform (web + Android + iOS) interactive 3D experience built on **Reactylon Native + Babylon.js 8 + Miniplex ECS**. The architecture supports dual AR/MR play modes (glasses room-scale and phone camera projection), WebGPU rendering on web with Babylon Native on mobile, procedural morph-based enemies with 7 Yuka AI traits, and a crystalline-cube boss world-crush sequence.

The project uses **Metro** as the universal bundler for all platforms, **Expo SDK 55** as the dev-client layer, and **Miniplex** as the core entity management system.

## High-Level Architecture

```
Entry Points (Metro)
├── index.web.tsx       → Web (Metro + Expo web + WebGPU)
└── index.native.tsx    → Native (Metro + Expo SDK 55 + Babylon Native)
    │
    ▼
App.tsx (Root Component)
├── StrictMode
├── EngineInitializer   → WebGPU / WebGL2 / Babylon Native
├── SceneManager        → Scene creation, coordinate system
└── CognitiveDissonanceRoot (game loop)
    │
    ▼
ECS Layer (Miniplex)
├── World.ts            → Consolidated archetypes
├── Level Archetypes    → PlatterRotation | LeverTension | KeySequence | CrystallineCubeBoss
├── Hand Archetypes     → LeftHand | RightHand (26 joints each)
├── AR Archetypes       → WorldAnchored | Projected | ARSphere
└── Enemy Archetypes    → YukaEnemy (7 traits) | CrystallineCubeBoss
    │
    ▼
Core Systems (Singletons)
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
├── XRManager                   → WebXR session, hand tracking → Hand_Archetype entities
├── HandInteractionSystem       → 26-joint → keycap/lever/sphere mapping
├── PhoneProjectionTouchSystem  → Pointer observers, raycast pick routing
├── MechanicalHaptics           → expo-haptics (native) + navigator.vibrate (web)
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
| iOS (iPhone 12+) | Babylon Native | Metal | WGSL→MSL | expo-audio + Tone.js | expo-haptics | ARKit |
| Android (SD888+) | Babylon Native | Vulkan | WGSL→SPIR-V | expo-audio + Tone.js | expo-haptics | ARCore |

## Build Pipeline

```
Web:    Metro → Expo web → babel-plugin-reactylon → esnext bundle
Native: Metro → Expo SDK 55 dev-client → Reactylon Native → Babylon Native
Shared: TypeScript 5.9 strict, @babylonjs/core subpath imports, tree-shaking
```

## Key Architectural Decisions

### Miniplex ECS as Core

All game entities (levels, hands, AR anchors, enemies, bosses) are Miniplex entities with archetype queries. Levels ARE archetypes — each Dream is a Miniplex entity with archetype-specific components. All procedural parameters (spawn rates, hold times, tension curves, difficulty scaling coefficients) are derived directly from the seed PRNG and built into ECS component data on the Level_Archetype entity at spawn time. No external JSON config files.

### Metro Everywhere

Metro is the sole bundler for web, Android, and iOS. No Vite, no Webpack, no Turbopack. Expo SDK 55 provides the dev-client layer and build tooling.

### GLSL-First Shader Strategy

All custom shaders are authored in GLSL for maximum platform compatibility:
- Web (WebGPU): GLSL → auto-converted to WGSL by Babylon.js WASM transpiler
- Web (WebGL2): GLSL used directly
- Native (Babylon Native / bgfx): GLSL used directly (bgfx compiles to Metal MSL / Vulkan SPIR-V)

All shaders stored as static string literals in `Effect.ShadersStore` (CSP-safe, no eval).

### Dual AR/MR Modes

- **Glasses room-scale**: Platter anchored to real-world horizontal plane via WebXRAnchor, 26-joint hand interaction
- **Phone camera projection**: Tap-to-place via WebXR hit-test, touch controls on projected geometry
- **MODE_LEVER**: Diegetic lever on platter rim switches between modes with GSAP resistance and gear-grind audio

### Buried Seed Procedural Generation

A deterministic seed (mulberry32 PRNG) drives ALL procedural generation:
- Level archetype selection (seedHash % 4)
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

### Initialization Order (21 systems)

1. EngineInitializer
2. SceneManager
3. DeviceQuality
4. ECS World
5. MechanicalPlatter
6. SphereNebulaMaterial
7. DiegeticCoherenceRing
8. TensionSystem
9. DifficultyScalingSystem
10. PatternStabilizationSystem
11. CorruptionTendrilSystem
12. MechanicalAnimationSystem
13. EchoSystem
14. ProceduralMorphSystem
15. CrystallineCubeBossSystem
16. PostProcessCorruption
17. ImmersionAudioBridge
18. SpatialAudioManager
19. DreamTypeHandler
20. ARSessionManager
21. KeyboardInputSystem

### Per-Frame Update Order (12 systems)

1. KeyboardInputSystem (input)
2. PatternStabilizationSystem (gameplay)
3. DifficultyScalingSystem (difficulty recomputation)
4. TensionSystem (state)
5. CorruptionTendrilSystem (visuals)
6. ProceduralMorphSystem (enemies)
7. CrystallineCubeBossSystem (boss)
8. EchoSystem (feedback)
9. MechanicalDegradationSystem (fallback)
10. PostProcessCorruption (post-process)
11. ImmersionAudioBridge (audio)
12. DreamTypeHandler (archetype logic)

## Game Phase State Machine

```
Loading → Title → Playing → Shattered → Title (with new seed)
   ↓
 Error (no WebGL2/WebGPU)
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

- **Unit + PBT**: Jest + fast-check (23 property-based tests for core systems)
- **Web E2E**: Playwright against Expo web dev server
- **Mobile E2E**: Maestro flows on Android emulator / iOS simulator
- **CI**: Biome lint, tsc --noEmit, Jest, Expo web build + size check, Gradle debug APK, Playwright web E2E, Maestro mobile E2E

## Deployment

- **Web**: Expo web export → GitHub Pages
- **Android**: Gradle release APK → GitHub Release
- **iOS**: EAS Build (preview profile) → TestFlight

## References

- [Design Document](./DESIGN.md) — Visual elements, materials, shaders
- [Deployment Guide](./DEPLOYMENT.md) — Build and deployment procedures
- [Testing Guide](./TESTING.md) — Test infrastructure and strategy
- [Development Guide](./DEVELOPMENT.md) — Local development workflow
