# Cognitive Dissonance

A haunting interactive 3D experience where you hold a fragile glass AI mind
together as its own thoughts try to escape. Plays in any modern browser, and
ships as iOS + Android native apps via Capacitor.

## Stack

- **Vite 8** — bundler + dev server + static build (no SSR, no routes)
- **Three.js 0.183** — raw three.js, no UI framework wrapper
- **Rapier3D 0.19** (WASM via `vite-plugin-wasm`) — physics for sky rain,
  sphere impacts, and glass shatter shards
- **postprocessing 6.39** — corruption effect pipeline
- **Koota 0.6** — ECS for both singleton state and entity systems (replaces
  the prior Zustand + Miniplex split)
- **GSAP 3.14** — mechanical motion curves (keycaps, platter, CustomEase)
- **Tone.js 15** — adaptive audio score (drone, pads, glitch noise, chimes)
- **Yuka 0.7** — enemy AI steering
- **Capacitor 8.3** — iOS + Android native wrapping (WebView around `dist/`)
- **Biome 2.4** — lint + format
- **Vitest 4** (unit + browser mode) + **Playwright** (E2E)

## Getting started

```bash
pnpm install
pnpm dev          # Vite dev server
```

Open [http://localhost:5173](http://localhost:5173).

## Commands

```bash
pnpm dev               # Vite dev server
pnpm build             # Production static build (dist/)
pnpm start             # Vite preview of dist/ on :3000
pnpm lint              # Biome check (0 errors, 0 warnings)
pnpm lint:fix          # Biome auto-fix
pnpm test              # Vitest unit tests
pnpm test:browser      # Vitest browser mode — real WebGL via Playwright
pnpm test:e2e          # Playwright E2E (canvas tier always; bridge tier skipped in CI)
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
index.html        Vite HTML entry — single canvas, no DOM UI
src/
  main.ts         Entry: creates canvas, world, cabinet, rAF loop
  three/          Cabinet pieces (platter, AI core, sky rain, shatter,
                  emergent controls, post-process corruption)
  sim/            Koota world + traits + systems (pattern stabilizer,
                  tension driver)
  boot/           First-gesture audio + input listeners + game-over hook
  lib/            Shader sources, RNG, math helpers
e2e/              Playwright E2E (smoke, gameplay, governor)
android/          Capacitor Android project (synced from dist/)
ios/              Capacitor iOS project (synced from dist/)
docs/             Architecture, design, lore, deployment
```

## Game design

The game is a **cabinet engine** — a single chassis (industrial platter,
recessed glass AI sphere, machined rim with input slits, postprocessed
corruption sky) that hosts many games. Each level declares an
`inputSchema` and the cabinet materialises matching controls through the
rim. See [docs/LORE.md](./docs/LORE.md) for the full framing and
[docs/DESIGN.md](./docs/DESIGN.md) for the visual rules.

Default loop: pattern-match. Patterns escape the sphere as colored
tendrils. Hold the matching keycap to pull them back. Tension ramps from
rain impacts and unsuppressed leaks; when coherence drains to zero the
glass shatters and the shift restarts. Everything is diegetic — no HUD.

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Claude Code / agent instructions
- [AGENTS.md](./AGENTS.md) — Cross-agent memory bank
- [STANDARDS.md](./STANDARDS.md) — Non-negotiable code + visual standards
- [docs/STATE.md](./docs/STATE.md) — Current project state and roadmap
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design
- [docs/DESIGN.md](./docs/DESIGN.md) — Visual vision and identity
- [docs/LORE.md](./docs/LORE.md) — Narrative substrate and Cabinet Engine
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Deploy procedures

## License

MIT
