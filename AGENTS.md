# AGENTS.md - Cross-Agent Memory Bank

> Persistent context for AI agents working on Cognitive Dissonance.
> Read this file at the start of every task. Update it after significant changes.

---

## Project Brief

Cognitive Dissonance is a 3D browser game where players defend an NS-5 android from hallucinations (cognitive distortions) descending as holographic SDF shapes. Counter denial, delusion, and fallacy before cognitive overload triggers a head explosion. Built with React, TypeScript, React Three Fiber (3D), Tone.js (adaptive music), and Miniplex ECS. Deployed as a PWA and native mobile app via Capacitor.

### Core Loop

1. Cognitive distortions (raymarched SDF enemies) descend toward the android's head
2. Player counters them by type (Reality/History/Logic) via 3D keyboard F-keys or click
3. Missed distortions increase the overload meter
4. At 100% overload → head explodes → game over with grading (S/A/B/C/D)
5. Tension escalates continuously: relaxed shoulders → bunched/locked → head explosion

### Key Goals

- **Photorealistic procedural visuals** — See `docs/DESIGN_VISION.md` for the full specification. NO low-poly, NO placeholder primitives. Complex curves, PBR materials, procedural textures, sophisticated lighting.
- **Rear bust composition** — Camera behind/above the NS-5 android. Back of head, shoulders, keyboard row. Tension communicated through body language.
- **Visceral tension escalation** — Continuous shoulder bunching, head trembling, cable tension, energy crackling. Culminates in an effects-driven head explosion (anime.js).
- **Raymarched SDF enemies** — Denial (sphere-lid), Delusion (octahedron), Fallacy (twisted torus) with holographic iridescent materials
- **3D keyboard as entire UI** — Mechanical keyboard with dynamic keycaps, RGB backlighting tied to panic, menu keys flanking spacebar
- Fun, rewarding escalation from calm to full panic
- Unpredictable boss encounters (missile-command style)
- Ship quality: all checks pass (lint, types, tests, build)

---

## System Patterns

### Architecture

```text
Presentation Layer (Main Thread)
├── React Components (UI/HUD) — Game.tsx (direct render, no routing)
├── R3F Canvas (3D Scene) — GameScene.tsx
│   ├── AtmosphericBackground — Dark atmosphere, monitor glow, rim light
│   ├── CharacterBust — Rear bust: back of head (hair), shoulders (t-shirt), neck
│   ├── KeyboardControls — 3D mechanical keyboard (F-keys, spacebar, menu keys) with RGB
│   ├── EnemySystem — Raymarched SDF enemies with holographic iridescence
│   ├── BossSystem — Pulsing boss with orbiting orbs
│   ├── ParticleSystem — Burst particles on counter
│   ├── TrailSystem — Ring trails on counter
│   └── ConfettiSystem — Victory confetti
├── Tone.js Music — Adaptive layers that intensify with panic/wave
└── Anime.js — UI animations (HUD, overlays)

Business Logic Layer (Web Worker)
├── GameLogic — Enemy spawning, collision, panic calc, scoring
├── Event Queue — SFX triggers, visual effects, feed updates
└── Boss Management — Boss phases, attacks, HP

ECS Layer (Miniplex)
├── World — Entity definitions (position, velocity, enemy, boss, particle, etc.)
├── Archetypes — enemies, bosses, particles, trails, confettis, powerUps
├── State Sync — Bridges worker GameState → ECS entities each frame
└── React Bindings — miniplex-react createReactAPI

Platform Layer
├── Capacitor — iOS/Android native runtime
├── IndexedDB — Persistent high scores (via idb)
└── PWA — Service worker, offline support
```

### Key Patterns

- **Worker → Main → ECS → R3F**: Game logic in worker, state synced to ECS, R3F systems render ECS entities
- **Ref-based updates**: GameScene uses refs (not state) for 60fps updates without React re-renders
- **Event-driven VFX**: Particles/trails/confetti spawned by event handlers, not synced from worker
- **UI state reducer**: Game.tsx uses `useReducer` with actions defined in `src/lib/ui-state.ts`
- **Grading**: Extracted to `src/lib/grading.ts` — S/A/B/C/D based on accuracy and max combo
- **No routing**: Game renders directly from App.tsx (no Landing page, no react-router-dom)
- **No monoliths**: Logic lives in `/lib/`, not in `.tsx` files. Components are thin rendering layers.

### Spinal Systems (AI + Panic)

- **Panic Escalation** (`panic-system.ts`): Logarithmic sigmoid damage curve, natural combo-based decay, zones (Calm/Uneasy/Panicked/Meltdown), hysteresis on tension levels, dynamic difficulty modifiers
- **AI Director** (`ai/director.ts`): Yuka.js StateMachine with 4 states (Building/Sustaining/Relieving/Surging), observes player performance, adjusts spawn rate, speed, max enemies, boss aggression
- **Boss AI** (`ai/boss-ai.ts`): Yuka.js Vehicle + Think + GoalEvaluators. Goals: BurstAttack, SweepAttack, SpiralAttack, Reposition, Summon, Rage. Unpredictable pattern selection based on HP ratio, aggression, and randomness

### Coordinate System

- Game space: 800x600 (GAME_WIDTH x GAME_HEIGHT)
- Scene space: x mapped to (-4, 4), y mapped to (3, -3) via `gx()` / `gy()` helpers
- Shared `src/components/scene/coordinates.ts` provides `gx()`/`gy()` — all rendering systems import from there

---

## Tech Context

### Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI components |
| TypeScript | 5.9 | Type safety |
| Vite | 7.3 | Build tool, dev server, worker bundling |
| Three.js | 0.182 | 3D rendering |
| @react-three/fiber | 9.5 | React renderer for Three.js |
| @react-three/drei | 10.7 | R3F helpers (Text, Billboard, Line) |
| Miniplex | 2.0 | Entity Component System |
| miniplex-react | 2.0.1 | React bindings for Miniplex (`createReactAPI`) |
| Tone.js | 15.1 | Adaptive music system |
| Yuka.js | 0.7.8 | Game AI (steering, FSM, goal-driven agents) |
| Anime.js | 4.3 | UI animations |
| Capacitor | 8.1 | Native mobile (iOS/Android) |
| Biome | 2.3 | Linter + formatter |
| Vitest | 4.0 | Unit tests |
| Playwright | 1.58 | E2E tests |
| @testing-library/react | 16.3 | Component tests (RTL) |

### Critical Package Notes

- **`miniplex-react`** is the correct React bindings package. NOT `@miniplex/react` (incompatible monorepo package).
- `miniplex-react` exports `createReactAPI` as **default export**, provides `<ECS.Entities in={bucket}>` component.
- Miniplex eventery uses `subscribe()` which returns an unsubscribe function (not `add`/`remove`).
- **Yuka.js** runs in the **Web Worker** (no DOM dependency). Bundled into `game.worker.js`, not a separate vendor chunk.
- `@types/yuka` (v0.7.4) lags behind `yuka` (v0.7.8) — some newer APIs may need custom declarations.

### Build Chunks (vite.config.ts)

```text
vendor-react, vendor-three, vendor-tone, vendor-anime, game-utils, game-ecs
Game chunk (lazy loaded): Game-*.js (~43KB) — deferred until /game route
```

### Commands

```bash
pnpm dev          # Dev server
pnpm build        # Production build (runs typecheck + icon gen first)
pnpm typecheck    # TypeScript check
pnpm lint         # Biome lint
pnpm lint:fix     # Auto-fix lint
pnpm test         # Unit tests (277 tests)
pnpm test:e2e     # E2E tests (Playwright)
```

---

## File Structure

```text
src/
├── components/
│   ├── Game.tsx              # Main game component (R3F Canvas + HUD + worker comm)
│   ├── Landing.tsx           # Legacy landing page (no longer routed)
│   ├── Landing.test.tsx      # Landing page RTL component tests (legacy)
│   └── scene/
│       ├── GameScene.tsx     # R3F scene orchestrator (camera, shake, flash)
│       ├── CharacterBust.tsx  # NS-5 android rear bust (procedural)
│       ├── KeyboardControls.tsx # 3D mechanical keyboard (F-keys, spacebar, menu keys, RGB)
│       ├── AtmosphericBackground.tsx # Dark atmosphere, monitor glow, rim light
│       └── systems/
│           ├── EnemySystem.tsx    # Raymarched SDF enemy rendering
│           ├── BossSystem.tsx     # ECS boss rendering
│           └── ParticleSystem.tsx # Particles, trails, confetti
├── ecs/
│   ├── world.ts              # Miniplex World + Entity type + archetypes
│   ├── react.ts              # createReactAPI bindings (from miniplex-react)
│   └── state-sync.ts         # Worker GameState → ECS bridge + VFX spawners
├── lib/
│   ├── game-logic.ts         # Core game engine (runs in worker)
│   ├── events.ts             # GameEvent + GameState types
│   ├── types.ts              # Enemy, Boss, PowerUp types
│   ├── constants.ts          # TYPES, WAVES, POWERUPS, FEED data
│   ├── audio.ts              # Web Audio SFX system
│   ├── music.ts              # Tone.js adaptive music
│   ├── grading.ts            # Grade calculation (S/A/B/C/D)
│   ├── grading.test.ts       # Grading system tests
│   ├── panic-system.ts       # Panic escalation (sigmoid curves, decay, zones)
│   ├── ai/
│   │   ├── index.ts          # AI module barrel export
│   │   ├── director.ts       # Yuka FSM AI Director (dynamic difficulty)
│   │   └── boss-ai.ts        # Yuka goal-driven boss behavior
│   ├── ui-state.ts           # UI state reducer + actions
│   ├── ui-state.test.ts      # UI reducer tests (14 cases)
│   ├── storage.ts            # IndexedDB high score persistence
│   ├── device-utils.ts       # Responsive viewport calculations
│   └── capacitor-device.ts   # Native device detection
├── design/
│   └── tokens.ts             # Design token system (350+ tokens)
├── styles/
│   ├── game.css              # Game styles + grade animations
│   ├── index.css             # Global styles
│   └── landing.css           # Landing page styles
├── worker/
│   └── game.worker.ts        # Web Worker entry point
├── App.tsx                   # App root (renders Game directly)
├── main.tsx                  # React entry point
└── test/
    └── setup.ts              # Vitest setup (RTL cleanup + jest-dom)

e2e/
├── game.spec.ts              # Core game smoke tests
├── playthrough.spec.ts       # Full game lifecycle tests
├── governor.spec.ts          # Automated playthrough tests
├── device-responsive.spec.ts # Multi-device responsive tests
└── helpers/
    ├── game-helpers.ts       # Shared DRY test utilities
    ├── game-governor.ts      # Automated game controller
    └── screenshot-utils.ts   # WebGL/Canvas screenshot utilities
```

---

## Active Context

### Current Focus

**Cognitive Dissonance rebrand complete.** Game identity is now fully aligned: metallic technopunk aesthetic, raymarched SDF enemies, 3D mechanical keyboard as sole UI, NS-5 android bust with continuous tension escalation.

### Recent Changes

- **Cognitive Dissonance rebrand** — Full identity overhaul:
  - Enemy types: DENIAL (orange sphere-lid), DELUSION (green octahedron), FALLACY (purple torus)
  - Waves: Mild Dissonance → Double Think → Cognitive Overload → Rationalization → Total Dissolution
  - Bosses: THE ECHO CHAMBER, THE GRAND DELUSION
  - Data model: `EnemyType.icon` (emoji) → `EnemyType.shape` (EnemyShape union)
- **Raymarched SDF enemy system** — Per-object fragment shaders with signed distance functions
  - Holographic iridescent materials with fresnel rim glow
  - Encrypted enemies: dark metallic, no iridescence
- **Keycap portrait system** — Mini raymarched SDFs on keycap surfaces during gameplay
- **Menu keys flanking spacebar** — NEW GAME (left, play triangle SDF) and CONTINUE (right, fast-forward SDF)
- **Landing page removed** — No more react-router-dom, Game renders directly from App.tsx
- **Title overlay** — "COGNITIVE DISSONANCE" with metallic gradient text and RGB chromatic aberration animation
- **Typography** — System monospace fonts (Courier New), no external font dependencies (CSP-safe)
- **Design tokens rebranded** — Primary palette: brushed steel (#c0c8d8), secondary: cyan (#00ccff)
- **3D keyboard as complete UI** — Dynamic keycaps, space bar, RGB backlighting tied to panic
- **NS-5 android bust** — Rear composition, continuous tension escalation, head explosion game over

### Next Steps

1. **Panic/AI tuning** — Balance sigmoid curve, decay rates, zone thresholds
2. **Boss AI tuning** — Attack cooldowns, aggression scaling, rage threshold
3. **Visual regression baselines** — Playwright screenshot comparison
4. **Reactylon migration evaluation** — Potential R3F → Reactylon for XR support and native perf

### Active Decisions

- **No routing** — Game renders at `/` directly, no Landing page, no react-router-dom
- **Rear bust composition** — Camera behind the android. Back of head + shoulders + keyboard.
- **Head explosion game over** — Effects-driven (anime.js + Three.js particles)
- **Continuous tension** — Panic 0-100 directly drives all deformation
- **3D keyboard is the UI** — F1-F4, spacebar, menu keys are the primary inputs; hidden HTML buttons for e2e
- **Raymarched SDF enemies** — Per-object billboard quads with custom GLSL fragment shaders
- Coordinate space: 800x600 game → (-4,4) / (3,-3) scene via `gx()`/`gy()` helpers
- VFX (particles, trails, confetti) spawned by events, not synced from worker
- Music layers controlled by panic level and wave number
- Yuka.js runs entirely in the Web Worker alongside GameLogic

---

## Progress

### Completed

- [x] R3F 3D rendering (replacing PixiJS 2D)
- [x] Miniplex ECS with proper miniplex-react bindings
- [x] Raymarched SDF enemy system (denial=sphere-lid, delusion=octahedron, fallacy=torus)
- [x] Holographic iridescent enemy materials with fresnel rim glow
- [x] Keycap portrait system (mini raymarched SDFs on keycap surfaces)
- [x] ECS boss system with pulse, orbs, iFrame flash
- [x] ECS particle/trail/confetti VFX systems
- [x] Tone.js adaptive music (layers respond to panic + wave)
- [x] Camera shake and flash overlay
- [x] Grading system (S/A/B/C/D with accuracy + combo)
- [x] UI state extraction (reducer pattern)
- [x] Panic Escalation System (sigmoid damage, combo decay, zones, hysteresis)
- [x] AI Director (Yuka FSM: Building/Sustaining/Relieving/Surging)
- [x] Boss AI (Yuka goal-driven: Burst/Sweep/Spiral/Reposition/Summon/Rage)
- [x] **3D Mechanical Keyboard UI** (F-keys, spacebar, menu keys, RGB backlighting, cooldown vis)
- [x] **Cognitive Dissonance rebrand** (enemy types, waves, bosses, UI, docs)
- [x] **NS-5 Android Bust** (rear composition, continuous tension, head explosion)
- [x] **Landing page removed** (direct render, no react-router-dom)
- [x] **Design tokens rebranded** (metallic technopunk: brushed steel + cyan)
- [x] **E2E Test DRY Refactor** (shared helpers, F-key controls, screenshots)
- [x] **277 unit tests passing**, 0 lint warnings, 0 type errors

### In Progress

- [ ] Panic/AI tuning and balance (requires playtesting)
- [ ] Reactylon migration evaluation (R3F → Reactylon for XR + native perf)

### Known Issues

- Three.js vendor chunk is ~1.2MB (gzipped ~333KB) — inherent to Three.js
- Visual regression baselines not yet established
- Landing.tsx and landing.css still exist as dead files (not routed)

### Architecture Decisions Log

| Decision | Rationale |
|---|---|
| R3F over PixiJS | 3D aesthetic, PBR materials, lighting |
| Miniplex ECS | Clean entity management for particles, enemies, bosses |
| `miniplex-react` (not `@miniplex/react`) | Only compatible React bindings for `miniplex@2.0.0` |
| Tone.js | Real-time adaptive music with synth layers |
| Ref-based scene updates | Avoid React re-renders at 60fps |
| Worker for game logic | Keep main thread free for rendering |
| Logic in `/lib/`, not `.tsx` | No monolith components; thin rendering layers |
| 3D keyboard as entire UI | Visual storytelling (RGB → panic), physical feedback |
| Raymarched SDF enemies | Per-object GLSL shaders, holographic iridescence, no mesh geometry |
| Rear bust over full-body diorama | Fewer surfaces = better photorealism, player identification |
| Head explosion game over | Effects-driven (anime.js + Three.js particles) |
| No routing / no Landing page | Game renders directly at `/`, no react-router-dom overhead |
| System monospace fonts | CSP-safe (`font-src 'self'`), no external font dependencies |
| Shared E2E helpers | DRY test utilities, consistent patterns across all test suites |
