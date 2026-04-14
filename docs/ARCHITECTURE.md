---
title: Architecture
updated: 2026-04-13
status: current
domain: technical
---

# Architecture — Cognitive Dissonance v2

> **For design rationale**: See `DESIGN.md`

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5.9**
- **Babylon.js 8.56** + **Reactylon 3.5.4** (declarative 3D)
- **GSAP 3.14** (CustomEase, MotionPath, Flip) + **Tone.js 15** (adaptive spatial audio)
- **Zustand 5** (state) + **Miniplex 2** (ECS) + **Yuka.js 0.7** (enemy AI)
- **seedrandom 3.0** (buried seed) + **Tailwind CSS 4** (2D overlays)
- **Biome 2.4** (lint/format) + **Vitest 4** (tests) + **Playwright 1.58** (E2E)
- **pnpm 10.26** (package manager)

## Commands

```bash
pnpm dev          # Dev server (Turbopack, 440ms startup)
pnpm build        # Production build (~21s)
pnpm start        # Production server
pnpm lint         # Biome check (0 errors, 0 warnings)
pnpm test         # Vitest unit tests (60 tests)
pnpm test:e2e     # Playwright E2E tests (includes build + xvfb-run)
```

## System Architecture

```text
Next.js 16 App Router (Turbopack)
├── app/page.tsx: dynamic import of GameBoard with ssr: false
├── GameBoard (2D React + Tailwind):
│   ├── ATCShader background (WebGL2, CSP-safe)
│   ├── Title overlay ("COGNITIVE DISSONANCE")
│   ├── Clarity overlay ("COHERENCE MAINTAINED")
│   ├── Game-over overlay ("COGNITION SHATTERED")
│   └── Zustand store bridge (window.__zustand_*)
├── GameScene (Reactylon Engine/Scene):
│   ├── Declarative: hemisphericLight, pointLight, arcRotateCamera
│   ├── AISphere: glass PBR sphere + celestial ShaderMaterial + moment of clarity + restart ritual
│   ├── Platter: cylinders + boxes + GSAP garage-door + dust particles + recess glow + colored keycaps
│   ├── PatternStabilizer: particle systems for escaping tendrils + per-color matching
│   ├── EnemySpawner: Yuka AI + SDF shader enemies + split behavior
│   ├── PostProcessCorruption: chromatic aberration + noise + vignette
│   ├── SPSEnemies: SolidParticleSystem visuals
│   ├── DiegeticGUI: two-layer coherence arc (background ring + foreground tube)
│   ├── SpatialAudio: 3 Tone.js procedural synths (whoosh, chime, shatter)
│   ├── AudioEngine: Tone.js adaptive score bridge
│   ├── PhysicsKeys: Havok 6DoF constrained keycaps
│   └── XRSession: WebXR stub with hand tracking
└── State Layer (Zustand):
    ├── seed-store: buried seed (seedrandom)
    ├── level-store: tension, coherence, level
    ├── audio-store: Tone.js bridge
    ├── game-store: phase (title/playing/paused/gameover)
    └── input-store: keycap hold state (Set<number>)
```

## Key Patterns

### 1. Imperative Mesh Creation

All Babylon.js meshes/materials created in `useEffect`, NOT as JSX. Only lights and camera use Reactylon JSX (`<hemisphericLight>`, `<arcRotateCamera>`, `<pointLight>`).

### 2. Render Loop

`scene.onBeforeRenderObservable.add(fn)` / `scene.onBeforeRenderObservable.remove(observer)`

### 3. CSP-Safe Shader Store

All GLSL in `BABYLON.Effect.ShadersStore` as static string constants. No eval, no dynamic Function constructors.

### 4. GSAP + Babylon.js

`gsap.to(mesh.position, {...})` works natively with Vector3 number properties. CustomEase for mechanical feel.

### 5. SSR Bypass

All 3D code in `'use client'` files loaded via `dynamic({ ssr: false })`.

### 6. Zustand Bridge

Render loop reads `useLevelStore.getState().tension`. React subscribes normally. Stores exposed on window for E2E.

### 7. Turbopack + Babel

`babel.config.js` has only `@babel/preset-typescript` + `babel-plugin-reactylon`. Turbopack uses Babel for user code, SWC for Next.js internals.

### 8. Engine Config

`forceWebGL={true}`, `engineOptions` for antialias/adaptToDeviceRatio/audioEngine:false.

### 9. Per-Color Keycap Matching

`src/lib/keycap-colors.ts` provides 12 evenly-spaced HSL colors. Both platter (material emissive) and pattern-stabilizer (particle color + colorIndex) import from the same source of truth. Pattern stabilization checks `heldKeycaps.has(p.colorIndex)`.

### 10. Spatial Audio Events

Pattern-stabilizer dispatches `patternEscaped` / `patternStabilized` CustomEvents. AISphere dispatches `sphereShattered`. SpatialAudio component listens and triggers Tone.js synths.

### 11. Moment of Clarity

At coherence 100, GSAP smoothly eases jitter to zero, pulses blue emissive on glass, shifts celestial shader to calm blue. After 3s, coherence drops -75, tension +0.05. No win state — just a fleeting respite.

### 12. Enemy Split Behavior

Split-behavior enemies spawn 2 half-size seeker children on contact with sphere instead of adding tension directly. Children add tension when they reach the sphere.

### 13. Diegetic Coherence Arc

`CreateTube` with a partial circular path (not `CreateTorus` — it lacks `arc` param). Throttled recreation at 2% coherence buckets.

### 14. Restart Ritual

AISphere subscribes to game-store. On phase transition to `playing` after shatter, recreates both spheres with GSAP scale-in + emissive pulse.

### 15. Physics-Based Keycaps

Havok V2 6DoF constraints. Keycaps constrained in X/Z and rotation, limited Y travel (-0.055 to +0.006), Y-axis position motor acts as spring-return.

## File Structure

```text
src/
  app/          Next.js App Router (layout, page, globals.css)
  components/   All game components (3D + 2D)
  store/        Zustand stores (seed, level, audio, game, input)
  lib/          Utilities + shader definitions
  game/         Miniplex ECS world
  types/        TypeScript declarations
e2e/            Playwright E2E tests
docs/           Documentation
  DESIGN.md               Design vision + decisions
  ARCHITECTURE.md         This file (tech architecture)
  DESIGN_SYSTEM.md        Design tokens + visual language
  DEPLOYMENT.md           Build + deploy + CI/CD
```

## Current Status (v2.0)

**Completed**:
- ✅ Glass AI sphere with celestial nebula shader
- ✅ Pattern stabilization with per-color keycap matching
- ✅ Garage-door keycaps with GSAP mechanical animations
- ✅ Industrial platter with rotating base
- ✅ Spatial audio with Tone.js procedural SFX
- ✅ Post-process corruption effects
- ✅ Enemy spawning with Yuka AI
- ✅ Physics-based Havok keycaps
- ✅ Moment of clarity at coherence 100
- ✅ Diegetic coherence ring GUI
- ✅ Buried seed system
- ✅ All tests passing (lint, build, unit, E2E, security)

**Known Limitations**:
- XR hand tracking is stub only (pinch→keycap mapping not wired)
- Mobile touch: keycap hit areas may need enlargement
- Runtime visual quality verified locally, not in CI
