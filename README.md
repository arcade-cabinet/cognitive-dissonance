# Cognitive Dissonance

A haunting interactive 3D experience where you hold a fragile glass AI mind
together as its own thoughts try to escape. Plays in any modern browser, and
ships as iOS + Android native apps via Capacitor.

## Stack

- **Next.js 16** (Turbopack dev, Webpack prod, static export) — App Router
- **Babylon.js 8.56** + **Reactylon 3.5** — declarative 3D React bindings
- **GSAP 3.14** — mechanical animations (keycaps, platter, CustomEase)
- **Tone.js 15** — adaptive spatial audio score
- **Zustand 5** — state (tension, coherence, seed, input)
- **Miniplex 2** — ECS for game entities
- **Yuka 0.7** — enemy AI behaviors
- **Capacitor 8.3** — iOS + Android native wrapping (WebView bridge)
- **Tailwind CSS 4** — 2D overlay styling
- **Biome 2.4** — lint + format (replaced ESLint)
- **Vitest 4** (unit + browser mode) + **Playwright** (E2E)

## Getting started

```bash
pnpm install
pnpm dev          # Turbopack dev server (~440ms startup)
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
pnpm dev               # Dev server (Turbopack)
pnpm build             # Production build (static export ~11s)
pnpm start             # Production server
pnpm lint              # Biome check (0 errors, 0 warnings)
pnpm lint:fix          # Biome auto-fix
pnpm test              # Vitest unit tests (60 tests)
pnpm test:browser      # Vitest browser mode — real WebGL (48 tests)
pnpm test:e2e          # Playwright E2E via xvfb-run (17 tests)
```

### Native (Capacitor)

```bash
pnpm cap:sync:ios          # Build web + sync to ios/
pnpm cap:sync:android      # Build web + sync to android/
pnpm cap:open:ios          # Open ios/App in Xcode
pnpm cap:open:android      # Open android/ in Android Studio
pnpm cap:run:ios           # Sync + run on iOS simulator
pnpm cap:run:android       # Sync + run on Android device/emulator
```

The native apps wrap the same web build in a WebView — no separate codebase.
Platform APIs (device info, haptics, status bar, splash, screen orientation)
are exposed via Capacitor plugins.

## Architecture

```
src/
  app/            Next.js App Router (layout, page, globals.css)
  components/     Game components (3D + 2D)
  store/          Zustand stores (seed, level, audio, game, input)
  lib/            Utilities + shader definitions (GLSL)
  game/           Miniplex ECS world
  types/          TypeScript declarations
e2e/              Playwright E2E tests
android/          Capacitor Android project (auto-synced)
ios/              Capacitor iOS project (auto-synced)
docs/             Architecture, design, deployment
```

## Game design

A **fragile glass sphere** containing a **celestial nebula shader** sits on a
**heavy industrial black metal platter**. The sphere degrades from calm blue
to violent red as tension rises. **Corruption patterns** (colored tendrils)
escape from the sphere center toward the rim. Hold matching colored keycaps
on the platter to pull them back. Missed patterns spawn **holographic SDF
enemies**. At 100% tension the sphere shatters — "COGNITION SHATTERED."

Everything is diegetic — no HUD. Coherence displays as a glowing ring on the
platter. Audio evolves from calm drone to frantic glitch percussion. Endless
with logarithmic advancement, high replay from a buried deterministic seed.

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Claude Code / agent instructions
- [AGENTS.md](./AGENTS.md) — Cross-agent memory bank
- [STANDARDS.md](./STANDARDS.md) — Non-negotiable code + visual standards
- [docs/STATE.md](./docs/STATE.md) — Current project state and roadmap
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design
- [docs/DESIGN.md](./docs/DESIGN.md) — Visual vision and identity
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Deploy procedures

## License

MIT
