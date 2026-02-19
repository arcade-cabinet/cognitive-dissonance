# Tech Stack — Cognitive Dissonance v3.0

## Core Stack

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
| miniplex-react | latest | Reactive ECS queries (useQuery) |
| GSAP | 3.13+ | Mechanical animations (CustomEase, MotionPath) |
| Tone.js | 14.9 | Adaptive spatial audio, procedural SFX |
| Zustand | 5 | Global state (seed-store, game-store, input-store) |
| Yuka.js | 0.7 | Enemy AI behaviors (7 morph traits) |
| seedrandom / mulberry32 | — | Buried seed deterministic PRNG |
| Havok | 1.3 | Physics engine (6DoF keycap constraints, platter hinge) |

## Build System

Metro is the universal bundler for all platforms. Expo SDK 55 provides the dev-client layer and build tooling.

| Platform | Bundler | Entry Point | Renderer |
|---|---|---|---|
| Web (Chrome 113+) | Metro (Expo web) | index.web.tsx | WebGPU (primary) or WebGL2 (fallback) |
| iOS (iPhone 12+) | Metro (Expo dev-client) | index.native.tsx | Babylon Native (Metal) |
| Android (SD888+) | Metro (Expo dev-client) | index.native.tsx | Babylon Native (Vulkan/GLES) |

## Testing

| Tool | Purpose |
|---|---|
| Jest + ts-jest | Unit tests (node env, no jsdom) |
| fast-check | Property-based testing for core systems |
| Playwright | Web E2E tests (Expo web dev server) |
| Maestro | Mobile E2E tests (Android emulator / iOS simulator) |

## Linting & Formatting

| Tool | Version | Config |
|---|---|---|
| Biome | 2.4 | Single binary. Indent: 2 spaces. Quotes: single. Trailing commas: all. Semicolons: always. Line width: 120. |

## Key Configuration

- `babel.config.js`: `metro-react-native-babel-preset` + `babel-plugin-reactylon`
- `metro.config.js`: Expo Metro config with Reactylon Native resolver
- `tsconfig.json`: ES2022 target, strict mode, `@babylonjs/core` subpath aliases
- `app.json`: Expo config with bundle IDs, AR entitlements, expo plugins
- `eas.json`: EAS Build profiles (development, preview, production)
- Engine: WebGPU primary on web, WebGL2 fallback, Babylon Native on mobile. Babylon audio engine disabled (Tone.js exclusive).
- All shaders: GLSL in `Effect.ShadersStore` as static strings (CSP-safe). WebGPU auto-converts via Babylon.js WASM transpiler. No custom Metro shader plugins.
- Package manager: pnpm 10.26+
- Node: >= 22.0.0
- Production bundle target: < 5 MB gzipped

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

## Critical Conventions

- **Tree-shakable imports only**: `import { Mesh } from "@babylonjs/core/Meshes/mesh"` — NEVER barrel imports from `@babylonjs/core` or `babylonjs`.
- **Imperative mesh creation**: All Babylon.js meshes/materials created in `useEffect`, NOT as JSX. Only lights and camera use Reactylon JSX (`<hemisphericLight>`, `<arcRotateCamera>`).
- **Render loop**: `scene.registerBeforeRender(fn)` / `scene.unregisterBeforeRender(fn)` — not React re-renders.
- **GSAP + Babylon.js**: `gsap.to(mesh.position, {...})` works natively with Vector3 properties.
- **No HUD ever**: Everything is diegetic (in-world 3D). Zero HTML overlays during gameplay.
- **Miniplex ECS is core**: All game entities (levels, hands, AR anchors, enemies, bosses) are Miniplex entities with archetype queries.
- **Seed-derived parameters inline**: All procedural parameters built directly into ECS component data via helper functions. No external JSON config files.
- **Tone.js exclusive audio**: Babylon audio engine disabled. All audio through Tone.js + expo-audio bridge on native.
- **Metro everywhere**: Single bundler for web, Android, and iOS. No Vite, no Webpack, no Turbopack.
