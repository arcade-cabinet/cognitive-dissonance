# Changelog

All notable changes to Cognitive Dissonance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-04-14

### Added
- **Koota ECS** (`koota@0.6.6`) — single world holds both global singleton
  state (Game, Level, Seed, Input, Audio traits) and game entities (IsSphere,
  IsEnemy, IsPattern tags + Enemy/Pattern/Sphere data).
- **Capacitor 8.3** native wrapping — Android APK + iOS simulator build on
  every push to main via CD workflow. Platform plugins for device, haptics,
  status bar, splash screen, screen orientation, app lifecycle.
- **Responsive scaling** via `src/lib/device.ts` with Capacitor `@capacitor/device`
  detection + browser fallback. Phone portrait gets wider camera framing
  (radius 11, beta π/2.5); desktop keeps the default 3/4 angle.
- **ResizeObserver + orientationchange handler** on the Babylon canvas — camera
  recomputes framing on rotation/resize instead of freezing at initial aspect.
- **STANDARDS.md** (root) — non-negotiable code + visual + architecture rules.
- **docs/STATE.md** — current project state, active work, deliberately-out-of-scope
  list, next priorities.
- **Vitest browser mode** — 48 component tests using real Chromium + real WebGL
  via Playwright. Tests every game component in isolation at the render level.
- **Cross-platform E2E runner** (`scripts/run-e2e.mjs`) — xvfb-run on Linux,
  direct on macOS/Windows.
- **Branch protection** on `main` requiring `CI Success` status check (enables
  proper Dependabot auto-merge gating).

### Changed
- **Next.js 16 → Vite 8** — this is a client-side WebGL game, not a web app.
  Dropping Next removed basePath gymnastics, Turbopack/Webpack dual-mode,
  Babel-for-user/SWC-for-internals split, and dev-server slowness. Vite gives
  us instant HMR, single build pipeline, ~10s production builds, and a clean
  static `dist/` that Capacitor wraps directly.
- **Zustand + Miniplex → Koota** (shim-compatible) — all 5 Zustand stores are
  now thin proxies to Koota singleton traits; Miniplex `World` is a compat
  shim over Koota `spawn/destroy`. Call sites unchanged — migration was
  drop-in at the API layer.
- **All GitHub Actions pinned to exact commit SHAs** (latest stable releases).
  Floating refs forbidden. Dependabot updates SHAs predictably.
- **Accessibility viewport** — removed `maximumScale: 1` / `userScalable: false`
  that previously blocked browser zoom for low-vision users.
- **pnpm/action-setup v6.0.0** — uses Node.js 24, supports pnpm 11. Picks up
  pnpm version via `version: latest` input (no `packageManager` pin in
  package.json).
- **Package version** bumped from 2.0.0 → 3.0.0.

### Removed
- **Next.js** (`next`) and its ecosystem (`babel-loader`, `@babel/core`,
  `@babel/preset-typescript`, `@babel/runtime`) — replaced by Vite.
- **Zustand** (`zustand`) — state now in Koota singleton traits.
- **Miniplex** (`miniplex`) — entities now in Koota with traits.
- **Stale React Native scaffolding** (`native/` directory) — superseded by
  Capacitor web-wrap approach.
- **Unused Android `activity_main.xml`** — Capacitor BridgeActivity uses its
  own layout.
- **`'use client'` directives** from 14 components — Vite doesn't need them.

### Fixed
- **Lockfile regression** from March — `pnpm-lock.yaml` had a duplicate
  `@types/node` entry that blocked CI installs. Regenerated clean.
- **Babylon.js version drift** — `@babylonjs/core`, `/gui`, `/loaders` now all
  at matching 8.53+ range (core was stuck at 8.52 while siblings were 8.53).
- **Enemy spawn grace period** — enemy-spawner now spawns immediately on
  title→playing transition (was delayed by full `spawnInterval`, up to 1.8s).
- **Accumulator burst on phase resume** — pattern-stabilizer + enemy-spawner
  reset their fixed-step accumulators during non-playing phases so a long
  title screen doesn't trigger multiple rapid ticks on resume.
- **`window.__scene` leak** — only cleared on disposal if this scene still
  owns the reference (protects against overlapping scene lifetimes).
- **Vitest browser test cold-cache flake** — dep optimization for
  `@babylonjs/core/Buffers/buffer.align` was discovered mid-run and
  invalidated in-flight module fetches. Now explicitly pre-bundled;
  `fileParallelism: false` removes the race window entirely.
- **CSP for Havok + Koota** — added `wasm-unsafe-eval` (Havok physics wasm
  compilation) and `unsafe-eval` (Koota's JIT-compiled trait accessors).

## [2.0.0] - 2026-02-15

Complete ground-up rebuild from Vite + React Three Fiber + Three.js to Next.js
16 + Babylon.js 8 + Reactylon 3.5. Full visual redesign around the fragile
glass sphere + heavy industrial platter aesthetic. Pattern stabilization became
the core gameplay loop, replacing the earlier enemy-match mechanic.

## [1.0.0] - 2026-02-15

### Added
- Initial release of the game (originally distributed under a different name)
- WebGL rendering via PixiJS
- Web Worker-based game loop for 60 FPS performance
- Wave-based enemy spawning with boss fights
- Panic meter + character transformation states
- Combo and scoring systems
- Power-ups (time warp, clarity, score multiplier)
- Particle effects and dynamic audio
- PWA support with offline capability
- E2E testing with Playwright, unit testing with Vitest

[Unreleased]: https://github.com/arcade-cabinet/cognitive-dissonance/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/arcade-cabinet/cognitive-dissonance/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/arcade-cabinet/cognitive-dissonance/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/arcade-cabinet/cognitive-dissonance/releases/tag/v1.0.0
