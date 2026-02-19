# AGENTS.md — Cognitive Dissonance v3.0 Cross-Agent Memory Bank

> Persistent context for AI agents working on Cognitive Dissonance v3.0.
> Read this file at the start of every task. Update it after significant changes.

---

## Project Brief

Cognitive Dissonance v3.0 is a cross-platform (web + Android + iOS) interactive 3D experience where you hold a fragile glass AI mind together as its own thoughts try to escape. Built with Reactylon Native + Babylon.js 8 + Miniplex ECS + Expo SDK 55.

### Core Loop

1. Glass sphere with celestial nebula shader sits on heavy industrial platter
2. Corruption patterns (colored tendrils) escape from sphere center to rim
3. Hold matching colored keycaps on the platter to pull them back
4. Missed patterns spawn procedural morph-based enemies (7 Yuka AI traits)
5. Enemies reaching sphere = tension spike + glass degradation
6. At 100% tension → sphere shatters → "COGNITION SHATTERED" → game over
7. Endless with logarithmic difficulty scaling, high replay value from buried seed

---

## System Patterns

### Architecture

```
Entry Points (Metro)
├── index.web.tsx       → Web (Metro + Expo web + WebGPU)
└── index.native.tsx    → Native (Metro + Expo SDK 55 + Babylon Native)
    │
    ▼
App.tsx → EngineInitializer → SceneManager → CognitiveDissonanceRoot
    │
    ▼
Miniplex ECS (World.ts)
├── Level Archetypes    → PlatterRotation | LeverTension | KeySequence | CrystallineCubeBoss
├── Hand Archetypes     → LeftHand | RightHand (26 joints each)
├── AR Archetypes       → WorldAnchored | Projected | ARSphere
└── Enemy Archetypes    → YukaEnemy (7 traits) | CrystallineCubeBoss
    │
    ▼
Core Systems (21 singletons)
├── TensionSystem, DifficultyScalingSystem, PatternStabilizationSystem
├── CorruptionTendrilSystem, MechanicalAnimationSystem, EchoSystem
├── ProceduralMorphSystem, CrystallineCubeBossSystem
├── ARSessionManager, XRManager, HandInteractionSystem
├── ImmersionAudioBridge, SpatialAudioManager
└── ... (see docs/ARCHITECTURE.md for full list)
    │
    ▼
State Layer (Zustand)
├── seed-store (seedString, rng, generateNewSeed, replayLastSeed)
├── game-store (phase: loading/title/playing/shattered/error)
└── input-store (keycap pressed states)
```

### Key Patterns

- **Miniplex ECS is core**: All game entities (levels, hands, AR anchors, enemies, bosses) are Miniplex entities with archetype queries
- **Imperative 3D**: All Babylon.js meshes/materials created in useEffect, not JSX
- **Reactylon JSX**: Lowercase tags for lights/camera only (`<hemisphericLight>`, `<arcRotateCamera>`)
- **Render loop**: `scene.registerBeforeRender(fn)` / `scene.unregisterBeforeRender(fn)`
- **GSAP + Babylon**: gsap.to(mesh.position, {...}) works natively with Vector3
- **CSP-safe shaders**: All GLSL in Effect.ShadersStore as static string literals
- **Metro everywhere**: Single bundler for web, Android, and iOS
- **Tree-shakable imports**: `import { Mesh } from "@babylonjs/core/Meshes/mesh"` — NEVER barrel imports
- **Miniplex 2.0 API**: `world.with()` (not `archetype()`), `world.add()` (not `createEntity()`)

---

## Tech Context

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI components |
| React Native | 0.83 | Cross-platform runtime |
| TypeScript | 5.9 | Type safety (strict mode, ES2022 target) |
| Babylon.js | 8.51 | 3D rendering engine (tree-shakable subpath imports only) |
| Reactylon | 3.5.4 | Declarative Babylon.js + React reconciliation |
| Reactylon Native | latest | Cross-platform: Babylon Native on mobile, WebGPU on web |
| Expo SDK | 55 | Dev-client, native modules, build tooling |
| Metro | latest | Universal bundler (web + Android + iOS) |
| Miniplex | 2 | Entity Component System (core architecture) |
| GSAP | 3.13+ | Mechanical animations (CustomEase, MotionPath) |
| Tone.js | 14.9 | Adaptive spatial audio, procedural SFX |
| Zustand | 5 | Global state (seed-store, game-store, input-store) |
| Yuka.js | 0.7 | Enemy AI behaviors (7 morph traits) |
| Havok | 1.3 | Physics engine (6DoF keycap constraints, platter hinge) |
| Biome | 2.4 | Linting + formatting |
| Jest + fast-check | latest | Unit + property-based testing |
| Playwright | latest | Web E2E testing |
| Maestro | latest | Mobile E2E testing |

### Commands

```bash
pnpm start         # Metro dev server (all platforms)
pnpm web           # Expo web dev server
pnpm android       # Metro + Expo dev-client (Android)
pnpm ios           # Metro + Expo dev-client (iOS)
pnpm build:web     # Expo web export (production)
pnpm build:android # Gradle release APK
pnpm lint          # Biome check
pnpm lint:fix      # Biome auto-fix
pnpm format        # Biome format
pnpm test          # Jest unit + PBT tests
pnpm test:watch    # Jest watch mode
pnpm test:coverage # Jest with lcov coverage
pnpm test:e2e:web  # Playwright web E2E
pnpm test:e2e:mobile        # Maestro mobile E2E (all platforms)
pnpm test:e2e:mobile:android # Maestro Android only
pnpm test:e2e:mobile:ios     # Maestro iOS only
```

---

## Development History

### v3.0.0 — Cross-Platform Migration (Feb 2026)

Complete rebuild from Next.js web-only to Reactylon Native cross-platform (web + Android + iOS).

**Key changes:**
- Replaced Next.js 16 + Turbopack with Metro + Expo SDK 55
- Elevated Miniplex ECS as core architecture (levels ARE archetypes)
- Added dual AR/MR modes (glasses room-scale + phone camera projection)
- Added 7 procedural morph-based enemies with Yuka AI traits
- Added crystalline-cube boss with 5-phase GSAP world-crush timeline
- Added logarithmic difficulty scaling system (endless progression)
- Replaced Vitest with Jest + fast-check for property-based testing
- Added Maestro for mobile E2E testing
- WebGPU primary on web, Babylon Native (Metal/Vulkan) on mobile

**Key design decisions:**
1. **Miniplex ECS elevated** — Levels ARE archetypes, all procedural params in ECS component data
2. **Buried seed drives everything** — Deterministic PRNG for patterns, enemies, audio, difficulty
3. **Logarithmic difficulty scaling** — `baseValue * (1 + k * Math.log1p(tension * timeScale))`
4. **Dual AR/MR modes** — Glasses room-scale (hand tracking) + phone projection (touch)
5. **GLSL-first shaders** — Auto-converted to WGSL on WebGPU, used directly on WebGL2/Native
6. **No HUD ever** — Everything diegetic (in-world 3D)
7. **Metro everywhere** — Single bundler for all platforms

### v2.0.0 — Babylon.js Migration (Feb 2026)

Ground-up rebuild from Vite + R3F + Three.js to Next.js + Babylon.js + Reactylon (web-only).

### v1.0.0 — Original R3F Version

Vite + React Three Fiber + Three.js + Miniplex + Web Worker game loop.

---

## Known Issues

- Havok physics keycap constraints need tuning (LINEAR_Y stiffness/damping)
- XR hand tracking is functional but needs real-device testing
- AR occlusion requires iOS 26+ / Quest 3+ for environment-depth (stencil fallback works)
- Biome auto-fix removes private field declarations that are only assigned in methods (re-add manually)

---

## Active Decisions

- **Metro + Expo SDK 55** — Universal bundler for all platforms
- **Biome 2.4** — Single binary linter/formatter (replaced ESLint)
- **Miniplex 2.0 API** — `world.with()` and `world.add()` (not `archetype()` and `createEntity()`)
- **Tree-shakable imports only** — `@babylonjs/core/MODULE` (never barrel imports)
- **GSAP 3.13+** — All plugins free (Webflow-sponsored)
- **Tone.js exclusive audio** — Babylon audio engine disabled
- **pnpm** — Package manager
