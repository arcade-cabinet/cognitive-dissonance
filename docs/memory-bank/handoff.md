# Cloud Agent Handoff — Cognitive Dissonance

> This document contains everything a long-running cloud agent needs to complete the game, write tests, and hand back for local Playwright verification.

## Goal

Get the game to **100% feature-complete and tested**. When done:
- `pnpm build` passes
- `pnpm lint` passes (0 errors)
- All unit tests pass
- All E2E tests pass (headless)
- A comprehensive Yuka-based E2E governor test exists
- Hand back to human operator to run `pnpm test:e2e` in desktop Chrome locally

## Current State

**Branch:** `feat/reactylon-migration` — PR #170 against `main`

**Stack:** Next.js 16.1.6 (Turbopack), React 19, Babylon.js 8.51, Reactylon 3.5.4, GSAP 3.12, Tone.js 14.8, Zustand 5, Yuka 0.7, Biome 2.4.1, Playwright 1.58

**What works right now:**
- `pnpm build` passes (7.1s)
- `pnpm lint` passes (0 errors, 13 warnings)
- `pnpm dev` starts in 440ms, serves 200 OK
- 11 Playwright E2E tests pass (smoke, gameplay overlay, governor restart cycles)
- All 15 component files compile
- 5 Zustand stores wired (seed, level, audio, game, input)
- 3 shader materials (celestial nebula, neon raymarcher, crystalline cube)
- ATC background shader, title/game-over overlays
- GSAP garage-door keycap emergence

**What has NOT been visually verified:** The 3D scene has never been viewed by a human. It compiles and returns 200, but visual correctness is unknown.

## Commands

```bash
pnpm dev          # Dev server (Turbopack, 440ms startup)
pnpm build        # Production build (~11s)
pnpm lint         # Biome check (should be 0 errors)
pnpm lint:fix     # Biome auto-fix
pnpm test:e2e     # Playwright E2E (11 tests currently)
```

## Files to Read First

1. `AGENTS.md` — architecture, patterns, tech context
2. `docs/memory-bank/activeContext.md` — current state + next steps
3. `docs/memory-bank/progress.md` — what works, what's left, known issues
4. `docs/memory-bank/systemPatterns.md` — how the code is structured
5. `src/components/game-scene.tsx` — composition root for all 3D
6. `src/components/gameboard.tsx` — 2D overlays + game lifecycle

> Do NOT load `docs/memory-bank/grok-doc/` into context unless explicitly comparing against live code. Those are historical reference extractions. The live code in `src/` is the source of truth.

---

## PHASE 1: Fix Critical Gameplay Gaps

### 1.1 Per-Color Keycap Matching (HIGH)

**Current:** `pattern-stabilizer.tsx` uses `useInputStore.getState().isAnyHeld` — any held key pulls ALL patterns back.

**Target:** Each of the 12 decorative keycaps on the platter has a color index (0-11). Each escaping pattern has a `colorIndex`. Holding the MATCHING colored keycap pulls that specific pattern back. Holding the wrong key does nothing for that pattern.

**Files to change:**
- `src/store/input-store.ts` — already tracks `heldKeys: Set<number>` with press/release by index
- `src/components/pattern-stabilizer.tsx` — change stabilization check from `isAnyHeld` to `heldKeys.has(pattern.colorIndex)`
- `src/components/platter.tsx` — decorative keycaps already have index-based ActionManager handlers. Verify the color index mapping matches the pattern color palette.

### 1.2 Win Condition (HIGH)

**Current:** `ai-sphere.tsx` has no win condition. Coherence can reach 100 but nothing happens.

**Target:** When `coherence >= 100`:
- Sphere emissive glow pulse (GSAP)
- Sphere stabilizes (stop jitter)
- Set game phase to `'won'` (add to game-store if needed)
- Display a subtle "THE MIND HOLDS" overlay or equivalent

**Files to change:**
- `src/components/ai-sphere.tsx` — add coherence check in render loop
- `src/store/game-store.ts` — add `'won'` phase if needed
- `src/components/gameboard.tsx` — add win overlay

### 1.3 Spatial Audio via Tone.js (HIGH)

**Current:** `spatial-audio.tsx` is completely stubbed (empty observer, no sound).

**Target:** Three spatial sound events using Tone.js (NOT Babylon.js audio — `audioEngine: false`):
- **Pattern escape:** Rising whoosh when a pattern reaches the rim
- **Stabilization chime:** Soft chime when a pattern is pulled back to 0
- **Glass shatter:** Reverberant glass break on game over

Use `Tone.Panner3D` for spatial positioning relative to the sphere. Sounds should be procedural (synth-based), not sample-based — no audio files needed.

**Files to change:**
- `src/components/spatial-audio.tsx` — implement 3 Tone.js synth + Panner3D setups
- Subscribe to game events: `useLevelStore.subscribe()` for tension spikes, custom events for pattern escape/stabilize/shatter

---

## PHASE 2: Fix Medium Gameplay Gaps

### 2.1 Enemy Split Behavior

**Current:** `enemy-spawner.tsx` maps `'split'` behavior to `ArriveBehavior`.

**Target:** When a `split` enemy is destroyed (reaches sphere and gets removed), spawn 2 smaller enemies at its position with `'seek'` behavior. This creates escalating difficulty.

**Files to change:**
- `src/components/enemy-spawner.tsx` — add split-on-removal logic in the proximity check

### 2.2 Platter Dust Particles

**Current:** Garage doors emerge without dust.

**Target:** When `openGarageDoor()` fires, create a brief `BABYLON.ParticleSystem` burst at each garage door position. Metallic dust colors (grays, sparks). 0.5s lifetime, then stop.

**Files to change:**
- `src/components/platter.tsx` — add particle system creation in `openGarageDoor()` or in the setTimeout that triggers it

### 2.3 Recess Glow Animation

**Current:** `recessLightRef` is created but intensity never animated.

**Target:** GSAP timeline in `openGarageDoor()` that ramps `recessLight.intensity` from 0 → 2 → 1.2 over the door animation duration.

**Files to change:**
- `src/components/platter.tsx` — add `gsap.to(recessLightRef.current, { intensity: ... })` to the garage door timeline

### 2.4 Coherence Arc Display

**Current:** `diegetic-gui.tsx` uses a torus with color/alpha shift.

**Target:** Use `BABYLON.MeshBuilder.CreateTorus` with `arc` parameter set to `(coherence / 100) * 2 * Math.PI`. Update arc in render loop as coherence changes. This creates a visible "fill gauge" on the platter.

**Files to change:**
- `src/components/diegetic-gui.tsx` — dispose and recreate torus with updated `arc` parameter in render loop, or use a custom shader that clips based on angle

### 2.5 Restart Ritual Animation

**Current:** Restart just resets stores.

**Target:** On restart, GSAP pulse animation on the sphere (scale 1 → 1.15 → 1, 0.8s duration, `power2.inOut` ease) before gameplay resumes. 

**Files to change:**
- `src/components/ai-sphere.tsx` — listen for game phase change to `'playing'` and trigger GSAP pulse

---

## PHASE 3: Unit Tests

Write unit tests using Vitest (install it: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom`).

### Store Tests (`src/store/__tests__/`)

**seed-store.test.ts:**
- `generateNewSeed()` creates non-empty seedString
- `generateNewSeed()` produces different seeds on consecutive calls
- `replayLastSeed()` with no prior seed calls `generateNewSeed()`
- `replayLastSeed()` with prior seed produces same rng sequence
- `rng()` returns numbers between 0 and 1

**level-store.test.ts:**
- Initial tension is 0.12, coherence is 25
- `setTension(0.5)` updates tension
- `addCoherence(10)` increases coherence, caps at 100
- `advanceLevel()` increments level and adds coherence
- `reset()` returns all values to initial state

**audio-store.test.ts:**
- `initialize()` sets `isInitialized` to true (mock Tone.js)
- `updateTension()` updates stored tension
- `shutdown()` can be called safely

**game-store.test.ts:**
- Initial phase is `'title'`
- `setPhase('playing')` updates phase
- `togglePause()` toggles between `'playing'` and `'paused'`
- `restart()` resets to `'title'`

**input-store.test.ts:**
- `pressKeycap(3)` adds 3 to heldKeys
- `releaseKeycap(3)` removes 3
- `releaseAll()` clears all
- `isAnyHeld` returns true when keys held, false when empty

### Shader Tests (`src/lib/shaders/__tests__/`)

**celestial.test.ts:**
- `createCelestialShaderMaterial()` returns a `ShaderMaterial` instance
- Returned material has expected uniform names
- `ShadersStore` contains `celestialVertexShader` and `celestialFragmentShader`

**neon-raymarcher.test.ts:**
- `createNeonRaymarcherMaterial()` returns a `ShaderMaterial`
- ShadersStore populated with correct keys

**crystalline-cube.test.ts:**
- Same pattern as above

### Utility Tests (`src/lib/__tests__/`)

**seed-factory.test.ts:**
- `generateFromSeed(rng)` returns `{ enemyConfig, keycapPortrait }`
- Same rng produces same output (deterministic)
- Different rng produces different output

---

## PHASE 4: Comprehensive E2E Tests

Extend the existing Playwright tests in `e2e/`.

### Enhanced Smoke Tests (`e2e/smoke.spec.ts`)
- Add: canvas has non-zero pixels (screenshot comparison baseline)
- Add: no console errors on page load
- Add: no WebGL errors in console

### Enhanced Gameplay Tests (`e2e/gameplay.spec.ts`)
- Add: title overlay disappears within 4 seconds
- Add: ATC shader background visible behind game
- Add: game-over overlay shows correct text
- Add: after restart, title does NOT reappear (goes straight to gameplay)

### Full Gameplay Flow Tests (`e2e/gameplay-flow.spec.ts`)
New file testing the actual game loop:
- Inject `window.__gameState` bridge (expose Zustand stores to Playwright)
- Verify tension starts at baseline (~0.12)
- Force tension increase via store manipulation
- Verify sphere color shifts (screenshot comparison or DOM inspection)
- Force game over at tension 1.0
- Verify "COGNITION SHATTERED" appears
- Click to restart
- Verify tension resets to baseline

### Yuka E2E Governor (`e2e/governor.spec.ts`)

Replace the current simple governor with a comprehensive automated player:

```typescript
// Inject game state bridge into page
await page.evaluate(() => {
  const levelStore = (window as any).__zustand_level;
  const inputStore = (window as any).__zustand_input;
  
  // Expose for governor
  (window as any).__gameState = {
    getTension: () => levelStore.getState().tension,
    getCoherence: () => levelStore.getState().coherence,
    getPhase: () => gameStore.getState().phase,
    pressKey: (i: number) => inputStore.getState().pressKeycap(i),
    releaseKey: (i: number) => inputStore.getState().releaseKeycap(i),
  };
});
```

Governor behavior (run in a `setInterval` inside `page.evaluate`):
1. Read tension and coherence every 200ms
2. If tension > 0.6, randomly press/hold 3-4 keycaps for 1-2 seconds
3. If tension < 0.3, release all keys (let patterns escape a bit for drama)
4. If coherence > 80, ease off (approaching win)
5. Track time survived, max tension reached, coherence high watermark

Governor test cases:
- Survives at least 30 seconds
- Tension stays below 0.9 for at least 20 seconds
- Coherence reaches at least 40 at some point
- Three full game cycles (game-over → restart) are stable
- No console errors during governor run

### To expose Zustand stores to Playwright

Add to `src/components/gameboard.tsx`:
```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    (window as any).__zustand_level = useLevelStore;
    (window as any).__zustand_input = useInputStore;
    (window as any).__zustand_game = useGameStore;
    (window as any).__zustand_seed = useSeedStore;
  }
}, []);
```

---

## PHASE 5: Resolve Lint Warnings

Fix the 13 remaining Biome warnings:
- 6x `noUnusedFunctionParameters` — unused `tension` prop in stub components. As components get wired, these will naturally resolve. For remaining stubs, prefix with `_`.
- 5x `noNonNullAssertion` — in `atc-shader.tsx` on WebGL refs after null guards. These are safe; add `biome-ignore` comments with explanation.
- 2x `useExhaustiveDependencies` — review and either add deps or suppress with justification.

---

## PHASE 6: Final Verification

Before handing back:

1. `pnpm lint` — 0 errors, 0 warnings
2. `pnpm build` — passes
3. All unit tests pass
4. All E2E tests pass (headless Chromium)
5. No `console.error` output during E2E runs
6. Update `docs/memory-bank/progress.md` with final state
7. Update `docs/memory-bank/activeContext.md` with what's done
8. Commit with descriptive message
9. Push to branch

The human operator will then:
- Run `pnpm test:e2e` in desktop Chrome (not headless)
- Visually verify 3D scene renders
- Merge PR

---

## Architecture Quick Reference

```
src/
  app/
    page.tsx          → dynamic import GameBoard (ssr: false)
    layout.tsx        → metadata, html wrapper
    globals.css       → Tailwind + base styles
  components/
    gameboard.tsx     → 2D overlays + game lifecycle orchestrator
    game-scene.tsx    → Reactylon Engine/Scene + all 3D children
    ai-sphere.tsx     → Glass sphere + celestial shader + shatter
    platter.tsx       → Industrial base + GSAP garage-door keycaps
    pattern-stabilizer.tsx → Core gameplay: spawn patterns, hold-to-pull
    enemy-spawner.tsx → Yuka AI + SDF shader enemies
    post-process-corruption.tsx → Chromatic aberration + noise + vignette
    spatial-audio.tsx → Tone.js spatial events (STUBBED)
    sps-enemies.tsx   → SolidParticleSystem ambient particles
    diegetic-gui.tsx  → Coherence ring on platter
    audio-engine.tsx  → Tone.js adaptive score bridge
    ui/
      atc-shader.tsx  → WebGL2 background shader
  store/
    seed-store.ts     → Buried seed (seedrandom)
    level-store.ts    → Tension, coherence, level
    audio-store.ts    → Tone.js bridge
    game-store.ts     → Phase (title/playing/paused/gameover)
    input-store.ts    → Keycap hold tracking
  lib/
    seed-factory.ts   → Procedural generation from seed
    shaders/
      celestial.ts    → Nebula shader (full GLSL)
      neon-raymarcher.ts → SDF enemy shader
      crystalline-cube.ts → Boss enemy shader
  game/
    world.ts          → Miniplex ECS world + archetypes
  types/
    global.d.ts       → Module declarations (seedrandom)
e2e/
  smoke.spec.ts       → Page load, canvas, title, WebGL
  gameplay.spec.ts    → Scene visibility, game-over, restart
  governor.spec.ts    → Automated player stability tests
  helpers/
    game-helpers.ts   → Shared test utilities
```

## Key Patterns (DO NOT VIOLATE)

1. **All 3D meshes created imperatively in useEffect** — never as JSX (except lights/camera)
2. **Render loop via `scene.registerBeforeRender(fn)`** — NOT `onBeforeRenderObservable`
3. **All GLSL as static strings in `BABYLON.Effect.ShadersStore`** — CSP-safe, no eval
4. **SSR bypass** — all 3D in `'use client'` files, loaded via `dynamic({ ssr: false })`
5. **Zustand bridge** — render loop reads via `getState()`, React subscribes via selectors
6. **Tone.js only** — Babylon.js `audioEngine: false`. Dynamic import for SSR safety.
7. **babel-plugin-reactylon** — auto-registers Babylon.js classes for lowercase JSX tags
8. **pnpm** package manager
9. **Biome** for lint/format (not ESLint)
