# AGENTS.md — Cognitive Dissonance Cross-Agent Memory Bank

> Persistent context for AI agents working on Cognitive Dissonance.
> Read this file at the start of every task. Update it after significant changes.
> Deep context lives in `docs/memory-bank/` — read those files for full detail.
>
> The full Grok conversation corpus is in `docs/memory-bank/grok-doc/` (165 indexed turns, 52 prose docs, 7 shader-port turns, 26 definitive code extractions) and `docs/code-fragments/` (170 versioned iterations). Read `docs/memory-bank/grok-doc/main-conversation/INDEX.md` first — it maps every design decision. The live code in `src/` is the implementation; the corpus is the design intent.

---

## Project Brief

Cognitive Dissonance is a haunting interactive 3D browser experience where you hold a fragile glass AI mind together as its own thoughts try to escape. Built with Babylon.js 8, Reactylon 3.5, Next.js 16, GSAP, Tone.js, and Zustand.

### Core Loop

1. Glass sphere with celestial nebula shader sits on heavy industrial platter
2. Corruption patterns (colored tendrils) escape from sphere center to rim
3. Hold matching colored keycaps on the platter to pull them back
4. Missed patterns spawn holographic SDF enemies (neon-raymarcher + crystalline-cube)
5. Enemies reaching sphere = tension spike + glass degradation
6. At 100% tension → sphere shatters → "COGNITION SHATTERED" → game over
7. Endless with logarithmic advancement, high replay value from buried seed

---

## System Patterns

### Architecture

```
Next.js 16 App Router (Turbopack)
├── src/app/page.tsx → dynamic import GameBoard (ssr: false)
├── GameBoard (2D React + Tailwind)
│   ├── ATCShader background
│   ├── Title overlay
│   └── Game-over overlay
├── GameScene (Reactylon Engine/Scene)
│   ├── Declarative: hemisphericLight, pointLight, arcRotateCamera
│   ├── AISphere (glass + celestial shader)
│   ├── Platter (industrial base + GSAP garage-door keycaps)
│   ├── PatternStabilizer (core gameplay)
│   ├── EnemySpawner (Yuka AI + SDF shader enemies)
│   ├── PostProcessCorruption (chromatic aberration + noise)
│   ├── SPSEnemies (SolidParticleSystem visuals)
│   ├── DiegeticGUI (coherence ring on platter)
│   ├── SpatialAudio (Tone.js event-driven procedural SFX, module: [`src/components/spatial-audio.tsx`](src/components/spatial-audio.tsx))
│   └── AudioEngine (Tone.js adaptive score)
└── State Layer (Zustand)
    ├── seed-store (seedrandom)
    ├── level-store (tension, coherence, level)
    ├── audio-store (Tone.js bridge)
    ├── game-store (phase)
    └── input-store (keycap state)
```

### Key Patterns

- **Imperative 3D**: All Babylon.js meshes/materials created in useEffect, not JSX
- **Reactylon JSX**: Lowercase tags for lights/camera (`<hemisphericLight>`, `<arcRotateCamera>`)
- **Render loop**: `scene.registerBeforeRender(fn)` / `scene.unregisterBeforeRender(fn)`
- **GSAP + Babylon**: gsap.to(mesh.position, {...}) works natively with Vector3
- **CSP-safe shaders**: All GLSL in Effect.ShadersStore as static string literals
- **SSR bypass**: All 3D code in 'use client' files, loaded via dynamic({ ssr: false })
- **Zustand bridge**: Cross-component state sync (tension, coherence, seed)
- **Turbopack + Babel**: babel.config.js has @babel/preset-typescript + babel-plugin-reactylon. Turbopack uses Babel for user code, SWC for internals.

---

## Tech Context

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1 | App Router, Turbopack bundler |
| React | 19 | UI components |
| TypeScript | 5.9 | Type safety |
| Babylon.js | 8.51 | 3D rendering engine |
| Reactylon | 3.5.4 | Declarative Babylon.js + React |
| GSAP | 3.12 | Advanced animations |
| Tone.js | 14.8 | Adaptive spatial audio |
| Zustand | 5 | Global state management |
| Miniplex | 2 | Entity Component System |
| Yuka.js | 0.7 | Enemy AI behaviors |
| seedrandom | 3.0 | Deterministic procedural generation |
| Tailwind CSS | 4 | 2D overlay styling |
| Biome | 2.4 | Linting + formatting |
| Playwright | 1.58 | E2E testing (headed + xvfb) |
| Vitest | 4.0 | Unit testing |

### Commands

```bash
pnpm dev          # Development server (Turbopack)
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # Biome check (0 errors, 0 warnings)
pnpm test         # Vitest unit tests (run `pnpm test` for current totals)
pnpm test:e2e     # Playwright E2E via xvfb-run (run `pnpm test:e2e` for current totals)
```

---

## Development History

### v2.0.0 — Full Engine Migration (Feb 2026)

Complete ground-up rebuild from Vite + R3F + Three.js to Next.js + Babylon.js + Reactylon.

**Foundation fix (current branch `feat/reactylon-migration`):**
- Upgraded Next.js 15 → 16 (Turbopack default)
- Upgraded React 18 → 19
- Replaced ESLint with Biome 2.4.1
- Configured babel-plugin-reactylon to work with Turbopack
- Migrated all game code into src/ directory
- Added 11 Playwright E2E tests (all passing)
- Build: ~11s. Dev startup: 440ms.

**Key design decisions (distilled from original Grok conversations):**

1. **De-humanized the AI** — Replaced NS-5 android bust with fragile glass sphere
2. **Pattern stabilization** — Core mechanic: hold keycaps to pull back corruption
3. **Buried seed** — Hidden deterministic seed drives all procedural generation
4. **Garage-door keycaps** — Mechanical emergence from platter rim with GSAP
5. **Symmetric titles** — "COGNITIVE DISSONANCE" → "COGNITION SHATTERED"
6. **Babylon.js migration** — Full port from Three.js/R3F for XR + WebGPU readiness
7. **CSP safety** — All shaders as static strings, no eval/dynamic code

### v1.0.0 — Original R3F Version

Vite + React Three Fiber + Three.js + Miniplex + Web Worker game loop.
Raymarched SDF enemies, 3D mechanical keyboard, NS-5 android bust.

---

## Known Issues

- Physics-keys are constrained via Havok 6DoF; tune `src/components/physics-keys.tsx` constraint keys `LINEAR_Y.minLimit/maxLimit` (travel) and `LINEAR_Y.stiffness/damping` + `setAxisMotorMaxForce` (spring), then validate via `pnpm test:e2e:headed` visual QA pass.
- XR hand tracking is stub only — pinch→keycap mapping not wired
- Runtime visual quality not yet verified (compiles and loads, but no human eye-test)
- React Native peer dep warnings from reactylon transitive deps (harmless)
- Mobile touch: keycap hit areas may need enlargement

---

## Active Decisions

- **Next.js 16 + Turbopack** — Default bundler, dramatically faster than webpack
- **Biome 2.4** — Replaced ESLint (single binary, zero plugin deps)
- **forceWebGL={true}** — Safest for complex GLSL raymarchers
- **Zustand over Miniplex for cross-component state** — Simpler bridge pattern
- **GSAP for all mechanical animations** — CustomEase, timeline, stagger
- **Tone.js exclusive audio** — Babylon audio engine disabled
- **pnpm** — Package manager
