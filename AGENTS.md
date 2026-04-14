---
title: Cross-Agent Memory Bank
updated: 2026-04-14
status: current
domain: context
---

# AGENTS.md — Cognitive Dissonance Cross-Agent Memory Bank

> Persistent context for AI agents working on Cognitive Dissonance.
> Read this file at the start of every task. Update it after significant changes.

---

## Project Brief

Cognitive Dissonance is a haunting interactive 3D experience where you hold a
fragile glass AI mind together as its own thoughts try to escape. It plays in
any modern browser and ships to iOS/Android via Capacitor wrapping the web
build.

### Core Loop

1. Glass sphere with celestial nebula shader sits on heavy industrial platter
2. Corruption patterns (colored tendrils) escape from sphere center to rim
3. Hold matching colored keycaps on the platter to pull them back
4. Missed patterns spawn holographic SDF enemies (neon-raymarcher + crystalline-cube)
5. Enemies reaching sphere = tension spike + glass degradation
6. At 100% tension → sphere shatters → "COGNITION SHATTERED" → game over
7. Endless with logarithmic advancement, high replay value from buried seed

---

## System Patterns

### Architecture

```
Vite 8 (static export)
├── index.html (root)
├── src/main.tsx (React entry, no SSR)
├── GameBoard (2D React + Tailwind 4)
│   ├── ATCShader background
│   ├── Title / Clarity / Game-over overlays
│   └── Accessibility live regions
├── GameScene (Reactylon Engine/Scene)
│   ├── Declarative: hemisphericLight, pointLight, arcRotateCamera
│   ├── AISphere (glass + celestial shader)
│   ├── Platter (industrial base + GSAP garage-door keycaps)
│   ├── PatternStabilizer (core gameplay)
│   ├── EnemySpawner (Yuka AI + SDF shader enemies)
│   ├── PostProcessCorruption (chromatic aberration + noise)
│   ├── SPSEnemies (SolidParticleSystem visuals)
│   ├── DiegeticGUI (coherence ring on platter)
│   ├── SpatialAudio (event-driven procedural SFX)
│   └── AudioEngine (Tone.js adaptive score)
└── ECS (Koota)
    └── Single world (src/sim/world.ts) holds BOTH:
        ├── Singleton traits (state replacing Zustand)
        │   Game  — phase, restartToken
        │   Level — currentLevel, coherence, peakCoherence, tension
        │   Seed  — seedString, lastSeedUsed, seedrandom rng
        │   Input — heldKeycaps (Set<number>)
        │   Audio — isInitialized, tension, Tone.js graph
        └── Entity traits (replacing Miniplex)
            IsSphere, IsEnemy, IsPattern   (tags)
            Position, Velocity              (spatial)
            Enemy, Pattern, Sphere          (data)
```

### Key Patterns

- **Imperative 3D**: All Babylon meshes/materials created in `useEffect`, not JSX.
  Reactylon JSX is reserved for lights and camera only.
- **Reactylon JSX**: Lowercase tags (`<hemisphericLight>`, `<arcRotateCamera>`)
  get their Babylon classes auto-registered via `babel-plugin-reactylon` running
  inside `@vitejs/plugin-react`'s Babel pass.
- **Render loop**: `scene.onBeforeRenderObservable.add(fn)` + cleanup in the
  effect teardown. Never driven by React's render cycle.
- **GSAP + Babylon**: `gsap.to(mesh.position, {...})` works natively with
  Babylon's `Vector3` — no adapter layer.
- **CSP-safe shaders**: All GLSL lives in `BABYLON.Effect.ShadersStore` as
  static string literals. CSP allows `wasm-unsafe-eval` (Havok physics) +
  `unsafe-eval` (Koota JIT trait accessors).
- **Store shim layer**: `src/store/*-store.ts` preserves the Zustand call-site
  API (`getState()`, `setState()`, `subscribe()`, hook-form) but proxies every
  operation through Koota `world.get/set/onChange`. This let us migrate state
  ownership without touching 20+ consuming components. Entity data similarly
  goes through `src/game/world.ts` as a compat shim over Koota's `spawn/destroy`.
- **Phase gating**: gameplay systems (enemy-spawner, pattern-stabilizer,
  ai-sphere's tension loop) early-return outside `phase === 'playing'`.
  Prevents tension rise during title/loading/game-over.

---

## Tech Context

| Technology     | Version | Purpose                                  |
|----------------|---------|------------------------------------------|
| Vite           | 8.0     | Bundler, dev server, static export       |
| React          | 19.2    | UI components                            |
| TypeScript     | 5.9     | Type safety                              |
| Babylon.js     | 8.56    | 3D rendering engine                      |
| Reactylon      | 3.5.4   | Declarative Babylon.js + React           |
| Koota          | 0.6.6   | ECS — state + entity data                |
| GSAP           | 3.14    | Mechanical animations                    |
| Tone.js        | 15      | Adaptive spatial audio                   |
| Yuka.js        | 0.7     | Enemy AI behaviors                       |
| seedrandom     | 3.0     | Deterministic procedural generation      |
| Tailwind CSS   | 4       | 2D overlay styling                       |
| Biome          | 2.4     | Linting + formatting                     |
| Vitest         | 4.1     | Unit + browser component tests           |
| Playwright     | 1.59    | E2E tests                                |
| Capacitor      | 8.3     | iOS + Android native wrapping (WebView)  |

### Commands

```bash
pnpm dev               # Vite dev server (~200ms startup)
pnpm build             # Production static build (dist/)
pnpm start             # Vite preview of dist/
pnpm lint              # Biome check
pnpm test              # Vitest unit tests
pnpm test:browser      # Vitest browser mode — real WebGL tests
pnpm test:e2e          # Playwright E2E (xvfb on Linux, direct on macOS)
pnpm cap:sync:ios      # Build web → sync to ios/
pnpm cap:sync:android  # Build web → sync to android/
```

---

## Development History

### v3.0.0 — Vite + Koota migration (April 2026)

Two big architectural moves shipped together on PR #201:

**Next.js 16 → Vite 8** — this is a client-side WebGL game, not a web app.
Dropping Next.js removed basePath gymnastics, Turbopack/Webpack split, babel-
for-users/swc-for-internals, and dev-server slowness (~60s first compiles
under HMR). Vite gives us instant HMR, single build pipeline, ~10s production
build, clean static `dist/` for Capacitor to wrap.

**Zustand + Miniplex → Koota ECS** — single world is now the source of truth
for both global state (singleton traits) and game entities (spawnable entities
with trait composition). The old stores kept their API via thin shims that
proxy through Koota, so migration was drop-in at call sites. Traits, world,
and actions live in `src/sim/`.

Also in v3:
- Capacitor 8.3 native wrapping (iOS + Android) replacing aborted RN scaffolding
- Responsive camera (phone portrait gets wider framing), ResizeObserver on canvas
- Cross-platform E2E runner (xvfb on Linux, direct on macOS)
- pnpm 10.33, lockfile regenerated, all GitHub Actions pinned to exact SHAs
- Branch protection on `main` requiring "CI Success"
- Accessibility viewport fix (re-enabled browser zoom)
- ECS entity scaffolding: IsSphere/IsEnemy/IsPattern tags + Enemy/Pattern/Sphere data

### v2.0.0 — Babylon.js + Reactylon (Feb 2026)

Complete ground-up rebuild from Vite + R3F + Three.js to Next.js + Babylon +
Reactylon. (The Vite reintroduction in v3 is coincidental — v2 had moved to
Next.js first; v3 restored Vite after the architectural reasoning.)

Key v2 design decisions still in force:
1. **De-humanized the AI** — Replaced NS-5 android bust with fragile glass sphere
2. **Pattern stabilization** — Core mechanic: hold keycaps to pull back corruption
3. **Buried seed** — Hidden deterministic seed drives all procedural generation
4. **Garage-door keycaps** — Mechanical emergence from platter rim with GSAP
5. **Symmetric titles** — "COGNITIVE DISSONANCE" → "COGNITION SHATTERED"

### v1.0.0 — Original R3F Version

Vite + React Three Fiber + Three.js + Miniplex + Web Worker game loop.
Raymarched SDF enemies, 3D mechanical keyboard, NS-5 android bust.

---

## Known Issues

- Physics-keys constrained via Havok 6DoF; tune
  `src/components/physics-keys.tsx` constraint keys `LINEAR_Y.minLimit/maxLimit`
  (travel) and `LINEAR_Y.stiffness/damping` + `setAxisMotorMaxForce` (spring),
  then validate via `pnpm test:e2e:headed` visual QA pass.
- XR hand tracking is stub only — pinch→keycap mapping not wired.
- Mobile touch: keycap hit areas may need enlargement on small phones.
- SonarCloud in CI sometimes flakes due to rate-limited token — non-blocking,
  doesn't fail `CI Success`.

---

## Active Decisions

- **Vite 8** — Client-side-only game; no SSR; no routes. Next.js overhead
  wasn't paying for itself.
- **Koota ECS** — One world for state + entities. Traits > stores.
- **Biome 2.4** — Replaces ESLint. Single binary, zero plugin deps.
- **`forceWebGL={true}`** — Safest path for complex GLSL raymarchers.
- **Koota shim layer** — Keeps Zustand call-site API while state moves to
  Koota traits. Enables future refactor to `useTrait`/`useQuery` without a
  flag-day migration.
- **GSAP for mechanical animations** — CustomEase, timeline, stagger.
- **Tone.js exclusive audio** — Babylon audio engine disabled.
- **Capacitor, not React Native** — We wrap the web build in a WebView; no
  separate native codebase.
- **pnpm 10.33** — Package manager. `onlyBuiltDependencies: ["sharp"]` in
  package.json so CI's strict build-script policy doesn't fail install.
- **Exact SHA pins for all GitHub Actions** — Floating refs forbidden.
  Dependabot manages updates.
