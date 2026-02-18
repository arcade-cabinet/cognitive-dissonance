# Cognitive Dissonance

A haunting interactive 3D browser experience where you hold a fragile glass AI mind together as its own thoughts try to escape.

## Stack

- **Next.js 16** (Turbopack) — App Router, SSR framework
- **Babylon.js 8** + **Reactylon 3.5** — Declarative 3D rendering
- **GSAP 3.12** — Mechanical animations (garage-door keycaps, CustomEase)
- **Tone.js 14.8** — Adaptive spatial audio score
- **Zustand 5** — State management (tension, coherence, seed, input)
- **Yuka.js 0.7** — Enemy AI behaviors
- **Tailwind CSS 4** — 2D overlay styling
- **Biome 2.4** — Linting + formatting
- **Playwright** — E2E testing

## Getting Started

```bash
pnpm install
pnpm dev          # Turbopack dev server (440ms startup)
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
pnpm dev          # Development server
pnpm build        # Production build (~11s)
pnpm start        # Production server
pnpm lint         # Biome check
pnpm lint:fix     # Biome auto-fix
pnpm format       # Biome format
pnpm test:e2e     # Playwright E2E suite
```

## Architecture

```
src/
  app/            Next.js App Router (layout, page, globals.css)
  components/     All game components (3D + 2D)
  store/          Zustand stores (seed, level, audio, game, input)
  lib/            Utilities + shader definitions (GLSL)
  game/           Miniplex ECS world
  types/          TypeScript declarations
e2e/              Playwright E2E tests
docs/
  memory-bank/    Project context + design decisions
```

## Game Design

A **fragile glass sphere** containing a **celestial nebula shader** sits on a **heavy industrial black metal platter**. The sphere degrades from calm blue to violent red as tension rises. **Corruption patterns** (colored tendrils) escape from the sphere center to the rim. **Hold matching colored keycaps** on the platter to pull them back. Missed patterns spawn **holographic SDF enemies**. At 100% tension the sphere shatters — "COGNITION SHATTERED."

Everything is diegetic — no HUD. Coherence displayed as a glowing ring on the platter. Audio evolves from calm drone to frantic glitch percussion. Endless with logarithmic advancement, high replay from a buried deterministic seed.

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Cross-agent memory bank
- **[CLAUDE.md](./CLAUDE.md)** — Claude-specific instructions
- **[docs/memory-bank/](./docs/memory-bank/)** — Full project context (activeContext, progress, systemPatterns, techContext, design-decisions, handoff)

## License

MIT
