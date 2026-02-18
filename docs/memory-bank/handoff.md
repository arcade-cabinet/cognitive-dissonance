# Cloud Agent Handoff — Cognitive Dissonance v2.0

> This document is the roadmap for a long-running cloud agent to complete the full game.
> It does NOT repeat content from the Grok corpus — you MUST read the primary sources yourself.
> When done, hand back to the human operator for local Playwright desktop Chrome verification.

## Goal

Ship Cognitive Dissonance v2.0 — 100% feature-complete, all platforms scaffolded, comprehensive tests.

**Exit criteria:**
- `pnpm build` passes
- `pnpm lint` passes (0 errors, 0 warnings)
- All Vitest unit tests pass
- All Playwright E2E tests pass (headless)
- Yuka-based E2E governor survives 30+ seconds across 3 restart cycles
- All memory-bank docs updated to reflect final state
- Every commit is a NEW commit (NEVER amend, NEVER force-push)

---

## PHASE 0: Build Context (MANDATORY — before any code changes)

You cannot implement this game correctly without understanding the full design that emerged from 165 conversation turns with Grok. Read these sources in order:

### Step 1: Understand the current codebase state
- `AGENTS.md` — architecture, patterns, tech stack
- `docs/memory-bank/activeContext.md` — what works, what's left
- `docs/memory-bank/progress.md` — detailed status
- `docs/memory-bank/systemPatterns.md` — code patterns (imperative mesh, render loop, shader store, etc.)
- `docs/memory-bank/techContext.md` — stack versions, commands, constraints
- `docs/memory-bank/design-decisions.md` — why glass sphere not Sonny bust, why pattern stabilization not missile command, etc.

### Step 2: Read the conversation index
- `docs/memory-bank/grok-doc/main-conversation/INDEX.md` — 165 turns indexed by topic, code presence, design pivots, definitive markers. This is your MAP of the entire design process. Study the topic tags (gsap, shaders, tension, platter, seed, enemies, pattern-stabilization, audio, xr, csp) and the "Design" and "Definitive" columns.

### Step 3: Read ALL prose design documents
- `docs/memory-bank/grok-doc/prose/` — 52 files containing the non-code design thinking. These are the "why" behind every decision. Read them ALL. Key files by topic:
  - Glass sphere design: `060-`, `064-`, `070-`, `072-`, `074-`, `076-`, `078-`, `080-`
  - Pattern stabilization: `046-`, `068-`, `082-`, `114-`
  - Enemies + Yuka: `037-`, `038-`, `039-`, `041-`, `048-`, `052-`, `054-`, `058-`, `062-`
  - Audio + Tone.js: `024-`, `055-`, `056-`, `083-`
  - Platter + GSAP: `050-`
  - Seed system: `045-`
  - Shaders: `012-`, `014-`, `063-`, `065-`

### Step 4: Read the shader-ports conversation
- `docs/memory-bank/grok-doc/shader-ports/INDEX.md` — 7 turns resolving the critical Babylon.js 8 + Reactylon gaps
- `docs/memory-bank/grok-doc/shader-ports/001-user-glass-sphere-enemies-audio.md` — the 7 gap definitions
- `docs/memory-bank/grok-doc/shader-ports/002-assistant-glass-sphere-enemies-gsap.md` — the definitive gap answers
- `docs/memory-bank/grok-doc/shader-ports/006-assistant-glass-sphere-platter-pattern-stabilization.md` — the production-ready complete codebase

### Step 5: Review the code evolution
- `docs/code-fragments/MANIFEST.md` — 170 versioned code blocks showing how each component evolved. When implementing a feature, check the fragment versions to understand the iteration history.
- `docs/memory-bank/grok-doc/definitive/` — 26 final code extractions. These are the "last word" from the Grok conversation on each file. Compare against `src/` to find gaps.

### Step 6: Understand the live code
- Read every file in `src/` (26 files total). Compare each against its definitive counterpart. The code-explorer audit (referenced in the conversation history) found these critical gaps — verify they still exist before implementing.

---

## PHASE 1: Critical Gameplay Gaps

### 1.1 Per-Color Keycap Matching

**Context:** Conversation turns 46-50, 66, 74. The buried seed generates pattern colors. Each keycap on the platter has a color. Matching = pull back. Mismatching = nothing.

**Current bug:** `pattern-stabilizer.tsx` uses `isAnyHeld` — any key pulls ALL patterns. This defeats the core mechanic.

**Fix:** Change stabilization check to `heldKeys.has(pattern.colorIndex)`. Verify color index mapping between `platter.tsx` decorative keycaps and `pattern-stabilizer.tsx` patterns.

**Files:** `src/components/pattern-stabilizer.tsx`, `src/store/input-store.ts`, `src/components/platter.tsx`

### 1.2 Win Condition

**Context:** Conversation turns 91, 95-96. Endless with logarithmic escalation, but coherence reaching 100 should produce feedback.

**Current bug:** Coherence can reach 100 but nothing happens.

**Fix:** When coherence >= 100: sphere emissive glow pulse (GSAP), sphere stabilizes (stop jitter), possible phase change. Read the definitive `ai-sphere.tsx` for the original win condition code.

**Files:** `src/components/ai-sphere.tsx`, `src/store/game-store.ts`, `src/components/gameboard.tsx`

### 1.3 Spatial Audio via Tone.js

**Context:** Conversation turns 55-56, 83-84. Three spatial sound events: pattern escape (whoosh), stabilization (chime), glass shatter (reverb break). All procedural synth — no audio files.

**Current bug:** `spatial-audio.tsx` is completely empty — just a placeholder observer.

**Fix:** Implement 3 `Tone.js` synth + `Panner3D` setups. Dynamic import for SSR safety. Subscribe to `useLevelStore` for tension events.

**Files:** `src/components/spatial-audio.tsx`

---

## PHASE 2: Medium Gameplay Gaps

### 2.1 Enemy Split Behavior
**Context:** Conversation turns 53-54, 92. Split enemies spawn 2 smaller seekers on death.
**Files:** `src/components/enemy-spawner.tsx`

### 2.2 Platter Dust Particles
**Context:** Conversation turns 137-152 (GSAP deep dive). Metallic dust burst on garage door emergence.
**Files:** `src/components/platter.tsx`

### 2.3 Recess Glow Animation
**Context:** Same GSAP deep dive. `recessLightRef` exists but intensity never animated.
**Files:** `src/components/platter.tsx`

### 2.4 Coherence Arc Display
**Context:** Conversation turn 94. Diegetic GUI should show fill percentage, not just color.
**Files:** `src/components/diegetic-gui.tsx`

### 2.5 Restart Ritual Animation
**Context:** Conversation turn 90. GSAP pulse on sphere at restart.
**Files:** `src/components/ai-sphere.tsx`

---

## PHASE 3: Platform Scaffolds

The game targets 4 platforms. Web works. The other 3 need scaffolding verified:

### 3.1 Android (Reactylon Native)
- `android/` directory contains a clean Reactylon Native scaffold (React Native 0.74.2)
- App ID: `com.cognitive_dissonance`
- Entry: `src/App.tsx` should use `NativeEngine` from `reactylon/mobile` + `Scene` from `reactylon`
- The existing `src/App.tsx` was deleted. Create a native entry point following the Reactylon Native docs.
- Do NOT break the web build — the native entry is only used by Metro, not Next.js.

### 3.2 iOS (Reactylon Native)
- `ios/` directory contains a clean scaffold with Podfile targeting `CognitiveDissonance`
- Same `src/App.tsx` entry as Android

### 3.3 XR (WebXR Hand Tracking)
- **Context:** Conversation turns 31-32, shader-ports turn 5
- Babylon.js 8 has built-in WebXR. Reactylon supports it.
- Create `src/components/xr-session.tsx` stub that sets up `WebXRDefaultExperience` when available
- This is a stub for future work — don't block on full implementation

---

## PHASE 4: Unit Tests

Install: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom`

### Store tests (`src/store/__tests__/`)
Test every store (seed, level, audio, game, input) — initial state, mutations, reset, edge cases. See the existing handoff for specific test cases.

### Shader tests (`src/lib/shaders/__tests__/`)
Test each shader factory returns a `ShaderMaterial`, populates `ShadersStore`, has expected uniforms.

### Utility tests (`src/lib/__tests__/`)
Test `seed-factory.ts` determinism — same rng = same output.

---

## PHASE 5: E2E Tests

### Enhanced smoke + gameplay tests
Extend existing `e2e/smoke.spec.ts` and `e2e/gameplay.spec.ts` with console error checks, screenshot baselines, full game flow.

### Zustand bridge for E2E
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

### Yuka E2E Governor (`e2e/governor.spec.ts`)
Replace the current simple governor with a comprehensive automated player:
- Injects into page via `page.evaluate`, reads stores every 200ms
- Presses matching keycaps when tension > 0.6, releases when < 0.3
- Tracks: time survived, max tension, coherence high watermark
- Test cases: survives 30s, 3 full restart cycles stable, no console errors

---

## PHASE 6: Cleanup + Documentation

### Lint
Fix all 13 Biome warnings to reach 0 errors, 0 warnings. Most resolve naturally as stubs get wired.

### Documentation
Update ALL memory-bank files to reflect final state:
- `activeContext.md` — what's done, what's left
- `progress.md` — complete checklist
- `techContext.md` — any new deps or patterns
- `systemPatterns.md` — any new patterns introduced

Update `AGENTS.md` and `CLAUDE.md` if architecture changed.

### Git discipline
- Every logical change is a NEW commit with a descriptive message
- NEVER `git commit --amend`
- NEVER `git push --force`
- Push after each phase completes

---

## PHASE 7: Handback

When all phases complete:
1. Push final commits to `feat/reactylon-migration`
2. Update PR #170 description with final status
3. The human operator will:
   - Pull the branch
   - Run `pnpm test:e2e` in desktop Chrome (headed, not headless)
   - Visually verify the 3D scene renders correctly
   - Merge the PR

---

## Quick Reference

### Commands
```bash
pnpm dev          # Turbopack dev (440ms startup)
pnpm build        # Production build (~11s)
pnpm lint         # Biome check
pnpm lint:fix     # Biome auto-fix + unsafe fixes
pnpm test:e2e     # Playwright E2E
```

### Architecture
```
src/app/page.tsx → dynamic(gameboard, {ssr:false})
  → gameboard.tsx (2D overlays + lifecycle)
    → game-scene.tsx (Reactylon Engine/Scene)
      → ai-sphere, platter, pattern-stabilizer, enemy-spawner,
        post-process-corruption, spatial-audio, sps-enemies,
        diegetic-gui, audio-engine
src/store/ → seed, level, audio, game, input (Zustand)
src/lib/shaders/ → celestial, neon-raymarcher, crystalline-cube (GLSL)
src/lib/seed-factory.ts → procedural generation from buried seed
src/game/world.ts → Miniplex ECS
```

### Inviolable Patterns
1. All 3D meshes created imperatively in `useEffect` — never as JSX (except lights/camera)
2. Render loop: `scene.registerBeforeRender(fn)` / `scene.unregisterBeforeRender(fn)`
3. All GLSL as static strings in `BABYLON.Effect.ShadersStore` — CSP-safe
4. SSR bypass: `'use client'` + `dynamic({ ssr: false })`
5. Zustand bridge: render loop reads via `getState()`, React subscribes via selectors
6. Tone.js only — Babylon.js `audioEngine: false`, dynamic import for SSR safety
7. `babel-plugin-reactylon` — auto-registers Babylon.js classes for lowercase JSX tags
8. `pnpm` package manager, `Biome` for lint/format
9. Every commit is NEW — never amend, never force-push

### Source Corpus
```
docs/memory-bank/grok-doc/main-conversation/  — 165 indexed conversation turns
docs/memory-bank/grok-doc/prose/              — 52 design thinking documents
docs/memory-bank/grok-doc/shader-ports/       — 7 Babylon.js gap resolution turns
docs/memory-bank/grok-doc/definitive/         — 26 final code extractions
docs/code-fragments/                          — 170 versioned code iterations
docs/memory-bank/*.md                         — 7 current-state summaries
```
