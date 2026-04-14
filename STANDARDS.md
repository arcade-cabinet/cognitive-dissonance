---
title: Standards
updated: 2026-04-14
status: current
domain: quality
---

# Standards

Non-negotiable rules for this codebase. Enforced by CI (Biome lint, TypeScript,
Vitest, Playwright) and by reviewer judgment. A PR that violates any of these
does not merge.

## The Cabinet Engine (Architectural North Star)

Cognitive Dissonance is **a cabinet engine, not a single game.** The chassis is
fixed: industrial platter, recessed glass AI sphere, machined rim with input
slits, postprocessed corruption sky. That chassis never changes.

What changes per level is the **input schema** (`Level.inputSchema`) declared
on the Koota world — and the cabinet materialises matching controls through
the rim. One cabinet, many games. See [docs/LORE.md](./docs/LORE.md) for the
full framing and [docs/DESIGN.md](./docs/DESIGN.md) for visual rules.

This framing is load-bearing for every architectural choice:
- Three.js + rapier are the chassis runtime — never coupled to a level.
- New gameplay = a new `inputSchema` + a new system in `src/sim/systems/`.
  Never a new render path, never a new scene, never a new entry point.
- The platter, AI sphere, sky rain, corruption shader are **shared state**
  consumed by every level. Don't fork them per-game.

## Code quality

- **Max 300 LOC per file**, any language. Decompose by responsibility, not by
  aesthetic preference. Enforced in review.
- **Zero lint warnings, zero type errors.** `pnpm lint && pnpm exec tsc
  --noEmit` must pass clean before push. No TypeScript `any` except when typing
  unavoidable external surfaces (e.g., pnpm-dedupe'd Playwright provider).
- **Tests required for new gameplay systems.** A new spawner, shader, or state
  transition lands with either a unit test (pure logic) or a Vitest browser
  component test (renders WebGL). Pure rendering polish (shader tweaks, gsap
  tuning) is exempt — visual QA covers that.
- **No stubs, no TODOs, no `pass` bodies.** If you can't finish a system in one
  PR, decompose differently; don't merge placeholders.

## Visual design

The game's aesthetic is **diegetic, industrial, deliberate.** No exceptions.

- **No HUD.** All state — tension, coherence, keycap status, spawn queue — is
  conveyed via the fragile glass sphere and the heavy black metal platter.
  There is no 2D overlay, no corner minimap, no health bar.
- **Fonts: system monospace only** (Courier New fallback chain). No Google
  Fonts, no custom webfonts, no font loading flash.
- **Palette: two axes.**
  - Calm: cool blues (#2a4a6e → #4a8cc4). Coherent sphere, idle platter.
  - Crisis: angry reds (#8e2a2a → #c84a4a). Degrading sphere, boss spawns.
  - Neutral: matte black (#000) for the cabinet, warm off-black (#0a0806) for
    the platter.
- **Animation curves:** GSAP CustomEase exclusively for mechanical movements
  (garage-door keycaps, platter rotation). No generic ease-in-out cubics —
  they feel synthetic, not machined.
- **Lighting:** three-point setup. Key light warm-white from 3/4 angle, rim
  light cool blue from behind, fill hemispheric low-intensity. No ambient
  boost, no tone-mapped HDR — the scene is meant to feel physical, not
  cinematic.

## Architecture

- **Zero UI framework.** No React, no Vue, no Reactylon. The cabinet renders
  via raw three.js into a single canvas; the cabinet IS the menu.
  `src/three/cabinet.ts` owns the scene graph; `src/main.ts` owns the canvas
  and the rAF loop.
- **Render loop is rAF-driven.** `requestAnimationFrame` calls
  `cabinet.render(dt)` which steps physics, advances Koota systems, and
  composes the postprocessing pipeline. No React commit cycle to interfere.
- **Physics is rapier3d.** Fixed 60Hz step with substep accumulator (max 5
  substeps per frame). Kinematic colliders for the AI sphere; dynamic for sky
  rain and shatter shards. WASM is emitted to `dist/assets/` via
  `vite-plugin-wasm`.
- **State is Koota ECS.** Singleton traits (`Game`, `Level`, `Input`, `Audio`,
  `Seed`) on the world entity replace Zustand. Entity traits (`IsSphere`,
  `Pattern`, `Position`, etc.) drive per-entity systems. Renderers query;
  systems mutate.
- **Shaders are static GLSL string literals.** Defined at module import time
  in `src/lib/shaders/*` and registered with three's `ShaderMaterial`. No
  runtime shader construction from user input — CSP must permit only
  `wasm-unsafe-eval` (rapier) and `unsafe-eval` (Koota JIT trait accessors).

## Native (Capacitor)

- **Capacitor wraps the Vite static build.** The `dist/` directory from
  `vite build` is the entire native app; Capacitor's WebView loads
  `index.html` and the Capacitor plugins bridge to native APIs.
- **Don't import native-only plugins unconditionally.** Use
  `Capacitor.isNativePlatform()` to gate Device/Haptics/StatusBar calls so the
  same bundle runs on web without crashing.

## Git / CI

- **Conventional Commits.** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
  `perf:`, `test:`, `ci:`, `build:`. Squash-merge PRs.
- **All GitHub Actions pinned to exact commit SHAs**, with `# vX.Y.Z` trailing
  comment. Floating major-version refs (`@v6`) are forbidden — Dependabot
  updates pinned SHAs in a predictable, reviewable way.
- **Branch protection on `main`:** `CI Success` required to merge.
  Dependabot's auto-merge respects this. No force-push.
- **Lockfile is authoritative.** CI uses `pnpm install --frozen-lockfile`.
  If your change needs a dep, run `pnpm install` locally and commit
  `pnpm-lock.yaml` in the same change.

## Accessibility

- **Do not disable browser zoom** (no `maximumScale: 1` / `userScalable:
  false`). Low-vision players need zoom; game scaling is handled separately
  via device detection and responsive CSS.
- **Reduced motion is respected.** The `reducedMotion` prop threads from
  `prefers-reduced-motion` down to AISphere and PostProcessCorruption; both
  components visibly dampen animation when it's set.
- **Keyboard-only play must work.** All stabilization inputs are keycap keys;
  touch and pointer inputs augment but do not replace them.
