---
title: R3F Migration Plan — Cabinet Engine v4
updated: 2026-04-14
status: current
domain: technical
---

# Migration Plan — From Babylon/Reactylon to R3F/drei/postprocessing

## Decision

**Babylon.js + Reactylon are scrapped.** v4 adopts:

- **three** (0.183) — engine
- **@react-three/fiber** (R3F) — React reconciler for Three
- **@react-three/drei** — prebuilt helpers (PerformanceMonitor, Environment,
  Instances, MeshTransmissionMaterial, etc.)
- **postprocessing** (pmndrs) — Effect pipeline (replaces the inline Babylon
  post-process, the chromatic-aberration custom GLSL, etc.)
- **three-stdlib** — examples that used to live under `three/examples/jsm/*`

Rationale: the five research shaders (celestial nebula, crystalline cube,
neon raymarcher, post-process corruption, ATC scanner) plus three material
pieces (glass sphere, industrial platter, AI core composite) were ported
from Babylon → Three in ~five hours. Every port improved visual quality.
Transmission, anisotropy, PMREM reflections, and the Effect-class
composition pattern land out-of-the-box results that Babylon required hand-
tuning to approximate. Continuing with Babylon has negative ROI.

See screenshots at
`research/__tests__/__screenshots__/*` for the evidence set (each visual
piece captured in isolation across 2-3 tension states).

## Re-framing: This Is a Cabinet Engine

During the research pass it became clear that Cognitive Dissonance is not a
single game — it's a **cabinet engine** that hosts a family of games.
Architecturally this means:

1. The **chassis** (platter, AI sphere, rim, sky rain, post-process corruption,
   ATC scanner frame) is fixed infrastructure, versioned as library code.
2. **Levels** are data that declare:
   - An **input schema** — what controls emerge from the rim slits
     (pattern-match keycaps, push/pull handles, numbered sequence keys,
     sliders, mixed)
   - A **goal function** — what the player is trying to accomplish
   - **Failure / tension sources** — what pushes the AI toward collapse
   - **Platter motion** — rotation direction + speed, wobble profile
3. The existing "pattern stabilization" game is *one level type*. Future
   levels (sequence memory, push-pull tug-of-war, rhythm, etc.) reuse the
   same cabinet with different schemas.

This reframing drives every architectural decision below.

## Core Gameplay Pillars (newly captured)

The visual + mechanical chassis rests on these pillars. Every level uses
all of them:

1. **Glass AI sphere** — tension display, celestial nebula shifts palette
   under stress, frosts / irises under crisis
2. **Emergent controls** — level-parameterized input set that rises through
   rim slits with mechanical stagger
3. **Platter rotation** — continuous spin, direction + speed parameterized
   by level
4. **Platter wobble** — tension-driven tilt destabilization; high tension
   makes the disc unsteady, fighting the player's inputs
5. **Sky rain** — atmospheric reinforcement, density scales with tension
6. **Post-process corruption** — chromatic aberration + grain + vignette +
   scanlines escalate with tension
7. **Spatial audio** — every diegetic surface emits positionally (not a new
   pillar, but preserved)

## Target Stack (v4)

| Layer | Tech | Replaces |
|---|---|---|
| Engine | three 0.183 | @babylonjs/core 9 |
| Reconciler | @react-three/fiber 8 | reactylon 3.5 + babel-plugin-reactylon |
| Helpers | @react-three/drei 9 | Babylon MeshBuilder + examples |
| Postprocessing | postprocessing 6 (pmndrs) | @babylonjs/postProcess |
| ECS | koota (kept) | — |
| Animations | gsap 3 (kept) | — |
| Audio | tone.js (kept) | — |
| State shims | `src/store/*-store.ts` (kept) | — |
| Physics | none (removed) | @babylonjs/havok (unused after port) |

## What Stays

- Koota ECS (world, traits, actions) — already engine-agnostic
- `src/sim/*` — pure simulation logic, no Babylon imports
- `src/store/*-store.ts` — Zustand-shaped Koota shims
- GSAP + CustomEase curves — same easing values work with Three's
  Vector3/Quaternion (GSAP is Babylon-agnostic)
- Tone.js audio
- Biome lint config, Vite build, Playwright E2E harness
- Capacitor 8.3 native wrap (iOS + Android)

## What's Deleted

| Package | Why |
|---|---|
| `@babylonjs/core` | engine replaced |
| `@babylonjs/gui` | using R3F overlays + HTML for 2D UI |
| `@babylonjs/loaders` | glTF via drei `<useGLTF>` or three-stdlib |
| `@babylonjs/havok` | physics unused post-port; can reintroduce rapier if needed |
| `@babylonjs/materials` | unused in v3 already |
| `reactylon` | replaced by R3F |
| `babel-plugin-reactylon` | no lowercase-tag transform needed |

Bundle size win: Babylon core+gui+loaders+havok ≈ 1.1 MB gzip. Three + R3F +
drei + postprocessing ≈ 380 KB gzip. Net: ~−65%.

## Phased Plan

### Phase 0 — Scaffold (0.5d)

Branch: `migrate/r3f`

- [ ] Add deps: `three`, `@react-three/fiber`, `@react-three/drei`,
      `postprocessing`, `three-stdlib`
- [ ] Remove Babylon deps from package.json (but keep code compiling — see
      Phase 1 for the kill switch)
- [ ] Update `vite.config.ts`: drop `babel-plugin-reactylon`, keep
      `@vitejs/plugin-react` on v4 (R3F only needs JSX, no Babel plugin)
- [ ] Update `vitest.browser.config.ts`: drop `babel-plugin-reactylon`,
      drop babylon optimizeDeps, add `three`, `@react-three/fiber`,
      `postprocessing` to include list
- [ ] Update CSP: can drop `wasm-unsafe-eval` (Havok removed); keep
      `unsafe-eval` for Koota JIT accessors

### Phase 1 — Cabinet Chassis Port (2d)

Port fixed-chassis components in dependency order. Each ships behind a
feature flag so the Babylon version keeps running until every piece lands.

Order (atomic commits each):

1. **three-root.tsx** — `<Canvas>` + camera + lighting + PMREM environment
2. **industrial-platter.tsx** — port from `research/shaders/industrial-platter.ts`
   (already written). Add `rotation` + `wobble` refs.
3. **ai-sphere.tsx** — port from `research/shaders/ai-core.ts` (glass +
   celestial nebula composite, already written)
4. **atc-scanner.tsx** — port from `research/shaders/atc-scanner.ts`
5. **sky-rain.tsx** — port from `research/shaders/sky-rain.ts` (InstancedMesh)
6. **post-process-corruption.tsx** — port from
   `research/shaders/post-process-corruption.ts` (EffectComposer +
   CorruptionEffect, already rewritten with modern pmndrs API)

Each of these already has a passing `*.browser.test.ts` screenshot. Port =
lift the pure-Three code into a React component that subscribes to Koota
via `useTrait` for its tension/phase inputs.

### Phase 2 — Emergent Controls Rig (1d)

Build the level-parameterized input system (already designed in
`research/shaders/emergent-controls.ts`):

- `<EmergentControls schema={level.inputSchema} />`
- Support kinds: `keycap`, `handle`, `slider` (extensible)
- `emerge()` animation hook — staggered rise through rim slits using
  existing GSAP `CustomEase('heavyMechanical')`
- Per-control `setPressed(0..1)` physical travel
- Hook up existing keyboard + pointer input handlers to the new rig

Delete the fixed-12-keycap code in `platter.tsx` once the level-driven rig
runs the default pattern-match level.

### Phase 3 — Gameplay Adjustments (1.5d)

These are the game-design changes we captured during research. They are
NOT post-port polish; they are the v4 gameplay baseline.

1. **Level input schema**
   Add a `level.inputSchema: ControlSpec[]` field to the Level trait. The
   default "pattern match 12" level builds this schema from the current
   `KEYCAP_COLORS` palette. Any future level declares its own.

2. **Platter rotation**
   Add `level.rotation: { direction: 1 | -1; speedRad: number }` to the
   Level trait. Current implicit behavior becomes the default
   `{ direction: 1, speedRad: 0.165 }`. Hook into platter.tsx's render loop.

3. **Platter wobble**
   Add `level.wobble: { maxTiltRad: number; tensionCoupling: number }` to
   Level. Drive the platter group's `rotation.x` and `rotation.z` with a
   two-axis oscillator whose amplitude scales with current tension
   (`maxTiltRad * tension^2`, say). Wobble is the physical metaphor for
   "the system is losing stability."

4. **Enemy rain variance**
   Color variance (cyan base, occasional red shards past tension > 0.5),
   size variance (0.2–0.5), turbulent drift, impact flash on platter. All
   already in `research/shaders/sky-rain.ts`.

5. **Glass sphere crisis iridescence**
   Already in `research/shaders/glass-sphere.ts`. Stress fractures kick in
   at tension > 0.5. Ship as-is.

6. **Post-process corruption modern API**
   Ship the rewritten `CorruptionEffect` (Effect class pattern, composable
   with any other effects we add later like bloom / color grading).

### Phase 4 — Remove Babylon (0.5d)

- [ ] Delete `src/components/*.tsx` files that were pure Babylon (the old
      platter.tsx, ai-sphere.tsx, sps-enemies.tsx, post-process-corruption.tsx,
      game-scene.tsx)
- [ ] Delete `src/lib/shaders/celestial.ts` (Babylon variant — use research
      port)
- [ ] Delete `src/lib/shaders/crystalline-cube.ts` (same)
- [ ] Drop Babylon unhandledError suppression from `vitest.browser.config.ts`
- [ ] Uninstall Babylon packages
- [ ] Drop `babel-plugin-reactylon`
- [ ] Drop Havok wasm file from `public/`
- [ ] Tighten CSP (remove `wasm-unsafe-eval`)

### Phase 5 — Test & Ship (1d)

- [ ] All Vitest unit tests pass (none touch the engine)
- [ ] All Vitest browser tests pass — rewrite the Babylon-specific ones as
      R3F isolation tests (same idea, different API)
- [ ] All Playwright E2E tests pass — these black-box the game through the
      canvas, so most should continue to work; a few selectors for debug
      overlays may need updates
- [ ] Capacitor sync for iOS + Android — new smaller bundle ships
- [ ] Single PR to main. Release-please bumps to v4.0.0.

## Test Strategy

Keep the three-layer pyramid:

- **Unit** — pure sim logic (Koota world, traits, actions). No engine.
- **Browser isolation** — each visual component rendered standalone with
  `toMatchScreenshot`. The research/ folder proves this pattern works;
  convert src/components/*.browser.test.tsx to R3F versions that use
  `<Canvas>` + a test camera + `expect(canvas).toMatchScreenshot()`.
- **E2E** — Playwright drives the full app.

Visual regression gate: all isolation screenshots must match. When a shader
is intentionally changed, reviewer regenerates the reference screenshot and
the PR shows the diff inline.

## Risks

1. **R3F reconciler overhead** — R3F is a separate reconciler; large scenes
   can be slower than hand-rolled Three if poorly structured. Mitigation:
   use `<Instances>` / drei primitives; avoid re-creating geometry on
   React rerender.
2. **GSAP + React refs** — tweening refs that point at meshes inside R3F
   scenes works, but we need to be careful about tween cleanup on unmount.
3. **PMREM on mobile** — `RoomEnvironment` + PMREM is fine on desktop;
   on low-end Android GPU it might be a frame-rate cost. Ship a
   downgraded env (static low-res equirect PNG) behind a device tier check
   if we see regressions.
4. **Playwright E2E selectors** — any test that reaches into Babylon's
   scene object via `window.` hooks will break. Grep first.

## Timeline

| Phase | Effort | Deps |
|---|---|---|
| 0 — Scaffold | 0.5d | — |
| 1 — Chassis port | 2d | 0 |
| 2 — Emergent controls | 1d | 1 |
| 3 — Gameplay adjustments | 1.5d | 2 |
| 4 — Remove Babylon | 0.5d | 3 |
| 5 — Test & ship | 1d | 4 |
| **Total** | **6.5d** | — |

Single branch `migrate/r3f`, single PR to main when all phases green.

## Success Criteria

1. All research-validated visuals render in the game with equal-or-better
   quality than current Babylon build
2. Bundle size down ≥ 50%
3. Level input schema works end-to-end: can declare a level with a
   non-default schema (push/pull handles) and it renders correctly
4. Platter rotation and wobble are level-parameterized, not hardcoded
5. All three test layers pass in CI
6. APK + web deploy cleanly
