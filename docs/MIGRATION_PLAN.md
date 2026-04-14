---
title: v4 Migration — Three.js + three-text (no framework)
updated: 2026-04-14
status: current
domain: technical
---

# Migration Plan — v4 (no framework)

## Decision

**Drop every UI framework.** v4 is:

| Layer | Tech |
|---|---|
| Rendering | three.js 0.183 |
| Text (diegetic) | three-text 0.6 |
| Postprocessing | postprocessing 6 (pmndrs) |
| ECS / state | koota (kept) |
| Motion | gsap 3 + CustomEase (kept) |
| Audio | tone.js (kept) |
| AI steering | yuka (kept) |
| RNG | seedrandom (kept) |
| Native wrap | Capacitor 8 (kept) |
| Build / dev | Vite 8 + Biome 2 (kept) |

No React, no Solid, no R3F, no drei, no Reactylon, no Babylon. The cabinet has a single procedurally-populated scene; nothing that a game-engine-level library would solve for us is worth its weight.

## Rationale

- **100% procedural game** — one scene, hand-built with Koota ECS driving everything. No scene transitions, no asset pipeline, no collision system beyond what we author, no script runtime, no animation blending.
- **Visuals are the identity** — validated in the research/ visual isolation pass that raw three.js renders identical-or-better fidelity vs Babylon, and that pmndrs/postprocessing gives the composable Effect pipeline we want for escalation states.
- **Cabinet is the menu** — keycap emergence replaces a landing page; "new game / continue" are encoded as different input schemas the emergence animation materialises. No HTML menu system is needed.
- **Smallest bundle** — three (~600KB gzip ~160KB) + postprocessing (~80KB / 25KB) + three-text (~60KB / 18KB) + our app code + koota/gsap/tone. No framework runtime overhead per frame. Expected total ~350KB gzip vs the old Babylon+Reactylon 1.1MB gzip.

## Phased Plan

### Phase 0 — Scaffold

- [ ] Branch `migrate/solid` → rename to `migrate/v4` to reflect "no framework"
- [ ] `pnpm remove @babylonjs/* reactylon babel-plugin-reactylon react react-dom @types/react @types/react-dom @vitejs/plugin-react solid-js vite-plugin-solid`
- [ ] `pnpm add three postprocessing three-stdlib three-text`
- [ ] Rewrite `vite.config.ts` — drop all framework plugins, keep alias + manualChunks
- [ ] Rewrite `vitest.browser.config.ts` same way
- [ ] Tighten CSP — drop `wasm-unsafe-eval` (Havok gone)
- [ ] Drop stale `.next/` artifacts

### Phase 1 — Cabinet module (`src/three/`)

Port the research shaders into src/three/ (already done on research branch):

- `cabinet.ts` — the scene orchestrator: renderer, camera, lights, environment, every cabinet piece, render loop
- `ai-core.ts` — glass shell + celestial nebula composite
- `industrial-platter.ts` — brushed anisotropic metal disc
- `emergent-controls.ts` — level-parameterised input rig (keycap / handle / slider)
- `sky-rain.ts` — InstancedMesh falling cubes
- `atc-scanner.ts` — overlay HUD band
- `post-process-corruption.ts` — pmndrs EffectComposer CorruptionEffect
- `celestial-nebula.ts`, `glass-sphere.ts` — shared material factories

### Phase 2 — App shell (`src/main.ts` + `src/boot/`)

Zero framework. Plain TS + DOM:

- `src/main.ts` — bootstrap: create canvas, mount into `#root`, call `createCabinet({ canvas, world })`, kick off rAF loop
- `src/boot/boot-overlay.ts` — the "INITIALIZING CORE" DOM element with CSS transitions; fades itself out after WebGL first frame
- `src/boot/input.ts` — keyboard + pointer + touch event listeners that dispatch into Koota `Input` trait
- `src/boot/audio-init.ts` — first-gesture handler that kicks Tone.js

### Phase 3 — Level schema + cabinet parameters

Level trait carries:

- `inputSchema: ControlSpec[]` — drives emergent-controls rebuild
- `rotation: { direction, speedRad }` — platter spin
- `wobble: { maxTiltRad, tensionCoupling }` — tension-driven tilt

A level definition is the complete game-mode spec. Add one more level (push-pull) to prove the engine is truly polymorphic before release.

### Phase 4 — Remove legacy

Delete the `src/components/` + `src/store/` Zustand shims + `src/game/` Miniplex shim + all `@babylonjs` imports. Run lint, run tests, rebuild bundle.

### Phase 5 — Test + ship

- `pnpm lint` — 0 errors / 0 warnings
- `pnpm test` — all unit pass (Koota ECS + pure logic)
- `pnpm test:browser` — research/ isolation screenshots + src/three/ isolation screenshots
- `pnpm test:e2e` — Playwright hits canvas directly (selectors already fall back to `canvas`)
- `pnpm cap:sync` — iOS + Android sync clean
- Capacitor live-run smoke on both platforms
- Single PR to main, release-please bumps to 4.0.0

## Success Criteria

1. Bundle ≤ 350KB gzip
2. No framework dependency — `pnpm why react` and `pnpm why solid-js` both empty
3. Keycap emergence animation plays on boot with no intermediate menu
4. Glass AI sphere renders with visible refraction + iridescence at high tension
5. Platter rotation + wobble are level-parameterized
6. CSP blocks everything except `self` + `unsafe-eval` (Koota JIT) and inline styles
7. All three test layers pass in CI
