# Project Structure — Cognitive Dissonance v3.0

This describes the TARGET v3.0 structure. The current codebase is v2.0 (Next.js) and will be migrated per the v3.0 spec.

## v3.0 Target Directory Layout

```
/
├── index.web.tsx              # Web entry (Metro + Expo web + WebGPU)
├── index.native.tsx           # Native entry (Metro + Expo SDK 55 dev-client)
├── App.tsx                    # Root: StrictMode → EngineInitializer → SceneManager → CognitiveDissonanceRoot
├── metro.config.js            # Metro bundler config (Expo + Reactylon Native resolver)
├── babel.config.js            # metro-react-native-babel-preset + babel-plugin-reactylon
├── tsconfig.json              # ES2022, strict, @babylonjs/core subpath aliases
├── jest.config.ts             # ts-jest, node env, @babylonjs/core moduleNameMapper
├── playwright.config.ts       # Expo web dev server
├── biome.json                 # Linting + formatting
├── app.json                   # Expo config (bundle IDs, AR entitlements, plugins)
├── eas.json                   # EAS Build profiles (dev/preview/production)
├── package.json               # pnpm, unified scripts (web + native via Metro)
│
├── src/
│   ├── engine/
│   │   └── EngineInitializer.ts       # WebGPU detection → WebGPUEngine or WebGL2 Engine or Babylon Native
│   │
│   ├── ecs/
│   │   └── World.ts                   # Consolidated Miniplex World + all archetypes + spawnDreamFromSeed
│   │
│   ├── systems/                       # Core gameplay systems (singletons)
│   │   ├── TensionSystem.ts           # Tension 0.0–0.999, over-stabilization, propagation
│   │   ├── DifficultyScalingSystem.ts # Logarithmic scaling from tension + time + seed
│   │   ├── PatternStabilizationSystem.ts  # Keycap holds, tendril retraction, coherence bonus
│   │   ├── CorruptionTendrilSystem.ts # SPS 24 tendrils, tension-proportional spawn
│   │   ├── MechanicalAnimationSystem.ts   # GSAP timelines, CustomEase, MotionPath
│   │   ├── EchoSystem.ts             # Ghost keycaps, 1800ms dispose, one-per-key
│   │   ├── KeyboardInputSystem.ts     # scene.onKeyboardObservable, 6-key limit
│   │   ├── SystemOrchestrator.ts      # Init order (21 systems), update order (12 systems), dispose
│   │   └── DreamTypeHandler.ts        # Per-archetype gameplay handlers
│   │
│   ├── enemies/
│   │   ├── ProceduralMorphSystem.ts   # MorphTargetManager, 7 traits, GPU vertex morphing
│   │   ├── CrystallineCubeBossSystem.ts   # 5-phase GSAP timeline, counter, shatter
│   │   └── EnemySystem.ts            # Yuka AI behaviors
│   │
│   ├── objects/
│   │   └── MechanicalPlatter.tsx      # Factory: cylinder + track + slit + lever + 14 keycaps + sphere
│   │
│   ├── shaders/
│   │   ├── registry.ts               # All GLSL in Effect.ShadersStore (CSP-safe)
│   │   ├── SphereNebulaMaterial.ts    # PBR + GLSL nebula, tension-driven color/pulse/jitter
│   │   └── AROcclusionMaterial.ts     # Environment-depth + stencil fallback
│   │
│   ├── ui/
│   │   └── DiegeticCoherenceRing.ts   # Torus mesh, emissive PBR, blue→red
│   │
│   ├── sequences/
│   │   └── TitleAndGameOverSystem.ts  # "COGNITIVE DISSONANCE" / "COGNITION SHATTERED" planes
│   │
│   ├── fallback/
│   │   └── MechanicalDegradationSystem.ts  # WebGL2: cracks, jitter, lever resistance
│   │
│   ├── xr/
│   │   ├── ARSessionManager.ts        # Dual mode: glasses room-scale / phone projection
│   │   ├── XRManager.ts              # WebXR session, hand tracking → Hand_Archetype entities
│   │   ├── HandInteractionSystem.ts   # 26-joint → keycap/lever/sphere mapping
│   │   ├── PhoneProjectionTouchSystem.ts  # Pointer observers, raycast pick routing
│   │   └── MechanicalHaptics.ts       # expo-haptics (native) + navigator.vibrate (web)
│   │
│   ├── audio/
│   │   ├── ImmersionAudioBridge.ts    # Tone.js core + expo-audio native bridge
│   │   └── SpatialAudioManager.ts     # Event-driven procedural SFX, seed-derived BPM/swing
│   │
│   ├── store/                         # Zustand stores (retained from v2, simplified)
│   │   ├── seed-store.ts             # seedString, rng, generateNewSeed, replayLastSeed
│   │   ├── game-store.ts             # phase: loading/title/playing/shattered/error
│   │   └── input-store.ts            # keycap pressed states
│   │
│   ├── utils/
│   │   ├── DeviceQuality.ts          # Tier detection (low/mid/high), quality config
│   │   ├── PlatformConfig.ts         # isWeb / isNative booleans
│   │   └── seed-helpers.ts           # mulberry32, buildPhaseDefinitions, buildTensionCurve, etc.
│   │
│   ├── native/
│   │   └── BabylonNativeView.tsx     # Custom native module (requireNativeComponent)
│   │
│   ├── accessibility/
│   │   └── DiegeticAccessibility.ts  # Voice commands (expo-speech), adaptive haptics
│   │
│   ├── multiplayer/
│   │   └── SharedDreamsSystem.ts     # WebRTC DataChannel, anchor/tension sync
│   │
│   └── types/
│       └── index.ts                  # GameEntity, YukaTrait, PhaseConfig, TensionCurveConfig, DifficultyConfig, etc.
│
├── e2e/
│   └── web/                          # Playwright web E2E (Expo web target)
│       ├── smoke.spec.ts
│       ├── gameplay.spec.ts
│       └── helpers/
│
├── .maestro/                         # Maestro mobile E2E flows
│   ├── config.yaml
│   ├── app-launch.yaml
│   ├── gameplay-loop.yaml
│   ├── ar-session.yaml
│   └── game-over.yaml
│
├── android/                          # Fresh Reactylon Native template
├── ios/                              # Fresh Reactylon Native template
├── public/                           # Static assets (icons, manifest)
├── docs/                             # Project documentation
│   └── memory-bank/                  # Grok conversation corpus + design history
└── .kiro/
    ├── specs/                        # Feature specs
    └── steering/                     # This directory
```

## Key Structural Rules

- Miniplex ECS (`src/ecs/World.ts`) is the single source of truth for all game entities and archetypes.
- Systems are singletons in `src/systems/`. SystemOrchestrator manages init/update/dispose order.
- All shaders live in `src/shaders/registry.ts` as static strings in `Effect.ShadersStore`. No custom Metro shader plugins.
- Zustand stores are minimal (seed, game phase, input). Tension/coherence/level state moved to TensionSystem + ECS.
- No `src/app/` directory (Next.js removed). Entry points are root-level `index.web.tsx` and `index.native.tsx`.
- No Tailwind CSS. No HTML overlays. All UI is diegetic 3D.
- Metro is the sole bundler for all platforms (web, Android, iOS). No Vite, no Webpack, no Turbopack.
- Tests colocated: `src/**/__tests__/*.test.ts` for unit + PBT. `e2e/web/` for Playwright. `.maestro/` for mobile.
- `docs/memory-bank/` contains the Grok conversation corpus — design intent and decision history. Read `INDEX.md` first.
