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

Cognitive Dissonance is a **cabinet engine** — a single fixed chassis
(industrial platter, recessed glass AI sphere, machined rim, postprocessed
corruption sky) that hosts many games. Each level declares an `inputSchema`
and the cabinet materialises matching controls through the rim. Plays in any
modern browser; ships to iOS/Android via Capacitor wrapping the web build.

See [docs/LORE.md](./docs/LORE.md) for the narrative substrate.

### Default Loop (pattern-match level)

1. Glass sphere + nebula shader sits in the recess at platter centre
2. Corruption patterns escape from the sphere as colored tendrils
3. Hold the matching colored keycap to pull the pattern back
4. Sky rain impacts the sphere — each impact bumps tension up
5. Tension drains coherence above 0.75; coherence at 0 = shatter
6. Shatter detonates a 48-shard rapier-driven glass pool; restart resets

---

## System Patterns

### Architecture

```
Vite 8 (static export to dist/)
├── index.html          single canvas, no DOM UI
└── src/
    ├── main.ts         entry — creates canvas, world, cabinet, rAF loop
    ├── three/          cabinet pieces
    │   ├── cabinet.ts          orchestrator (scene/camera/physics/renderer)
    │   ├── industrial-platter.ts
    │   ├── ai-core.ts          glass sphere + nebula
    │   ├── sky-rain.ts         rapier-driven debris pool
    │   ├── shatter.ts          48-shard glass pool for game-over
    │   ├── emergent-controls.ts level-parameterized control rig
    │   ├── pattern-trails.ts    visualises Pattern entities
    │   └── post-process-corruption.ts
    ├── sim/            game logic
    │   ├── world.ts    Koota world + singleton trait initialisation
    │   ├── traits.ts   all trait definitions (singletons + entities)
    │   ├── actions.ts  discrete mutations (setPhase, generateNewSeed, ...)
    │   └── systems/
    │       ├── pattern-stabilizer.ts (fixed 30Hz)
    │       └── tension-driver.ts     (per-frame)
    ├── boot/           side-effect listeners (audio, input, game-over)
    └── lib/            shaders, RNG, math helpers
```

### Koota traits

Singletons (attached to the world entity, replace stores entirely):
- `Game` — `phase`, `restartToken`
- `Level` — `currentLevel`, `coherence`, `peakCoherence`, `tension`,
  `inputSchema`, `rotation`, `wobble`
- `Seed` — `seedString`, `lastSeedUsed`, seedrandom rng
- `Input` — `heldKeycaps: Set<number>`
- `Audio` — `isInitialized`, `tension`, Tone.js graph

Entity traits (composed at spawn):
- Tags: `IsSphere`, `IsEnemy`, `IsPattern`
- Spatial: `Position`, `Velocity`
- Data: `Enemy`, `Pattern`, `Sphere`

### Key Patterns

- **Zero UI framework** — no React/Vue/Reactylon. Cabinet renders directly to
  a single canvas. The cabinet IS the menu.
- **Cabinet engine framing** — the chassis (platter, sphere, rain, corruption)
  is shared across every level. Per-level variation goes through
  `Level.inputSchema` and a system in `src/sim/systems/`. See STANDARDS.md.
- **rAF render loop** — `cabinet.render(dt)` is called from
  `requestAnimationFrame` in main.ts. Steps physics with a 60Hz substep
  accumulator (max 5 substeps per frame), updates Koota systems, and runs
  the postprocess composer.
- **Rapier physics** — kinematic collider for the AI sphere with
  `CONTACT_FORCE_EVENTS` so rain impacts can drive tension. Dynamic colliders
  for sky rain particles and shatter shards. WASM emitted to `dist/assets/`
  via `vite-plugin-wasm`.
- **CSP-safe shaders** — GLSL lives as static string literals registered with
  three's `ShaderMaterial` at module import time. CSP permits
  `wasm-unsafe-eval` (rapier) and `unsafe-eval` (Koota JIT trait accessors).
- **Phase gating** — gameplay systems early-return outside `phase ===
  'playing'`. Prevents tension rise during title/loading/game-over.
- **Bridge for tests** — `src/main.ts` exposes `__world`, `__cabinet`,
  `__setTension`, `__getLevel`, `__fireGameOver` on `window` so Playwright
  E2E specs can drive the sim without UI.

---

## Tech Context

| Technology     | Version | Purpose                                  |
|----------------|---------|------------------------------------------|
| Vite           | 8.0     | Bundler, dev server, static export       |
| TypeScript     | 5.9     | Type safety                              |
| three.js       | 0.183   | 3D rendering (raw, no framework wrapper) |
| @dimforge/rapier3d | 0.19 | Physics (WASM via vite-plugin-wasm)      |
| postprocessing | 6.39    | Corruption EffectComposer pipeline       |
| three-stdlib   | 2.36    | RoomEnvironment for PMREM                |
| Koota          | 0.6.6   | ECS — singleton state + entity systems   |
| GSAP           | 3.14    | Mechanical motion curves                 |
| Tone.js        | 15      | Adaptive audio score                     |
| Yuka.js        | 0.7     | Enemy AI steering                        |
| seedrandom     | 3.0     | Deterministic procedural generation      |
| Biome          | 2.4     | Linting + formatting                     |
| Vitest         | 4.1     | Unit + browser component tests           |
| Playwright     | 1.59    | E2E tests                                |
| Capacitor      | 8.3     | iOS + Android native wrapping (WebView)  |

### Commands

```bash
pnpm dev               # Vite dev server
pnpm build             # Production static build (dist/)
pnpm start             # Vite preview of dist/ on :3000
pnpm lint              # Biome check
pnpm test              # Vitest unit tests
pnpm test:browser      # Vitest browser mode — real WebGL via Playwright
pnpm test:e2e          # Playwright E2E
pnpm cap:sync:ios      # Build web → sync to ios/
pnpm cap:sync:android  # Build web → sync to android/
```

---

## Development History

### v4.0.0 — Zero-framework cabinet (April 2026)

PR #204 — ground-up rebuild: dropped Babylon + Reactylon entirely; raw three.js
+ rapier + postprocessing in a single canvas. No UI framework. The cabinet is
the menu. Bundle: 190KB JS + 593KB cacheable WASM.

Subsequent PRs on the v4 stack:
- #205 — playable loop: audio, pointer raycast, pattern stabilizer, tension
  driver, game-over flow
- #206 — rapier-driven sky rain (replaced hand-rolled integration)
- #207 — diegetic rim etching ("MAINTAIN COHERENCE") via CanvasTexture
- #208 — rain impacts on sphere bump tension (CONTACT_FORCE_EVENTS)
- #209 — shatter VFX on game-over + three-quarter camera framing

### v3.0.0 — Vite + Koota migration (April 2026)

PR #201 retired Next.js (basePath gymnastics, Turbopack/Webpack split, slow
HMR) for Vite 8, and unified state/entities under Koota (replacing Zustand +
Miniplex). Old store APIs survived via thin shims; v4 dropped the shims when
the UI framework went away.

Also in v3: Capacitor 8.3 native wrapping, responsive camera, cross-platform
E2E runner, branch protection on main requiring "CI Success", all GitHub
Actions pinned to exact SHAs.

### v2.0.0 — Babylon.js + Reactylon (Feb 2026)

Ground-up rebuild from R3F to Next.js + Babylon + Reactylon. Established the
load-bearing creative decisions still in v4:
1. **De-humanized AI** — fragile glass sphere instead of a humanoid bust
2. **Pattern stabilization** as the core mechanic
3. **Buried deterministic seed** drives procedural generation
4. **Garage-door keycaps** rising mechanically through the rim
5. **Symmetric titles** — "COGNITIVE DISSONANCE" → "COGNITION SHATTERED"

### v1.0.0 — Original R3F version

Vite + React Three Fiber + Miniplex + Web Worker game loop. Raymarched SDF
enemies, 3D mechanical keyboard, NS-5 android bust. Superseded by v2.

---

## Known Issues

- SonarCloud "Automatic Analysis enabled" admin warning fails the SonarCloud
  job on every CI run. Non-blocking — `CI Success` doesn't depend on it. Real
  fix is in SonarCloud project settings (disable Automatic Analysis).
- E2E bridge tier (specs that wait for `window.__world`) is skipped in CI on
  SwiftShader because rapier WASM init takes ~30s under software rendering.
  Canvas tier always runs and gives smoke coverage.
- Android APK builds but `native/App.tsx` shell hasn't been wired to game
  components — the APK opens to an empty scene. iOS works through Capacitor's
  WebView.

---

## Active Decisions

- **Cabinet engine framing** — see STANDARDS.md "Architectural North Star".
  Adding new gameplay = new `inputSchema` + new system. Never new render path.
- **Vite 8** — client-side-only WebGL game; no SSR; no routes.
- **Raw three.js** — no UI framework. The cabinet renders to a single canvas.
- **Koota ECS** — one world owns both global state (singletons) and entities.
- **Rapier3D** — physics chosen via research (see docs/PHYSICS_RESEARCH.md).
  Fixed-step substep accumulator, contact-force events for impact-driven
  tension.
- **Biome 2.4** — replaces ESLint. Single binary, zero plugin deps.
- **GSAP for mechanical animations** — CustomEase, timeline, stagger.
- **Tone.js exclusive audio** — no other audio engine.
- **Capacitor, not React Native** — we wrap the web build in a WebView.
- **Exact SHA pins for all GitHub Actions** — floating refs forbidden;
  Dependabot manages updates.
