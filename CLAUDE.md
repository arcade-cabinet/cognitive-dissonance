# Claude Code Instructions — Cognitive Dissonance

## How to Use This File

This file contains **Claude-specific** development instructions. For project
documentation, see:

- **[AGENTS.md](./AGENTS.md)** — Cross-agent memory bank (architecture, patterns, tech context)
- **[README.md](./README.md)** — Installation, controls, architecture overview
- **[STANDARDS.md](./STANDARDS.md)** — Non-negotiable code + visual standards
- **[docs/STATE.md](./docs/STATE.md)** — Current project state, next priorities

Always read AGENTS.md before starting work. Update AGENTS.md after significant changes.

## Design Vision (Critical)

The visual target is a **fragile glass sphere containing a celestial nebula
shader** sitting on a **heavy industrial black metal platter**. The sphere
degrades from calm blue to violent red as tension rises. Pattern stabilization
is the core gameplay — hold matching keycaps to pull back escaping corruption.
Everything is diegetic — no HUD, just the machine.

## Commands

```bash
pnpm dev               # Vite dev server
pnpm build             # Production static build (dist/)
pnpm start             # Vite preview of dist/
pnpm lint              # Biome check (0 errors, 0 warnings)
pnpm lint:fix          # Biome auto-fix
pnpm format            # Biome format
pnpm test              # Vitest unit tests
pnpm test:browser      # Vitest browser mode — real WebGL via Playwright
pnpm test:e2e          # Playwright E2E (xvfb on Linux, direct on macOS)
pnpm cap:sync:ios      # Build web + sync to ios/
pnpm cap:sync:android  # Build web + sync to android/
```

## Key Architecture Decisions

- **Cabinet engine framing** — see [STANDARDS.md](./STANDARDS.md) and
  [docs/LORE.md](./docs/LORE.md). One chassis (platter, sphere, rain,
  corruption); per-level variation through `Level.inputSchema` + a system in
  `src/sim/systems/`. Never new render paths per game.
- **Vite 8**: Bundler, dev server, static export to `dist/`. Client-side only —
  no SSR, no routes.
- **Raw three.js 0.183**: No UI framework wrapper. The cabinet renders to a
  single canvas; the cabinet IS the menu.
- **Render loop**: `requestAnimationFrame` calls `cabinet.render(dt)` from
  `src/main.ts`. Never driven by any framework render cycle.
- **Rapier3D physics**: WASM emitted via `vite-plugin-wasm`. Fixed 60Hz step
  with substep accumulator (max 5 substeps/frame). Sphere is a kinematic
  collider with `CONTACT_FORCE_EVENTS` so rain impacts can drive tension.
- **GSAP for animations**: CustomEase for mechanical motion (keycaps, platter).
- **CSP-safe shaders**: All GLSL lives as static string literals registered
  with three's `ShaderMaterial`. CSP permits `wasm-unsafe-eval` (rapier) and
  `unsafe-eval` (Koota JIT trait accessors).
- **Koota ECS**: Single world owns both global singleton traits (Game, Level,
  Seed, Input, Audio) and entity traits (IsSphere/IsEnemy/IsPattern +
  Position/Enemy/Pattern data). Replaces Zustand and Miniplex.
- **Tone.js exclusive**: All audio. First-gesture initialised from `boot/audio.ts`.
- **Biome 2.4**: Linting + formatting.
- **Capacitor 8.3**: Native iOS + Android by wrapping the Vite web build in
  a WebView. Not React Native.

## Conventions

- System monospace fonts (Courier New) — no external font dependencies
- `pnpm` package manager
- All game code under `src/`; cabinet under `src/three/`; sim under `src/sim/`

## File Structure

```
index.html       Vite HTML entry — single canvas, no DOM UI
src/
  main.ts        Entry — creates canvas, world, cabinet, rAF loop
  three/         Cabinet pieces
    cabinet.ts          orchestrator (scene/camera/physics/renderer/composer)
    industrial-platter.ts
    ai-core.ts          glass sphere + nebula shader
    sky-rain.ts         rapier-driven debris pool
    shatter.ts          48-shard glass pool for game-over
    emergent-controls.ts level-parameterized control rig
    pattern-trails.ts    visualises Pattern entities
    post-process-corruption.ts
  sim/           Koota world, traits, systems
    world.ts     createWorld() + Game/Level/Seed/Input/Audio singletons
    traits.ts    All trait definitions
    actions.ts   Discrete mutations
    systems/     pattern-stabilizer (30Hz), tension-driver (per-frame)
  boot/          First-gesture audio + input + game-over listeners
  lib/           Shader sources, RNG, math helpers
e2e/             Playwright E2E tests (smoke, gameplay, governor)
android/         Capacitor Android project (synced from dist/)
ios/             Capacitor iOS project (synced from dist/)
docs/            Architecture, design, lore, deployment, state
```

## Testing

The project has three test layers — all three run in CI:

- **Vitest unit** (`pnpm test`): pure logic, no DOM. `src/**/__tests__/*.test.ts`.
- **Vitest browser** (`pnpm test:browser`): real Chromium via Playwright,
  real WebGL via ANGLE (Mac/Windows) or SwiftShader (CI/Linux). Files end in
  `*.browser.test.tsx`. Serial execution (`fileParallelism: false`) to avoid
  dep optimizer races.
- **Playwright E2E** (`pnpm test:e2e`): full static build via `vite preview`.
  18 specs covering smoke, gameplay, and governor (automated player).
