# AGENTS.md - Cross-Agent Memory Bank

> Persistent context for AI agents working on Psyduck Panic.
> Read this file at the start of every task. Update it after significant changes.

---

## Project Brief

Psyduck Panic: Evolution Deluxe is a browser-based retro arcade game where players counter AI hype thought bubbles before their brother transforms into Psyduck from panic overload. Built with React, TypeScript, React Three Fiber (3D), Tone.js (adaptive music), and Miniplex ECS. Deployed as a PWA and native mobile app via Capacitor.

### Core Loop

1. Thought bubbles (enemies) float toward the player
2. Player counters them by type (Reality/History/Logic) via 3D keyboard F-keys or click
3. Missed bubbles increase the PANIC meter
4. At 100% panic → game over with grading (S/A/B/C/D)
5. Character visually transforms: Normal (0-33%) → Panic (33-66%) → Psyduck (66-100%)

### Key Goals

- Fun, rewarding escalation from calm to full panic
- Unpredictable boss encounters (missile-command style)
- Real engagement, not fixed patterns
- Ship quality: all checks pass (lint, types, tests, build)

---

## System Patterns

### Architecture

```
Presentation Layer (Main Thread)
├── React Components (UI/HUD) — Game.tsx (lazy loaded), Landing.tsx
├── R3F Canvas (3D Scene) — GameScene.tsx
│   ├── RoomBackground — 3D diorama, monitor glow shifts with panic
│   ├── CharacterModel — Normal/Panic/Psyduck states, dynamic eyes
│   ├── KeyboardControls — Interactive 3D F1-F4 mechanical keys with RGB underglow
│   ├── EnemySystem — ECS-driven enemy bubbles with glow
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
- **Lazy loading**: Game component lazy-loaded via `React.lazy()` — Three.js/R3F deferred until `/game` route
- **No monoliths**: Logic lives in `/lib/`, not in `.tsx` files. Components are thin rendering layers.

### Spinal Systems (AI + Panic)

- **Panic Escalation** (`panic-system.ts`): Logarithmic sigmoid damage curve, natural combo-based decay, zones (Calm/Uneasy/Panicked/Meltdown), hysteresis on character transformations, dynamic difficulty modifiers
- **AI Director** (`ai/director.ts`): Yuka.js StateMachine with 4 states (Building/Sustaining/Relieving/Surging), observes player performance, adjusts spawn rate, speed, max enemies, boss aggression
- **Boss AI** (`ai/boss-ai.ts`): Yuka.js Vehicle + Think + GoalEvaluators. Goals: BurstAttack, SweepAttack, SpiralAttack, Reposition, Summon, Rage. Unpredictable pattern selection based on HP ratio, aggression, and randomness

### Coordinate System

- Game space: 800x600 (GAME_WIDTH x GAME_HEIGHT)
- Scene space: x mapped to (-4, 4), y mapped to (3, -3) via `gx()` / `gy()` helpers
- Each rendering system has its own `gx`/`gy` converters

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

```
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
pnpm test         # Unit tests (94 tests)
pnpm test:e2e     # E2E tests (Playwright)
```

---

## File Structure

```
src/
├── components/
│   ├── Game.tsx              # Main game component (R3F Canvas + HUD + worker comm)
│   ├── Landing.tsx           # Landing/start screen
│   ├── Landing.test.tsx      # Landing page RTL component tests
│   ├── Layout.astro          # Astro page layout
│   └── scene/
│       ├── GameScene.tsx     # R3F scene orchestrator (camera, shake, flash)
│       ├── CharacterModel.tsx # 3D character: Normal → Panic → Psyduck
│       ├── KeyboardControls.tsx # 3D mechanical F1-F4 keys with RGB underglow
│       ├── RoomBackground.tsx # 3D diorama room (desk, window, posters, clutter)
│       └── systems/
│           ├── EnemySystem.tsx    # ECS enemy bubble rendering
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
├── App.tsx                   # React Router setup (lazy loads Game)
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

All core systems and testing infrastructure complete. Game fully playable with 3D mechanical keyboard controls. Needs playtesting for AI/panic tuning and balance.

### Recent Changes (This Session)

- **3D Mechanical Keyboard Controls** (`KeyboardControls.tsx`):
  - 4 interactive F-key meshes (F1 Reality, F2 History, F3 Logic, F4 Nuke)
  - Type-colored keycaps from design tokens (orange/green/purple/red)
  - RGB LED underglow shifting with panic (cool cyan → angry red)
  - Spring physics key depression on press + haptic feedback
  - Cooldown visualization: keycap desaturates gray → re-fills with color
  - Billboard labels (F-key number, emoji icon, ability name)
  - F1-F4 keyboard shortcuts with preventDefault
  - Hidden HTML buttons kept for e2e test IDs
- **Vibrant Visual Identity** — inspired by original 2D game:
  - Design tokens overhauled: 20+ scene colors made vibrant
  - Dual monitor glow lights, emissive screen plane, warm desk lamp
  - All scene materials use design tokens (CharacterModel, BossSystem, EnemySystem)
  - Progressive room clutter builds with wave (energy drinks, books, monitors)
- **Lazy Loading** — Game component lazy-loaded, reducing initial bundle by ~75%
- **E2E Test DRY Refactor**:
  - Created shared `game-helpers.ts` with navigateToGame, startGame, verifyHUD, etc.
  - All 4 test suites refactored to use shared helpers
  - Fixed for 3D keyboard: hidden buttons → toBeAttached, F1-F4 keys
  - Governor updated to use F1-F4 instead of 1/2/3/Q
- **New Unit Tests** (94 total, up from 59):
  - `ui-state.test.ts` — 14 tests for UI reducer (all actions)
  - `grading.test.ts` — 9 tests for grade calculation + accuracy
  - `Landing.test.tsx` — 12 RTL component tests (rendering, navigation, content)
  - Fixed flaky nuke test (now accounts for encrypted enemies)

### Next Steps

1. **Panic system tuning** — Playtesting to balance the sigmoid curve, decay rates, and zone thresholds
2. **Boss AI tuning** — Balance attack cooldowns, aggression scaling, rage threshold
3. **Visual regression testing** — Set up Playwright screenshot comparison baselines

### Active Decisions

- **3D keyboard replaces HTML buttons** — F1-F4 keys are the primary input; hidden HTML buttons remain for e2e compatibility
- Coordinate space is 800x600 game → (-4,4) / (3,-3) scene. All systems use `gx()`/`gy()` helpers.
- VFX (particles, trails, confetti) are render-only — spawned by events, not synced from worker.
- The `wave` ref is passed into systems that need wave-dependent visuals (boss emoji, room clutter).
- Music layers are controlled by panic level and wave number.
- Yuka.js runs entirely in the Web Worker alongside GameLogic.
- Boss AI communicates via BossAction queue (move/spawn_enemies/flash/shake).

---

## Progress

### Completed

- [x] R3F 3D rendering (replacing PixiJS 2D)
- [x] Miniplex ECS with proper miniplex-react bindings
- [x] 3D room diorama (desk, window, moon, stars, posters, progressive clutter)
- [x] 3D character model with Normal/Panic/Psyduck transformations
- [x] Dynamic eye system (pupil tracking speed scales with panic)
- [x] ECS enemy system with bubble glow and type icons
- [x] ECS boss system with pulse, orbs, iFrame flash
- [x] ECS particle/trail/confetti VFX systems
- [x] Tone.js adaptive music (layers respond to panic + wave)
- [x] Camera shake and flash overlay
- [x] Grading system (S/A/B/C/D with accuracy + combo)
- [x] UI state extraction (reducer pattern)
- [x] PixiJS cleanup (removed dependency + dead code)
- [x] Panic Escalation System (sigmoid damage, combo decay, zones, hysteresis)
- [x] AI Director (Yuka FSM: Building/Sustaining/Relieving/Surging)
- [x] Boss AI (Yuka goal-driven: Burst/Sweep/Spiral/Reposition/Summon/Rage)
- [x] **3D Mechanical Keyboard Controls** (F1-F4, RGB underglow, cooldown vis, haptics)
- [x] **Vibrant Visual Identity** (design tokens, emissive materials, colored lighting)
- [x] **Lazy Loading** (Game route deferred, initial bundle ~75% smaller)
- [x] **E2E Test DRY Refactor** (shared helpers, F-key controls, standardized screenshots)
- [x] **React Testing Library** component tests (Landing page: 12 tests)
- [x] **UI Reducer Tests** (14 tests) + **Grading Tests** (9 tests)
- [x] Fixed flaky nuke test (encrypted enemy handling)
- [x] All 94 unit tests passing
- [x] 0 lint warnings, 0 type errors
- [x] Production build working

### In Progress

- [ ] Panic/AI tuning and balance (requires playtesting)

### Known Issues

- Three.js vendor chunk is ~1.2MB (gzipped ~333KB) — inherent to Three.js, mitigated by lazy loading
- Visual regression baselines not yet established

### Architecture Decisions Log

| Decision | Rationale |
|---|---|
| R3F over PixiJS | 3D diorama aesthetic, better material/lighting support |
| Miniplex ECS | Clean entity management for particles, enemies, bosses |
| `miniplex-react` (not `@miniplex/react`) | Only compatible React bindings for `miniplex@2.0.0` |
| Tone.js | Real-time adaptive music with synth layers |
| Ref-based scene updates | Avoid React re-renders at 60fps |
| Worker for game logic | Keep main thread free for rendering |
| Logic in `/lib/`, not `.tsx` | No monolith components; thin rendering layers |
| 3D keyboard over HTML buttons | Visual storytelling (RGB → panic), physical feedback, diorama integration |
| Lazy loading Game route | Defer ~1.5MB of Three.js/R3F until user navigates to /game |
| Shared E2E helpers | DRY test utilities, consistent patterns across all test suites |
