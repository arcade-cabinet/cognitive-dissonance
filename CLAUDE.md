# Psyduck Panic - Memory Bank

## Project Overview

React + Three.js (R3F) typing/counter game where a developer character transforms through Normal -> Panic -> Psyduck states as a panic meter rises. Game logic runs in a Web Worker; 3D rendering via React Three Fiber + Miniplex ECS. Adaptive music via Tone.js. Boss AI via Yuka.js.

## Architecture Summary

- **Entry**: `src/App.tsx` -> `src/components/Landing.tsx` or `src/components/Game.tsx`
- **Game Logic**: `src/worker/game.worker.ts` -> `src/lib/game-logic.ts` (runs in Web Worker)
- **3D Scene**: `src/components/scene/GameScene.tsx` orchestrates all R3F children
- **ECS**: `src/ecs/world.ts` (Miniplex) + `src/ecs/state-sync.ts` (worker state -> ECS entities)
- **AI**: `src/lib/ai/director.ts` (Yuka FSM difficulty), `src/lib/ai/boss-ai.ts` (Yuka Vehicle + Think + GoalEvaluators)
- **Audio**: `src/lib/audio.ts` (Web Audio SFX), `src/lib/music.ts` (Tone.js adaptive music)
- **Device**: `src/lib/device-utils.ts` (responsive viewport, foldable detection)
- **CSS**: `src/styles/game.css` (HUD overlay, retro aesthetic)
- **CI/CD**: `.github/workflows/ci.yml` (PR), `.github/workflows/cd.yml` (main -> Pages + E2E matrix)

## State Management (Current)

**No zustand.** State is fragmented across:

- `useReducer` in Game.tsx (`uiReducer` from `src/lib/ui-state.ts`) for UI state
- `useRef` in GameScene.tsx for game state (`panicRef`, `waveRef`, `cooldownRef`, `stateRef`)
- `GameLogic` singleton in worker (source of truth)
- Props drilling: `panicRef` passes through 3 levels (GameScene -> CharacterModel -> HumanHair/Eyes)

## Determinism (Seeded RNG)

Game-state randomness uses `src/lib/rng.ts` (mulberry32 PRNG). Entity IDs use `nextId()` counter.

**Per-session determinism:** Currently `start(seed?)` defaults to `seedRng(seed ?? Date.now())`, making runs repeatable within a session only if the same seed is used. The seed is generated in `Game.tsx` and passed through the `START` worker message.

**Key symbols:** `seedRng()`, `rng()`, `nextId()`, `resetIds()` in `src/lib/rng.ts`; `start(seed?)` in `game-logic.ts`; `{ type: 'START', seed }` in `events.ts`.

**Cross-session reproducibility (not yet implemented):**

1. Accept a user-provided seed (e.g., URL query param or game modal input) and persist it (localStorage)
2. Log/expose the generated seed at game start so a session can be replayed later

**Files using seeded RNG:**

- `game-logic.ts`: All 12 calls use `rng()` + `nextId()`
- `boss-ai.ts`: All 22+ calls use `rng()`
- `ui-state.ts`: Feed IDs use sequential counter
- `music.ts`: Melody uses deterministic counter pattern
- `game-governor.ts`: E2E governor uses injected seeded PRNG
- Cosmetic-only (Math.random): `state-sync.ts`, `RoomBackground.tsx`, `CharacterModel.tsx`, `Landing.tsx`, `ParticleSystem.tsx`

## Key File Locations

| Purpose | File |
|---------|------|
| Seeded PRNG (mulberry32) | `src/lib/rng.ts` |
| Wave/enemy/boss constants | `src/lib/constants.ts` |
| Game loop + mechanics | `src/lib/game-logic.ts` |
| Panic damage/decay/zones | `src/lib/panic-system.ts` |
| Score grading | `src/lib/grading.ts` |
| UI state reducer | `src/lib/ui-state.ts` |
| Worker message types | `src/lib/events.ts` |
| Boss AI (Yuka) | `src/lib/ai/boss-ai.ts` |
| Director AI (Yuka FSM) | `src/lib/ai/director.ts` |
| Adaptive music (Tone.js) | `src/lib/music.ts` |
| SFX (Web Audio) | `src/lib/audio.ts` |
| Device/viewport utils | `src/lib/device-utils.ts` |
| Main game component | `src/components/Game.tsx` |
| 3D scene root | `src/components/scene/GameScene.tsx` |
| Character model (3 states) | `src/components/scene/CharacterModel.tsx` |
| 3D keyboard (F1-F4) | `src/components/scene/KeyboardControls.tsx` |
| Room background | `src/components/scene/RoomBackground.tsx` |
| Enemy rendering | `src/components/scene/systems/EnemySystem.tsx` |
| Boss rendering | `src/components/scene/systems/BossSystem.tsx` |
| Particles/confetti | `src/components/scene/systems/ParticleSystem.tsx` |
| ECS world + archetypes | `src/ecs/world.ts` |
| State sync (worker->ECS) | `src/ecs/state-sync.ts` |
| E2E helpers | `e2e/helpers/game-helpers.ts` |
| E2E governor | `e2e/helpers/game-governor.ts` |
| Playwright config | `playwright.config.ts` |
| CI workflow | `.github/workflows/ci.yml` |
| CD workflow | `.github/workflows/cd.yml` |
| Automerge workflow | `.github/workflows/automerge.yml` |

## Difficulty Parameters (Scalable)

| Parameter | Current Range | Location |
|-----------|---------------|----------|
| Spawn delay | 550-1800ms | constants.ts WAVES |
| Max enemies | 4-14 | constants.ts WAVES |
| Enemy speed | 1.0-1.7x | constants.ts WAVES |
| Boss HP | 12-20 | constants.ts WAVES |
| Ability cooldown | 420ms | game-logic.ts (hardcoded) |
| Nuke cooldown | 12000ms | game-logic.ts (hardcoded) |
| Director build rate | 0.03-0.08/s | director.ts |
| Boss burst count | 3-7 | boss-ai.ts |
| Boss sweep count | 5-9 | boss-ai.ts |
| Boss spiral count | 8-14 | boss-ai.ts |
| Evaluator biases | 0.5-1.2 | boss-ai.ts |

## Completed Work (PR #45)

### Commits pushed to `claude/fix-outstanding-issues-jwlJ3`

1. `01c29ab` - Fix PR review findings across CI/CD, components, and tests (22 files)
1. `e00ec3b` - Cull enemies leaving top of arena + unique power-up instance IDs
1. `9af6083` - Least-privilege CI permissions + remove dead useConditionalWait branch

### Fixes applied

- dependabot.yml: removed [skip ci] from prefix
- automerge.yml: added issues permission, fixed script injection via env vars
- ci.yml: fixed script injection (BRANCH_NAME env), least-privilege workflow permissions
- cd.yml: scoped checks:write to job level
- ARCHITECTURE.md: blank lines around fenced blocks and headings
- game.spec.ts: F1-F4 comment/code consistency
- sonar-project.properties: narrowed exclusions, quality gate
- Game.tsx: dynamic wave count (WAVES.length)
- CharacterModel.tsx: reactive panic state (useState + useFrame threshold)
- KeyboardControls.tsx: cursor cleanup on unmount
- RoomBackground.tsx: reactive wave tier
- BossSystem.tsx: null-safe waveRef
- EnemySystem.tsx: light pool/emissive optimization
- boss-ai.ts: overlapping timeout cleanup
- director.ts: extracted prune helper to deduplicate
- audio.test.ts: fake timers for counter test
- game-logic.test.ts: fixed flaky position test (Euclidean distance)
- game-logic.ts: enemy y < -60 culling, unique power-up instance IDs
- music.ts: type-safe bass union type, destroy nulling
- panic-system.test.ts: corrected test descriptions (25-49, 50-74)
- game.css: replaced deprecated clip with clip-path
- device-utils.test.ts: enhanced viewport assertions (4 new tests)
- game-helpers.ts: removed dead useConditionalWait branch

## Code Review Findings

### Resolved

1. ~~boss-ai.ts: No destroy() method~~ **FIXED** - dispose() added
1. ~~music.ts: setPanic() calls bpm.rampTo() every frame~~ **FIXED** - cancelScheduledValues() before rampTo()
1. ~~game.worker.ts: No error boundary~~ **FIXED** - try-catch with ERROR postMessage
1. ~~ui-state.ts: Feed IDs use Date.now()+Math.random()~~ **FIXED** - Sequential counter
1. ~~game.css: feedScroll/titleFloat ignore prefers-reduced-motion~~ **FIXED** - Added reduced-motion guards
1. ~~game.css: Buttons missing :focus-visible~~ **FIXED** - Added focus-visible styles

### Open

1. Landing.tsx:29-62 - anime.js animations not cancelled on unmount
1. audio.ts:87-96 - setTimeout chains not tracked; fire after destroy()
1. game-logic.ts:420 - Math.sqrt() in findEnemyAt(); use squared distance
1. ui-state.ts:19 - 'endless_transition' screen state declared but never dispatched
1. game-logic.ts:469-472 - Floating-point drift in secondAccumulator
1. director.ts:200-216 - BuildingState checks SURGING before RELIEVING
1. music.ts:244 - arpIndex increments without bound
1. game.worker.ts:7 - animationFrameId uninitialized
1. boss-ai.ts:167 - getHpRatio() not clamped
1. device-utils.ts:63-67 - Hardcoded iPhone notch dimensions (missing 15/16)
1. music.ts - No unit tests
1. game.worker.ts - No unit tests
1. game.css:168 - Panic bar relies on color alone (colorblind)
1. game.css:99-101 - Canvas uses !important to override R3F
1. ui-state.ts:83 - maxCombo updated redundantly
1. grading.ts:22 - calculateAccuracy returns 0-100, callers divide by 100

## Old index.html Translation Gaps

### Missing from 3D

1. **Speeder variant** - 1.8x speed enemies with yellow ring (completely absent)
1. **Damage numbers** - Floating "+8 PANIC", "COUNTERED!", "MISS!" text
1. **CRT scanlines** - Horizontal line overlay effect
1. **RGB border glow** - Animated cyan->magenta->yellow border (6s cycle)

### Changed from original

1. **Panic drain mechanic** removed - Old: combo >= 6 drained panic continuously. New: momentum perks (score bonus, CD reduction)
1. **Slow powerup multiplier** - Old: 0.35x, New: 0.5x
1. **Nuke boss damage** - Old: variable, New: fixed 3 HP
1. **Keyboard shortcuts** - Old: 1/2/3/Q, New: F1/F2/F3/F4

## Procedural Generation Status

All visual elements are fully procedural Three.js geometry (no image assets):

- Enemies: Colored spheres with glow, emoji icons, word labels
- Bosses: Pulsing sphere with orbiting color orbs, emoji, HP display
- Character Normal: Sphere body/head, cone hair, box arms/legs
- Character Panic: Standing hair tufts, larger eyes, raised arms, shake
- Character Psyduck: Expanded body, beak, wings, aura rings, lightning bolts
- Room: Wall, floor, desk, monitor, window, moon, stars, progressive clutter
- Keyboard: 4 F-keys with physical depression, RGB underglow, cooldown bars
- Particles: Burst spheres, expanding torus rings, confetti planes

## E2E Governor Status

The E2E governor (`e2e/helpers/game-governor.ts`) uses deterministic seeded PRNG and reads enemy counter types from exposed game state (`window.__gameEnemyCounters`):

- Reads DOM state (panic bar width, score display) and enemy counter types
- Maps enemy types to counter abilities (reality->F1, history->F2, logic->F3)
- Picks the most common enemy type and presses its counter
- Falls back to random ability selection when no enemy info is available
- aggressiveness/accuracy config controls decision-making probability

## Documentation Gaps

- `docs/ARCHITECTURE.md` line 404: Lists "Yuka.js AI governors" as Future Enhancement but it's already implemented

## Next Steps (Tracked as GitHub Issues)

### Milestone: Deterministic Game Engine

- ~~Replace all game-state Math.random() with seedrandom~~ **DONE** (mulberry32 in `src/lib/rng.ts`)
- Persist/expose seed for cross-session replay (localStorage or URL param)
- Implement proper game chronometer (microsecond precision)
- Adjective-adjective-noun seed phrase system
- New game modal with difficulty selection
- Seed input with shuffle button

### Milestone: Zustand State Architecture

- Install zustand
- Create game state store (replace useRef pattern)
- Create UI state store (replace useReducer)
- Eliminate panicRef/waveRef/cooldownRef props drilling
- Extract worker communication to custom hook

### Milestone: Missing Features from Old Index

- Add speeder variant
- Add floating damage numbers
- Add CRT scanline post-processing effect
- Add RGB border glow animation
- Restore panic drain mechanic (or document removal decision)

### Milestone: Code Quality

- ~~Add boss-ai destroy() method~~ **DONE** (dispose() added)
- Fix Landing.tsx animation cleanup
- Track audio setTimeout IDs
- Add music.ts unit tests
- ~~Add worker error boundary~~ **DONE** (try-catch with ERROR postMessage)
- ~~Fix accessibility (focus-visible, reduced-motion)~~ **DONE** (CSS guards added)
- Colorblind panic bar indicator (still open)
- Upgrade E2E governor to use Yuka-based decision making
