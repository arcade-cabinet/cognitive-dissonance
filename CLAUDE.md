# Claude Code Instructions — Cognitive Dissonance

## How to Use This File

This file contains **Claude-specific** development instructions. For project documentation, see:

- **[AGENTS.md](./AGENTS.md)** — Cross-agent memory bank (architecture, patterns, tech context)
- **[README.md](./README.md)** — Installation, controls, architecture overview
- **[docs/memory-bank/](./docs/memory-bank/)** — Cline-style memory bank (6 core files + design decisions)

Always read AGENTS.md before starting work. Update AGENTS.md and docs/memory-bank/ after significant changes.

> The full Grok conversation corpus lives in `docs/memory-bank/grok-doc/` and `docs/code-fragments/`. Start with `docs/memory-bank/grok-doc/main-conversation/INDEX.md` to navigate. Read `docs/memory-bank/handoff.md` for the complete implementation roadmap.

## Design Vision (Critical)

The visual target is a **fragile glass sphere containing a celestial nebula shader** sitting on a **heavy industrial black metal platter**. The sphere degrades from calm blue to violent red as tension rises. Pattern stabilization is the core gameplay — hold matching keycaps to pull back escaping corruption. Everything is diegetic — no HUD, just the machine.

## Commands

```bash
pnpm dev          # Dev server (Turbopack, 440ms startup)
pnpm build        # Production build (Turbopack, ~14s)
pnpm start        # Production server
pnpm lint         # Biome check (0 errors, 0 warnings)
pnpm lint:fix     # Biome auto-fix
pnpm format       # Biome format
pnpm test         # Vitest unit tests (48 tests)
pnpm test:e2e     # Playwright E2E via xvfb-run (17 tests, headed WebGL)
```

## Key Architecture Decisions

- **Next.js 16 + Turbopack**: Default bundler, 440ms dev startup, ~11s builds
- **Babylon.js 8 + Reactylon 3.5**: Declarative React bindings for Babylon.js
- **babel-plugin-reactylon**: Auto-registers Babylon.js classes for lowercase JSX. Turbopack uses Babel for user code, SWC for Next.js internals — no performance penalty.
- **Imperative mesh creation**: All 3D objects created in useEffect, not JSX (except lights/camera)
- **Render loop**: `scene.registerBeforeRender(fn)` / `scene.unregisterBeforeRender(fn)`
- **GSAP for animations**: gsap.to(mesh.position, {...}) works natively with Babylon.js Vector3
- **CSP-safe shaders**: All GLSL stored in `BABYLON.Effect.ShadersStore` as static string literals
- **SSR bypass**: All 3D in `'use client'` files, loaded via `dynamic({ ssr: false })`
- **Zustand for state**: Tension, coherence, seed — bridges Babylon.js render loop to React
- **Tone.js exclusive**: Babylon.js audioEngine disabled, Tone.js handles all sound
- **Biome 2.4**: Linting + formatting (replaced ESLint — single binary, zero plugin deps)
- **Playwright**: E2E testing with headless Chromium

## Conventions

- Tailwind CSS for 2D overlays
- System monospace fonts (Courier New) — no external font dependencies
- Lowercase Reactylon JSX tags: `<hemisphericLight>`, `<arcRotateCamera>`, `<pointLight>`
- `pnpm` package manager
- All game code under `src/`

## File Structure

```
src/
  app/          Next.js App Router (layout, page, globals.css)
  components/   All game components (3D + 2D)
  store/        Zustand stores (seed, level, audio, game, input)
  lib/          Utilities + shader definitions
  game/         Miniplex ECS world
  types/        TypeScript declarations
e2e/            Playwright E2E tests (smoke, gameplay, governor)
docs/
  memory-bank/  Cline-style memory bank (6 core files)
```
