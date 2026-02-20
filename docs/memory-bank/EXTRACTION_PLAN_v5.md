# COGNITIVE DISSONANCE — COMPREHENSIVE EXTRACTION PLAN v5.0

## All Four Grok Documents Fully Audited Against Codebase
**Date:** 2026-02-19
**Status:** Gap analysis complete. Every system from all four Grok docs cross-referenced against actual src/ implementation.

## Source Documents (canonical design)

1. `Grok-Babylon.js_v8_+_Reactylon_Native_Upgrade_Plan.md` — Babylon 8 tree-shakable imports, WebGPU/WebGL2 engine, WGSL shaders, Reactylon JSX
2. `Grok-Cognitive_Dissonance__Reactylon_Native_Migration.md` — Fresh Reactylon Native template, Expo thin layer, cross-platform entry points
3. `Grok-Cognitive_Dissonance_v3.0_Architecture_Locked.md` — Miniplex ECS archetypes, levels as archetypes, mechanical-only degradation, XR hand tracking, ImmersionAudioBridge, HandArchetypes
4. `Grok-Procedural_Robot_Bust_Modeling_Breakdown.md` — NS-5 Sonny procedural modeling, SDF raymarching, glass sphere "bust" aesthetic

## Current Codebase State (as of 2026-02-19)

### What Works
- Engine initialization (WebGPU + WebGL2 fallback) ✅
- Scene creation with black clear color + right-handed coordinates ✅
- ArcRotateCamera at (PI/2, PI/2.5, radius=2, Vector3.Zero) ✅
- HemisphericLight (0, 1, 0) at intensity 0.7 ✅
- Mechanical platter (0.18m × 1.2m cylinder + track + slit + lever + 14 keycaps) ✅
- Glass sphere (52cm, PBR + nebula shader) ✅
- Diegetic coherence ring (torus parented to sphere) ✅
- Diegetic title text ("COGNITIVE DISSONANCE" on platter rim via DynamicTexture) ✅
- Shader registry (5 GLSL shader pairs in Effect.ShadersStore) ✅
- TypeScript compilation (0 errors) ✅
- 129 Jest tests passing ✅
- Biome lint clean (0 errors, 76 warnings all `any` in tests) ✅

### What Does NOT Work (Never Wired)
- SystemOrchestrator — exists but never called (25 systems idle)
- KeyboardInputSystem — exists but never initialized
- TensionSystem — has listeners but no per-frame update driving it
- CorruptionTendrilSystem — exists but never spawns particles
- MechanicalAnimationSystem — exists but no GSAP timelines active
- ImmersionAudioBridge — exists but `initialize()` never called
- SpatialAudioManager — exists but never initialized
- XRManager — exists but `init()` never called
- HandInteractionSystem — exists but never bound to meshes
- MechanicalHaptics — exists but never activated
- MechanicalDegradationSystem — exists but never activated for WebGL2
- ProceduralMorphSystem — exists but never spawns enemies
- CrystallineCubeBossSystem — exists but never triggers
- EchoSystem — exists but never spawns echoes
- DreamTypeHandler — exists but never selects dream types
- ShatterSequence — exists but never triggers
- PostProcessCorruption — exists but no render pipeline
- GamePhaseManager — partially wired (title/playing/shattered hooks) but no keyboard triggers
- Physics (Havok) — WORKAROUND stubs, not real constraints
- Multiplayer — exists but no transport layer active
- AR modes — exist but no AR session ever starts
- Accessibility — exists but no voice commands active

---

## GAP ANALYSIS: Grok Docs vs Implementation

### 1. Architecture Pattern (MAJOR GAP)

**Grok Docs Say:**
```tsx
// Entry point per Grok Migration doc
<Engine>
  <Scene>
    <CognitiveDissonanceRoot />
  </Scene>
</Engine>
```

**Codebase Has:**
```tsx
// App.tsx — imperative canvas creation
const canvas = document.createElement('canvas');
EngineInitializer.createEngine(canvas).then(eng => { ... });
// SceneManager provides scene via React context
// GameBootstrap creates everything imperatively in useEffect
```

**Gap:** Reactylon JSX (`<Engine>`, `<Scene>`) NOT used. Everything is imperative Babylon.js in useEffect.

**Resolution Options:**
- A) Keep imperative architecture, wire SystemOrchestrator into GameBootstrap
- B) Rewrite to Reactylon JSX entry point

### 2. Miniplex ECS API Version (MEDIUM GAP)

**Grok Docs Say (v3.1):**
```ts
// Miniplex 1.x API
const PlatterRotationDream = world.archetype('level', 'platterCore', ...);
const entity = world.createEntity({ level: true, ... });
```

**Codebase Has:**
```ts
// Miniplex 2.0 API (per CLAUDE.md convention)
const query = world.with('level', 'platterCore');
const entity = world.add({ level: true, ... });
```

**Gap:** The Grok docs reference Miniplex 1.x API, but the codebase correctly uses Miniplex 2.0 API. The Grok docs were written before the Miniplex 2.0 migration.

**Resolution:** Keep Miniplex 2.0 API (world.with, world.add). Update Grok docs if needed, but don't regress to 1.x.

### 3. Shader Language (MEDIUM GAP)

**Grok Docs Say:**
- WGSL primary for WebGPU + GLSL fallback
- Nebula.fragment.wgsl, CorruptionTendril.fragment.wgsl

**Codebase Has:**
- GLSL only in Effect.ShadersStore (5 shader pairs)
- No .wgsl files

**Gap:** Grok docs spec WGSL for WebGPU. Codebase uses GLSL which Babylon.js auto-transpiles to WGSL when running on WebGPU. This is a valid approach — Babylon.js 8 handles GLSL→WGSL conversion automatically.

**Resolution:** GLSL is acceptable since Babylon auto-transpiles. WGSL can be added later for performance optimization but is not blocking.

### 4. Physics / Havok (MAJOR GAP)

**Grok Docs Say (v4.1):**
- HavokInitializer (async WASM load, gravity -9.81)
- Keycap 6DoF constraints (LINEAR_Y stiffness 800, damping 40)
- Platter HingeConstraint + angular motor
- MODE_LEVER HingeConstraint with dynamic resistance
- Hand joint → PhysicsAggregate force application

**Codebase Has:**
- HavokInitializer file exists but...
- All constraints are "WORKAROUND - force/torque simulation, not actual constraints"
- KeycapPhysics, PlatterPhysics, LeverPhysics all use manual force calculations
- No actual Havok WASM loaded at runtime

**Gap:** No real Havok physics. All physics are manual force/torque simulations.

**Resolution:** Wire HavokInitializer to actually load the WASM, then replace workaround force simulations with real PhysicsAggregate + constraints. Requires @babylonjs/havok package and WASM binary.

### 5. Audio (MAJOR GAP)

**Grok Docs Say:**
- ImmersionAudioBridge (Tone.js + expo-audio bridge)
- Tension-driven reverb (0.3 → 0.9 wet)
- Spatial emitters on glass sphere mesh
- Brown noise corruption static
- Seed-derived BPM/swing/sequence

**Codebase Has:**
- ImmersionAudioBridge.ts exists with correct Tone.js code
- SpatialAudioManager.ts exists
- BUT: `initialize()` is never called
- No audio plays at all

**Gap:** Audio system exists but is completely unwired.

**Resolution:** Call `ImmersionAudioBridge.getInstance().initialize()` in GameBootstrap or SystemOrchestrator. Wire tension listener to `setTension()`.

### 6. XR / AR (MAJOR GAP)

**Grok Docs Say:**
- WebXR hand tracking with 26 joints per hand
- HandArchetypes → Miniplex entities (LeftHand, RightHand)
- Finger → keycap, palm → lever, joints → sphere mapping
- Dual AR modes: glasses room-scale + phone camera projection
- MODE_LEVER switching between AR modes
- AR occlusion shader
- expo-haptics + navigator.vibrate + Tone.js rumble

**Codebase Has:**
- XRManager.ts — correct WebXR session + hand tracking code
- HandInteractionSystem.ts — correct finger/palm/joint mapping
- ARSessionManager.ts — correct dual-mode detection
- AROcclusionMaterial.ts — correct depth-based discard
- MechanicalHaptics.ts — correct expo-haptics bridge
- BUT: NONE of these are ever called or initialized

**Gap:** Full XR stack exists but is completely unwired.

**Resolution:** Wire XRManager.init() in SystemOrchestrator or GameBootstrap. Requires WebXR-capable browser or device.

### 7. SystemOrchestrator Integration (CRITICAL GAP)

**Grok Docs Say:**
- 25 systems initialized in order
- 12 systems with per-frame updates
- Reverse disposal order

**Codebase Has:**
- SystemOrchestrator.ts with correct init/update/dispose order
- BUT: `initAll()` is NEVER called

**Gap:** The orchestrator that wires everything together was never invoked.

**Resolution:** Call `SystemOrchestrator.getInstance().initAll(engine, scene)` in GameBootstrap after mesh creation.

### 8. GameBootstrap → Full Pipeline (CRITICAL GAP)

**Current GameBootstrap creates:**
- Camera, Light, Platter, SphereNebulaMaterial, CoherenceRing, TitleSystem, TensionSystem listeners, GamePhaseManager

**Missing from GameBootstrap:**
- SystemOrchestrator.initAll()
- Keyboard input
- Audio initialization
- Enemy spawning
- Physics initialization
- Post-process effects
- Dream type selection
- Phase transitions from user input

**Resolution:** Integrate SystemOrchestrator into GameBootstrap. The orchestrator handles all 25 systems, so GameBootstrap just needs to call it after creating the base meshes.

### 9. Native Platform (LOW PRIORITY GAP)

**Grok Docs Say:**
- Babylon Native via Reactylon Native backend
- iOS: Swift MTKView → Babylon Native Metal
- Android: Kotlin SurfaceView → Babylon Native Vulkan/GLES

**Codebase Has:**
- BabylonNativeViewManager (Swift/Kotlin) — STUB implementations
- NativeEngineIntegration.ts — bridge module with spec outlines

**Gap:** Native rendering is stubbed. Web works, native does not.

**Resolution:** Low priority — focus on web first, native can be wired later.

### 10. Procedural Robot Bust (NOT APPLICABLE)

**Grok Doc 4 Says:**
- NS-5 Sonny procedural modeling from head to torso
- SDF raymarching in ShaderMaterial

**Codebase Has:**
- Neon raymarcher shader in registry (SDF-based)
- But no explicit NS-5 bust model

**Gap:** The 4th doc is a visual reference/technique guide, not a direct implementation spec. The neon raymarcher shader captures the essence.

**Resolution:** No action needed. The SDF raymarching technique is embedded in the neon raymarcher shader.

---

## COMPREHENSIVE EXTRACTION PROMPT v5.0

Copy this block verbatim when handing off to any AI agent (Gemini/Ralph-tui/Kiro/Claude):

```
You are the canonical integration engine for Cognitive Dissonance v3.0.

## Context

The codebase has ~12,600 lines of TypeScript across 60+ source files in src/.
All individual system files EXIST and TYPE-CHECK CLEAN (0 tsc errors).
The 3D scene RENDERS correctly: platter, sphere, keycaps, coherence ring, title.
129 Jest tests pass. Biome lint is clean.

The CRITICAL problem: SystemOrchestrator is never called, so 25 systems
are idle. The game DISPLAYS but is NOT PLAYABLE. No keyboard input, no audio,
no enemies, no physics, no XR, no phase transitions from user interaction.

## Source Documents (read in order)

Load these four Grok design docs from docs/memory-bank/:
1. Grok-Babylon.js_v8_+_Reactylon_Native_Upgrade_Plan.md (Babylon 8, imports)
2. Grok-Cognitive_Dissonance__Reactylon_Native_Migration.md (entry points)
3. Grok-Cognitive_Dissonance_v3.0_Architecture_Locked.md (ECS, levels, XR, audio)
4. Grok-Procedural_Robot_Bust_Modeling_Breakdown.md (visual reference)

## Architecture Decisions (LOCKED — do not change)

- Imperative Babylon.js in useEffect (NOT Reactylon JSX)
- Miniplex 2.0 API: world.with(), world.add() (NOT world.archetype(), world.createEntity())
- GLSL shaders in Effect.ShadersStore (Babylon auto-transpiles to WGSL on WebGPU)
- @babylonjs/core subpath imports ONLY (tree-shakable)
- Expo SDK 55 + Metro bundler
- React 19 + React Native 0.83
- Scene provided via React context (SceneManager → useScene hook)
- GameBootstrap creates camera, lights, platter, sphere, then delegates to SystemOrchestrator

## Integration Tasks (ordered by priority)

### P0: Make the game PLAYABLE (keyboard → tension → visual feedback loop)

1. Wire SystemOrchestrator into GameBootstrap
   - After platter/sphere creation, call SystemOrchestrator.getInstance().initAll(engine, scene)
   - Pass platter mesh refs to systems that need them
   - Ensure disposal in useEffect cleanup

2. Wire KeyboardInputSystem
   - Requires: scene, PatternStabilizationSystem, MechanicalAnimationSystem, DreamTypeHandler
   - These are all created by SystemOrchestrator.initAll()
   - After initAll(), keyboard should work

3. Wire TensionSystem per-frame updates
   - SystemOrchestrator already registers this in scene.registerBeforeRender
   - Verify tension propagates to: nebula material, coherence ring, audio, degradation

4. Wire GamePhaseManager keyboard transitions
   - Enter key → title → playing (slit opens, keycaps emerge, Dream spawns)
   - Space key → lever pull (MechanicalAnimationSystem)
   - Letter keys → holdKey (PatternStabilizationSystem)

### P1: Audio + Visual Feedback

5. Initialize ImmersionAudioBridge
   - Call initialize() on Tone.js context start (requires user interaction)
   - Wire setTension() as TensionSystem listener

6. Activate PostProcessCorruption
   - Create PostProcessRenderPipeline on scene
   - Wire tension-driven bloom/vignette/chromatic

7. Wire CorruptionTendrilSystem
   - SolidParticleSystem on sphere, spawns above tension 0.3
   - Retraction on matching keycap hold

### P2: Enemies + Boss

8. Wire ProceduralMorphSystem
   - Spawn Yuka enemies on pattern miss
   - GPU vertex morphing with tension-driven morphProgress

9. Wire CrystallineCubeBossSystem
   - Spawn at tension >= threshold OR 3 consecutive misses
   - 5-phase GSAP timeline

10. Wire EchoSystem
    - Ghost keycaps on missed patterns
    - Auto-dispose after 1800ms

### P3: Physics + Advanced Systems

11. Wire HavokInitializer (if WASM available)
    - Replace force/torque workarounds with real PhysicsAggregate + constraints
    - Keycap 6DoF, platter hinge, lever hinge

12. Wire DreamTypeHandler
    - Seed-based archetype selection
    - PlatterRotationDream, LeverTensionDream, KeySequenceDream, CrystallineCubeBossDream

13. Wire ShatterSequence
    - 200ms freeze → 64-shard SPS → haptic burst → enemy fade → platter shutdown

### P4: XR / AR (requires compatible device)

14. Wire XRManager + HandInteractionSystem
15. Wire ARSessionManager dual modes
16. Wire MechanicalHaptics
17. Wire AROcclusionMaterial

### P5: Multiplayer + Accessibility

18. Wire SharedDreamMultiplayer transport
19. Wire AccessibilityManager voice commands

## Verification Checklist

After each integration step:
- [ ] pnpm exec tsc --noEmit (0 errors)
- [ ] pnpm test (129+ tests pass)
- [ ] pnpm lint (0 errors)
- [ ] Visual playtest via browser at localhost:8081
  - Camera orbit works (mouse drag)
  - Keyboard input works (letter keys)
  - Tension increases on missed patterns
  - Sphere nebula shifts blue → red
  - Coherence ring shifts blue → red
  - Audio plays (if wired)
  - Title hides when entering playing phase
  - Game over shows when tension hits 0.999

## Files to Read First

- src/engine/GameBootstrap.tsx (the bridge between React and Babylon scene)
- src/systems/SystemOrchestrator.ts (25-system init/update/dispose pipeline)
- src/engine/SceneManager.tsx (scene creation + context provider)
- App.tsx (engine creation + render loop)
- src/objects/MechanicalPlatter.tsx (all mesh creation)
- src/ecs/World.ts (Miniplex world + entity types)

Begin integration at P0 step 1. Verify after each step.
```

---

## Repository Tree (current, verified)

```
cognitive-dissonance/
├── App.tsx                          # Engine init + SceneManager + GameBootstrap
├── index.web.tsx                    # Web entry point
├── index.native.tsx                 # Native entry point
├── app.json                         # Expo config
├── eas.json                         # EAS Build profiles
├── package.json                     # Expo 55 + Babylon 8 + Miniplex + GSAP + Tone
├── tsconfig.json                    # TypeScript 5.6, strict
├── jest.config.ts                   # Jest + ts-jest
├── metro.config.js                  # Metro bundler config
├── babel.config.js                  # babel-preset-expo + babel-plugin-reactylon
├── src/
│   ├── engine/
│   │   ├── EngineInitializer.ts     # WebGPU/WebGL2 engine creation
│   │   ├── SceneManager.tsx         # Scene + React context
│   │   └── GameBootstrap.tsx        # Camera + lights + platter + systems bridge
│   ├── ecs/
│   │   └── World.ts                 # Miniplex 2.0 world + GameEntity type
│   ├── objects/
│   │   └── MechanicalPlatter.tsx    # Factory: platter + track + slit + lever + keycaps + sphere
│   ├── systems/
│   │   ├── SystemOrchestrator.ts    # 25-system pipeline (NEVER CALLED)
│   │   ├── TensionSystem.ts         # Core tension state
│   │   ├── DifficultyScalingSystem.ts
│   │   ├── KeyboardInputSystem.ts
│   │   ├── PatternStabilizationSystem.ts
│   │   └── ... (7 more)
│   ├── sequences/
│   │   ├── GamePhaseManager.ts      # Phase state machine
│   │   ├── TitleAndGameOverSystem.ts
│   │   └── ShatterSequence.ts
│   ├── shaders/
│   │   ├── registry.ts              # 5 GLSL shader pairs
│   │   └── SphereNebulaMaterial.ts  # PBR glass + nebula shader
│   ├── ui/
│   │   └── DiegeticCoherenceRing.ts # Tension-colored torus
│   ├── enemies/
│   │   ├── ProceduralMorphSystem.ts
│   │   ├── CrystallineCubeBossSystem.ts
│   │   └── YukaEnemySystem.ts
│   ├── audio/
│   │   ├── ImmersionAudioBridge.ts  # Tone.js + expo-audio
│   │   └── SpatialAudioManager.ts
│   ├── xr/
│   │   ├── XRManager.ts            # WebXR hand tracking
│   │   ├── ARSessionManager.ts     # Dual AR/MR modes
│   │   ├── HandInteractionSystem.ts
│   │   └── AROcclusionMaterial.ts
│   ├── physics/
│   │   ├── HavokInitializer.ts     # Havok WASM loader
│   │   ├── KeycapPhysics.ts        # WORKAROUND force sim
│   │   ├── PlatterPhysics.ts       # WORKAROUND force sim
│   │   └── ... (3 more)
│   ├── postprocess/
│   │   └── PostProcessCorruption.ts
│   ├── fallback/
│   │   └── MechanicalDegradationSystem.ts
│   ├── multiplayer/
│   │   └── SharedDreamMultiplayer.ts
│   ├── accessibility/
│   │   └── AccessibilityManager.ts
│   ├── input/
│   │   └── PatternStabilizer.ts
│   ├── native/
│   │   └── NativeEngineIntegration.ts  # STUB
│   ├── store/
│   │   ├── game-store.ts
│   │   ├── seed-store.ts
│   │   └── input-store.ts
│   ├── utils/
│   │   ├── DeviceQuality.ts
│   │   ├── PlatformConfig.ts
│   │   └── AssetLoader.ts
│   └── types/
│       └── index.ts
├── docs/
│   ├── memory-bank/                 # 4 Grok design docs (canonical)
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── GITHUB_ACTIONS.md
│   └── AUTOMATED_WORKFLOWS.md
├── .github/workflows/
│   ├── ci.yml
│   ├── cd.yml
│   └── automerge.yml
├── .maestro/                        # Mobile E2E flows
├── e2e/web/                         # Playwright web E2E
└── android/ + ios/                  # Expo prebuild native projects
```

---

## What the Extraction Plan v4.2 Got Wrong

1. **Assumed Reactylon JSX entry point** — The codebase uses imperative Babylon.js, not `<Engine>` → `<Scene>` JSX
2. **Referenced Miniplex 1.x API** — `world.archetype()` and `world.createEntity()` don't exist in Miniplex 2.0
3. **Assumed Havok PhysicsAggregate** — The codebase has workaround force simulations
4. **Assumed WGSL shaders** — The codebase uses GLSL (acceptable since Babylon auto-transpiles)
5. **Never specified the BOOTSTRAP LAYER** — No mention of how React connects to Babylon scene
6. **Never specified the RENDER LOOP** — Who calls scene.render()? When?
7. **Assumed @reactylon/core imports** — The codebase imports directly from @babylonjs/core
8. **Repository cleanup commands were destructive** — `rm -rf android ios` would delete working Expo prebuild

## What This Plan v5.0 Fixes

1. **Documents actual architecture** — Imperative Babylon.js in useEffect, SceneManager context
2. **Identifies the missing link** — SystemOrchestrator.initAll() was never called
3. **Prioritized integration order** — P0 (playable) → P1 (feedback) → P2 (enemies) → P3 (physics) → P4 (XR)
4. **Includes verification at each step** — tsc, tests, lint, visual playtest
5. **Acknowledges workarounds** — Physics stubs are documented, not hidden
6. **Preserves what works** — 129 tests, clean compilation, rendering scene
