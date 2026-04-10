---
title: Active Context (Deprecated)
updated: 2026-04-10
status: stale
domain: context
---

# Active Context — Cognitive Dissonance v3.0

> **Deprecated:** See `docs/STATE.md` for current state instead.
> **Last Updated:** 2026-02-20
> **Current Focus:** Visual design fixes from E2E playthrough + comprehensive visual tests
> **Sessions:** 9 (context compacted seven times)

## What We're Working On

### Current Priority: Visual Design Fixes from E2E Playthrough — COMPLETE (Session 9)

Fixed 6 visual defects exposed by Playwright GPU playthrough screenshots:

| Fix | File(s) | What Changed |
|-----|---------|--------------|
| Keycap arrangement | MechanicalPlatter.tsx | 360° ring → 160° front arc centered on +Z (camera) |
| Keycap facing | MechanicalPlatter.tsx | `rotation.y = -angle` → `rotation.y = Math.PI` (face camera) |
| Keycap initial state | MechanicalPlatter.tsx + MechanicalAnimationSystem.ts | Start at (0,-0.02,0) + `setEnabled(false)`, emerge uses stored rimPositions |
| Slit geometry | MechanicalPlatter.tsx + MechanicalAnimationSystem.ts | Height 0.02→0.06, depth 0.1→0.5, albedo 0.02→0.06, closeSlit targets updated |
| PLAY keycap | MechanicalPlatter.tsx + GameBootstrap.tsx | Position (0,0.10,0.15), emissive (0.1,0.4,0.1), removed delayed emergence |
| Title overlay | TitleOverlay.tsx | Opacity 0.85 → 0.55 |

**Integration fix caught by E2E**: Added keycap emergence call in playing-phase callback and retraction in title-phase reset (GameBootstrap.tsx). Without this, keycaps started hidden and never appeared during gameplay.

### Previous: Integration Audit + Bug Fixes — COMPLETE (Session 8)

Found and fixed 7 critical integration bugs via creative director audit:

| Bug | File | Root Cause | Fix |
|-----|------|-----------|-----|
| Seed-derived slots silently ignored for 21 handlers | GameBootstrap.tsx | `levelEntity` missing `archetype` component in `else` branch | Added `archetype` to ALL entity constructions |
| Sphere rotation has no effect on handler gameplay | SphereTrackballSystem.ts | `.rotation` Euler not synced from `.rotationQuaternion` | Added `toEulerAngles()` sync after quaternion write |
| 3 handlers receive zero keyboard input | KeyboardInputSystem.ts | `scene.metadata.pressedKeys` never written | Added Set init + press/release sync |
| RhythmGateHandler material tween leak | RhythmGateHandler.ts | `dispose()` only kills position tweens, not material tweens | Added `gsap.killTweensOf(gate.mesh.material)` |
| TendrilDodgeHandler material tween leak | TendrilDodgeHandler.ts | Same pattern — material emissive tweens not killed | Added `gsap.killTweensOf(emissiveColor)` |
| OrbitalCatchHandler material tween leak | OrbitalCatchHandler.ts | Same pattern — keycap material tweens not killed | Added `gsap.killTweensOf(emissiveColor)` |
| CrystallineCubeBoss shield tween accumulation | CrystallineCubeBossHandler.ts | `updateShieldAngle()` stacks tweens without `overwrite` | Added `overwrite: 'auto'` + dispose cleanup |

### Deep Handler Testing — COMPLETE (Session 8)

6 parallel agents created 1,109 new tests across 6 test files:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| keycap-interaction.test.ts | 29 | WhackAMole, ChordHold, RhythmGate, GhostChase, TurntableScratch |
| sphere-interaction.test.ts | 45 | FacetAlign, MorphMirror, SphereSculpt, ZenDrift, Labyrinth |
| combined-interaction.test.ts | 38 | Conductor, LockPick, Resonance, TendrilDodge, OrbitalCatch |
| cube-meta-interaction.test.ts | 37 | CubeJuggle, CubeStack, Pinball, Escalation, Survival, RefractionAim |
| handler-chaos.test.ts | 927 | All 25 handlers: NaN, Infinity, extreme dt, dispose safety, rapid cycling, null fields, missing meshes, metadata edge cases, stress test |
| dream-pipeline-integration.test.ts | 33 | Full lifecycle, multi-dream sessions, seed determinism, error recovery |

### Backlog: Advanced E2E Player Governor

User requested an advanced version of the e2e player governor using the Anthropic SDK — GenAI-driven playtesting that reports what it encounters, targeted at specific gameplay scenarios. This was discussed but not started.

### Remaining Gaps (By Priority)
1. **P3: Havok physics** — All physics systems are stubs. Not blocking gameplay.
2. **P4: XR/AR** — HandInteractionSystem and ARSessionManager wired but not tested end-to-end.
3. **P5: Accessibility** — DiegeticAccessibility speech recognition stub.
4. **P5: Multiplayer** — SharedDreamsSystem WebRTC stub.

## Recent Changes (Session 8)

### Integration Bugs Fixed
- **GameBootstrap.tsx**: Added `archetype` component to ALL level entity constructions (all 5 branches), fixing seed-derived slots for 21 new handlers
- **SphereTrackballSystem.ts**: Added `toEulerAngles()` → `.rotation.set()` sync in `update()` so handlers reading `.rotation.y` get current values
- **KeyboardInputSystem.ts**: Added `scene.metadata.pressedKeys` initialization, sync on key press/release, and clear on disable/reset
- **RhythmGateHandler.ts**: Added `gsap.killTweensOf(gate.mesh.material)` in dispose
- **TendrilDodgeHandler.ts**: Added `gsap.killTweensOf(sphereMesh.material.emissiveColor)` in dispose
- **OrbitalCatchHandler.ts**: Added `gsap.killTweensOf(mesh.material.emissiveColor)` in dispose
- **CrystallineCubeBossHandler.ts**: Added `overwrite: 'auto'` to shield tween + `gsap.killTweensOf(shieldMesh.rotation)` in dispose

### Test Fixes
- **SphereTrackballSystem.test.ts**: Added `toEulerAngles()` to mock Quaternion and `rotation` to mock mesh
- **sphere-interaction.test.ts**: Fixed flaky FacetAlign tests — `degToRad(999)` accidentally aligned with 270° facet; replaced with `degToRad(45)`. Mocked `Math.random` for deterministic facet placement. Fixed SphereSculpt target change test by preventing `shapeComplete` from firing early.

### Sessions 5-7 (Previous)
- v3.0 ECS architecture built (components, archetypeSlots, primitives, ArchetypeActivationSystem, DreamSequencer)
- All 25 DreamHandlers implemented via handler registry pattern
- Dead code cleanup (World.ts 273→9 lines)
- Handler registry refactor (DreamTypeHandler 573-line monolith → thin dispatcher)
- Shader/ECS/docs audits completed
- Playtesting bugs fixed (tension double-scaling, sphere color, enemy sizing, pattern timeout, game pacing)

## Known Issues

### Bugs
- **Flaky test**: `keycap-interaction.test.ts` "higher tension makes emerge duration shorter" — passes in isolation, fails intermittently under full-suite load (timing-sensitive)
- **64 suites, 3,297 tests passing** (TypeScript 0 errors)

### Tech Debt
- Biome `any` warnings in some test files
- DifficultyScalingSystem has both `init()` and `initialize()` methods (only `initialize()` is used)
- ProceduralMorphSystem constructor singleton-with-args antipattern
- Inconsistent slots typing across handlers (some cast to specific type, some use `'in'` check)
- TurntableScratchHandler keycap tweens should use `overwrite: 'auto'`

## System Patterns & Decisions

### Handler Registry Pattern (v3.0)
```
src/systems/dream-handlers/index.ts — HANDLER_REGISTRY Map<ArchetypeType, DreamHandlerFactory>
Each handler file calls registerHandler() at module scope (self-registration)
DreamTypeHandler imports all 25 handler files as side-effects
Adding new archetype = (1) create handler file, (2) add one import line
```

### DreamSequencer Pacing Pattern (v3.0)
```
8-Dream kishōtenketsu cycle:
  Opening (index 0-1): Low cognitive load, gentle intro
  Development (index 2-4): Medium cognitive load, building tension
  Climax (index 5-6): High cognitive load, peak gameplay
  Resolution (index 7): Meditative, tension decreasing
Cycle wraps (index 8 = Opening again)
No-repeat: last 7 archetypes filtered from selection pool
Tension carryover: opening cap 0.15, climax floor 0.4, resolution cap 0.3
```

### ArchetypeActivation Flow (v3.0)
```
DreamSequencer.selectNextDream(previousTension, previousTypes)
  → { archetypeType, seedHash, tensionCurve, carryoverTension, pacingPhase }
  → ArchetypeActivationSystem.activate(archetypeType, seedHash, scene)
    → deriveArchetypeSlots(archetypeType, seedHash) [deterministic PRNG]
    → configure all primitive entities from slot params
    → DreamTypeHandler.activateDream(levelEntity, archetypeType)
      → HANDLER_REGISTRY.get(archetypeType) → new Handler().activate()
```

### Input Data Flow (FIXED — Session 8)
```
KeyboardInputSystem.onKeyDown → activeKeys.set() + scene.metadata.pressedKeys.add()
KeyboardInputSystem.onKeyUp → activeKeys.delete() + scene.metadata.pressedKeys.delete()
DreamHandlers read: scene.metadata.pressedKeys (Set<string>)
Handlers: ChordHold, GhostChase, Survival, Escalation
```

### Babylon.js Rotation Sync (FIXED — Session 8)
```
SphereTrackballSystem writes: sphereMesh.rotationQuaternion (Quaternion)
SphereTrackballSystem now also syncs: sphereMesh.rotation (Vector3 Euler)
Handlers read: sphereMesh.rotation.y (FacetAlign, LockPick, SphereSculpt, etc.)
Note: Babylon.js does NOT auto-sync .rotation from .rotationQuaternion
```

### Seed-Driven Slot Derivation (v3.0)
```
mulberry32(seedHash) → per-archetype parameter ranges
  e.g. WhackAMole: emergeDurationMs 300-2000, maxSimultaneous 1-6, decoyRate 0-0.3
  e.g. Labyrinth: mazeComplexity 3-8, particleSpeed 0.5-2.0, wallBounce 'elastic'|'sticky'
All 25 archetypes have defined ranges in archetypeSlots.ts
```

### Singleton Pattern
All 31 gameplay systems use `private constructor()` + `static getInstance()`. Created in SystemOrchestrator.initAll(), disposed in reverse order.

### Tension Listener Pattern
Systems register via `TensionSystem.addListener((tension) => { ... })`. 6 core listeners + DreamSequencer.updatePeakTension().

### Config Pipeline
```
useSeedStore.seedString → hashSeed() → configLoader.loadSeedConfigs()
  → patterns.json (3 phases, 3 tension curves)
  → toTensionCurveConfig() → TensionSystem.init()
  → toDifficultyConfig() → DifficultyScalingSystem.initialize()
  → phases[] → PatternStabilizationSystem.setPhases()
```

### Phase Lifecycle
```
loading → title → (Enter key) → playing → (tension 0.999) → shattered → (Enter key) → title
```

## File Map (Key Files)

### v3.0 ECS Architecture
| File | Purpose |
|------|---------|
| `src/ecs/components.ts` | 25 archetype types, 6 primitive interfaces, slot types, ARCHETYPE_METADATA |
| `src/ecs/archetypeSlots.ts` | 25 derive*() functions, seed-driven slot derivation |
| `src/ecs/primitives.ts` | Entity factory functions for all primitive types |
| `src/ecs/ArchetypeActivationSystem.ts` | Configures primitives from archetype slots |
| `src/sequences/DreamSequencer.ts` | Session pacing orchestrator (8-Dream cycle) |
| `src/systems/dream-handlers/index.ts` | Handler registry (DreamHandler interface, registerHandler) |
| `src/systems/dream-handlers/*.ts` | 25 individual handler implementations |

### Core Systems
| File | Purpose |
|------|---------|
| `src/engine/GameBootstrap.tsx` | Main wiring: DreamSequencer → ArchetypeActivation → handlers |
| `src/systems/SystemOrchestrator.ts` | 31 systems: init, update, dispose lifecycle |
| `src/systems/DreamTypeHandler.ts` | Thin dispatcher, registry-backed |
| `src/systems/KeyboardInputSystem.ts` | Keyboard → keycap/lever/platter + scene.metadata.pressedKeys sync |
| `src/systems/SphereTrackballSystem.ts` | Arcball rotation + Euler sync for handler consumption |
| `src/ecs/World.ts` | Minimal: world instance + LeftHand/RightHand queries |
