# Tech Context — Cognitive Dissonance

## Stack

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.1 | App Router, Turbopack bundler |
| React | 19 | UI components |
| TypeScript | 5.9 | Type safety |
| Babylon.js | 8.51 | 3D rendering engine |
| Reactylon | 3.5.4 | Declarative Babylon.js + React bindings |
| GSAP | 3.12 | Advanced mechanical animations |
| Tone.js | 14.8 | Adaptive spatial audio |
| Zustand | 5 | Global state management |
| Miniplex | 2 | Entity Component System |
| Yuka.js | 0.7 | Enemy AI behaviors |
| seedrandom | 3.0 | Deterministic buried seed |
| Tailwind CSS | 4 | 2D overlay styling |
| Biome | 2.4.1 | Linting + formatting (replaced ESLint) |
| Playwright | 1.58 | E2E testing |
| babel-plugin-reactylon | 1.3 | Babylon.js tree-shaking via JSX analysis |

## Commands

```bash
pnpm dev          # Dev server (Turbopack, 440ms startup)
pnpm build        # Production build (Turbopack, ~11s)
pnpm start        # Production server
pnpm lint         # Biome check
pnpm lint:fix     # Biome auto-fix
pnpm format       # Biome format
pnpm test:e2e     # Playwright E2E suite (11 tests)
```

## Constraints

- **CSP-safe**: No eval, no dynamic code generation. All shaders as static GLSL strings in `BABYLON.Effect.ShadersStore`.
- **SSR bypass**: All 3D code in `'use client'` files loaded via `dynamic({ ssr: false })`.
- **WebGL forced**: `forceWebGL={true}` on Engine for complex GLSL raymarcher compatibility.
- **Babylon audio disabled**: `audioEngine: false`. Tone.js handles all sound.
- **pnpm** package manager.
- **Node.js >= 22.11** required (Reactylon + Next.js 16).
- System fonts: Courier New monospace — no external font deps.
- **Turbopack is the bundler** (both dev and build). No custom webpack config.

## Key Dependency Notes

- Reactylon exports `Engine` from `reactylon/web`, everything else from `reactylon`
- `useScene()` hook from `reactylon` returns `BABYLON.Scene`
- `scene.registerBeforeRender(fn)` / `scene.unregisterBeforeRender(fn)` for render loops
- `babel-plugin-reactylon` auto-registers Babylon.js classes for lowercase JSX tags
- Turbopack in Next.js 16 uses Babel for user code (via `babel.config.js`) while SWC handles Next.js internals — no performance penalty
- `Effect.ShadersStore` keys: `{name}VertexShader`, `{name}FragmentShader`
- GSAP plugins must be registered once: `gsap.registerPlugin(CustomEase)`
- Zustand store action `replayLastSeed` (not `useLastSeed` — avoids React hooks naming conflict)
