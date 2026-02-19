# Cognitive Dissonance v3.0

A cross-platform (web + Android + iOS) interactive 3D experience where you hold a fragile glass AI mind together as its own thoughts try to escape. Built with Reactylon Native + Babylon.js 8 + Miniplex ECS.

## Stack

- **React 19** + **React Native 0.83** — UI components and cross-platform runtime
- **Babylon.js 8** + **Reactylon 3.5** — Declarative 3D rendering (tree-shakable subpath imports only)
- **Expo SDK 55** — Dev-client, native modules, build tooling
- **Metro** — Universal bundler (web + Android + iOS)
- **Miniplex 2** — Entity Component System (core architecture)
- **GSAP 3.13+** — Mechanical animations (CustomEase, MotionPath)
- **Tone.js 14.9** — Adaptive spatial audio, procedural SFX
- **Zustand 5** — Global state (seed, game phase, input)
- **Yuka.js 0.7** — Enemy AI behaviors (7 morph traits)
- **Havok 1.3** — Physics engine (6DoF keycap constraints, platter hinge)
- **Biome 2.4** — Linting + formatting
- **Jest + fast-check** — Unit + property-based testing
- **Playwright** — Web E2E testing
- **Maestro** — Mobile E2E testing

## Getting Started

```bash
# Install dependencies
pnpm install

# Start Metro dev server (all platforms)
pnpm start

# Start Expo web dev server
pnpm web

# Start Android (requires Android Studio + emulator)
pnpm android

# Start iOS (requires macOS + Xcode + simulator)
pnpm ios
```

## Commands

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

## Architecture

```
Entry Points (Metro)
├── index.web.tsx       → Web (WebGPU / WebGL2)
└── index.native.tsx    → Native (Babylon Native Metal/Vulkan)
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
```

## Game Design

A **fragile glass sphere** containing a **celestial nebula shader** sits on a **heavy industrial black metal platter**. The sphere degrades from calm blue to violent red as tension rises. **Corruption patterns** (colored tendrils) escape from the sphere center to the rim. **Hold matching colored keycaps** on the platter to pull them back. Missed patterns spawn **procedural morph-based enemies** with 7 distinct Yuka AI traits. At 100% tension the sphere shatters — "COGNITION SHATTERED."

Everything is diegetic — no HUD. Coherence displayed as a glowing ring on the platter. Audio evolves from calm drone to frantic glitch percussion. Endless with logarithmic advancement, high replay from a buried deterministic seed.

## Dual AR/MR Modes

- **Glasses room-scale**: Platter anchored to real surface, 26-joint hand tracking
- **Phone camera projection**: Tap-to-place, touch controls on projected geometry
- **MODE_LEVER**: Diegetic lever on platter rim switches between modes

## Key Features

- **Buried Seed**: Deterministic PRNG drives all procedural generation (patterns, enemies, audio, difficulty)
- **Level Archetypes**: 4 fundamentally different gameplay modes per Dream (PlatterRotation, LeverTension, KeySequence, CrystallineCubeBoss)
- **Logarithmic Difficulty Scaling**: Endless progression with asymptotic ceilings
- **7 Enemy Morph Traits**: GPU vertex morphing with unique Yuka AI behaviors
- **Crystalline-Cube Boss**: 5-phase GSAP world-crush timeline
- **WebGPU on Web**: Primary renderer with WebGL2 fallback
- **Babylon Native on Mobile**: Metal (iOS) / Vulkan (Android)
- **GLSL-First Shaders**: Auto-converted to WGSL on WebGPU
- **Havok Physics**: 6DoF keycap constraints, platter hinge
- **Tone.js Exclusive Audio**: Spatial procedural SFX, seed-derived BPM/swing
- **expo-haptics**: Native haptic feedback synced to tension

## Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — System architecture and design decisions
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Build and deployment procedures
- **[GITHUB_ACTIONS.md](./docs/GITHUB_ACTIONS.md)** — CI/CD pipeline details
- **[TESTING.md](./docs/TESTING.md)** — Test infrastructure and strategy
- **[DEVELOPMENT.md](./docs/DEVELOPMENT.md)** — Local development workflow
- **[AGENTS.md](./AGENTS.md)** — Cross-agent memory bank
- **[CLAUDE.md](./CLAUDE.md)** — Claude-specific instructions

## License

MIT
