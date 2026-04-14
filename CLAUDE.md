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

- **Vite 8**: Bundler, dev server, static export. Client-side only — no SSR,
  no routes. Migrated from Next.js 16 in v3 because Next's overhead wasn't
  earning its keep.
- **Babylon.js 8 + Reactylon 3.5**: Declarative React bindings for Babylon.
- **babel-plugin-reactylon**: Auto-registers Babylon classes for lowercase
  JSX tags. Runs inside `@vitejs/plugin-react` v4's Babel pass.
- **Imperative mesh creation**: All 3D objects created in `useEffect`, not
  JSX (except lights + camera).
- **Render loop**: `scene.onBeforeRenderObservable.add(fn)` with cleanup in
  the effect's teardown. Never driven by React render cycle.
- **GSAP for animations**: `gsap.to(mesh.position, {...})` works natively
  with Babylon's Vector3.
- **CSP-safe shaders**: All GLSL in `BABYLON.Effect.ShadersStore` as static
  string literals. CSP permits `wasm-unsafe-eval` (Havok physics) + `unsafe-eval`
  (Koota JIT trait accessors).
- **Koota ECS for state**: Single world holds global singleton traits (Game,
  Level, Seed, Input, Audio) + entity traits (IsSphere/IsEnemy/IsPattern +
  Position/Enemy/Pattern data). Replaces both Zustand and Miniplex in v3.
- **Store shim layer**: `src/store/*-store.ts` preserves the Zustand call-site
  API but routes through Koota. Keeps migration non-invasive.
- **Tone.js exclusive**: Babylon audioEngine disabled, Tone.js handles all
  sound.
- **Biome 2.4**: Linting + formatting (replaced ESLint — single binary, zero
  plugin deps).
- **Capacitor 8.3**: Native iOS + Android by wrapping the Vite web build in
  a WebView. Not React Native.

## Conventions

- Tailwind CSS 4 for 2D overlays
- System monospace fonts (Courier New) — no external font dependencies
- Lowercase Reactylon JSX tags: `<hemisphericLight>`, `<arcRotateCamera>`,
  `<pointLight>`
- `pnpm` package manager (no `packageManager` pin in package.json — CI
  installs latest via `pnpm/action-setup@v6.0.0`'s `version: latest`)
- All game code under `src/`; sim layer under `src/sim/`

## File Structure

```
index.html       Vite HTML entry
src/
  main.tsx       React root (createRoot + GameBoard)
  styles.css     Tailwind + global styles
  components/    All game components (3D + 2D)
  sim/           Koota world, traits, actions
    world.ts     createWorld() + Game/Level/Seed/Input/Audio singletons
    traits.ts    All trait definitions (singleton + entity)
    actions.ts   Discrete mutations (setPhase, setTension, generateNewSeed, ...)
  store/         Koota-backed shims preserving Zustand API shape
  game/          Miniplex-compat shim over Koota (world.add/remove)
  lib/           Utilities + shader definitions (GLSL)
  types/         TypeScript declarations
e2e/             Playwright E2E tests (smoke, gameplay, governor)
android/         Capacitor Android project (synced from dist/)
ios/             Capacitor iOS project (synced from dist/)
docs/            Architecture, design, deployment, state
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
