# Tasks — Cognitive Dissonance v3.0

## Phase 1: Repository Cleanup

- [ ] 1. Targeted repository cleanup (Req 25)
  - [ ] 1.1 Delete Next.js files: src/app/, next.config.ts, next-env.d.ts, postcss.config.mjs
  - [ ] 1.2 Delete legacy web files: index.html, index.html.old-canvas, .next/
  - [ ] 1.3 Delete v2.0 test infrastructure: e2e/, vitest.config.ts, playwright.config.ts, src/lib/__tests__/, src/store/__tests__/
  - [ ] 1.4 Delete src/components/ui/ (Tailwind/shadcn remnants)
  - [ ] 1.5 Delete native/ directory (incomplete v2.0 stub)
  - [ ] 1.6 Delete sonar-project.properties
  - [ ] 1.7 Delete scripts/ directory (v2.0 utility scripts)
  - [ ] 1.8 Update .gitignore with Reactylon Native / Expo / Metro ignores

## Phase 2: Cross-Platform Foundation

- [ ] 2. Project foundation and build system (Req 1)
  - [ ] 2.1 Initialize Expo SDK 55 base project: `pnpm create expo-app cognitive-dissonance --template default@next`
  - [ ] 2.2 Install Reactylon and Babylon.js: `pnpm add reactylon babel-plugin-reactylon @babylonjs/core @babylonjs/havok`
  - [ ] 2.3 Install core game deps: `pnpm add miniplex miniplex-react gsap tone zustand yuka seedrandom`
  - [ ] 2.4 Install Expo native modules: `pnpm add expo-haptics expo-speech expo-camera expo-dev-client expo-build-properties`
  - [ ] 2.5 Install dev deps: `pnpm add -D typescript @types/react jest ts-jest @types/jest fast-check @biomejs/biome @playwright/test`
  - [ ] 2.6 Run `npx expo install --fix` to resolve Expo dependency version mismatches
  - [ ] 2.7 Update package.json scripts: remove Next.js/Vitest scripts, add Metro/Expo/Jest/Maestro scripts per design doc
  - [ ] 2.8 Create index.web.tsx entry point (Metro + Expo web + WebGPU)
  - [ ] 2.9 Create index.native.tsx entry point (Metro + Expo SDK 55)
  - [ ] 2.10 Configure metro.config.js: extend Expo Metro config (`expo/metro-config`) with Reactylon Native resolver and shader source extensions
  - [ ] 2.11 Configure babel.config.js: `babel-preset-expo` + `babel-plugin-reactylon` (NOT metro-react-native-babel-preset)
  - [ ] 2.12 Update tsconfig.json: target ES2022, strict mode, @babylonjs/core subpath aliases
  - [ ] 2.13 Generate native projects via `npx expo prebuild --clean` (NOT from Reactylon Native template — Reactylon template targets RN 0.74, Expo SDK 55 uses RN 0.83)
  - [ ] 2.14 Verify Reactylon + Expo SDK 55 compatibility: confirm babel-plugin-reactylon transforms work with babel-preset-expo, confirm @babylonjs/core tree-shakable imports resolve through Metro, confirm Expo New Architecture (mandatory in SDK 55) doesn't conflict with Reactylon reconciler

- [ ] 3. Engine initialization and rendering (Req 2)
  - [ ] 3.1 Implement EngineInitializer with WebGPU detection and WebGL2 fallback on web
  - [ ] 3.2 Implement Reactylon Native backend initialization for mobile (Babylon Native)
  - [ ] 3.3 Implement SceneManager with black clear color and right-handed coordinates
  - [ ] 3.4 Implement PlatformConfig (isWeb/isNative detection)

- [ ] 4. Adaptive device quality system (Req 3)
  - [ ] 4.1 Implement DeviceQuality detection (low/mid/high tiers from device memory + UA heuristics)
  - [ ] 4.2 Implement quality config application (particle caps, shader LOD, post-process intensity)

## Phase 3: ECS Architecture

- [ ] 5. Miniplex ECS world and archetypes (Req 4)
  - [ ] 5.1 Create World.ts with consolidated GameEntity type and all archetype definitions
  - [ ] 5.2 Implement Level_Archetype entities (PlatterRotation, LeverTension, KeySequence, CrystallineCubeBoss)
  - [ ] 5.3 Implement Hand_Archetype entities (LeftHand, RightHand with 26 joints)
  - [ ] 5.4 Implement AR_Archetype entities (WorldAnchored, Projected, ARSphere)
  - [ ] 5.5 Implement Enemy_Archetype and Boss_Archetype entities
  - [ ] 5.6 Implement spawnDreamFromSeed(seedHash) — seed modulo 4 archetype selection
  - [ ] 5.7 Set up miniplex-react bindings (useQuery) for reactive system queries

## Phase 4: Core Gameplay Systems

- [ ] 6. Tension system (Req 5)
  - [ ] 6.1 Implement TensionSystem singleton (currentTension clamped 0.0–0.999)
  - [ ] 6.2 Implement increase/decrease/setTension with Level_Archetype scaling
  - [ ] 6.3 Implement over-stabilization rebound (2% chance of +0.12 below 0.05 tension)
  - [ ] 6.4 Implement tension propagation to audio, degradation, morph, nebula, post-process
  - [ ] 6.5 Implement sphere shatter trigger at tension 0.999

- [ ] 7. Difficulty scaling system (Req 43)
  - [ ] 7.1 Implement DifficultyScalingSystem singleton with logarithmic scaling model: `baseValue * (1 + k * Math.log1p(tension * timeScale))`
  - [ ] 7.2 Implement DifficultySnapshot computation (spawnRate, maxEnemyCount, patternComplexity, morphSpeed, bossSpawnThreshold, tensionIncreaseModifier)
  - [ ] 7.3 Implement per-frame update via scene.registerBeforeRender reading tension from TensionSystem and elapsed time from engine clock
  - [ ] 7.4 Implement writing updated difficulty values to active Level_Archetype entity's ECS components each frame
  - [ ] 7.5 Implement tension-difficulty feedback loop with seed-derived damping coefficient (0.7–0.9)
  - [ ] 7.6 Implement per-archetype scaling extensions (PlatterRotation RPM, LeverTension tolerance, KeySequence length/window, CrystallineCubeBoss slam cycles/counter window)
  - [ ] 7.7 Wire DifficultyScalingSystem into SystemOrchestrator initialization order (after TensionSystem) and per-frame update order (after PatternStabilizationSystem, before TensionSystem)

- [ ] 8. Pattern stabilization system (Req 6)
  - [ ] 8.1 Implement PatternStabilizationSystem with active pattern tracking
  - [ ] 8.2 Implement holdKey (tendril retraction, tension decrease via TensionSystem)
  - [ ] 8.3 Implement full pattern set match detection with coherence bonus (0.09 tension decrease)
  - [ ] 8.4 Implement missed pattern → Echo spawn + Yuka_Enemy spawn
  - [ ] 8.5 Apply physics impostors to keycaps (mass 0.3, restitution 0.1)

- [ ] 9. Corruption tendril system (Req 7)
  - [ ] 9.1 Implement SolidParticleSystem with up to 24 tendril shapes on Sphere
  - [ ] 9.2 Implement tension-proportional spawn rate (threshold > 0.3)
  - [ ] 9.3 Implement tendril retraction on matching keycap hold (tension -0.03)
  - [ ] 9.4 Implement Buried_Seed-derived color palette for tendrils

- [ ] 10. Mechanical animation system (Req 8)
  - [ ] 10.1 Implement GSAP timelines with CustomEase "heavyMechanical"
  - [ ] 10.2 Implement garage-door slit open animation (staggered top/bottom)
  - [ ] 10.3 Implement MODE_LEVER pull animation (back.out ease + AR mode switch callback)
  - [ ] 10.4 Implement keycap emergence via GSAP MotionPath

- [ ] 11. Echo system (Req 20)
  - [ ] 11.1 Implement ghost keycap spawn (alpha 0.4, red-tinted) on missed pattern
  - [ ] 11.2 Implement auto-dispose after 1800ms
  - [ ] 11.3 Implement tension increase (+0.035) and haptic pulse on echo spawn
  - [ ] 11.4 Implement one-active-echo-per-key constraint

- [ ] 12. Zustand state stores
  - [ ] 12.1 Implement seed-store (seedString, rng, generateNewSeed, replayLastSeed)
  - [ ] 12.2 Implement game-store (phase: title/playing/shattered, transitions)
  - [ ] 12.3 Implement input-store (keycap pressed states)

## Phase 5: Visual Systems

- [ ] 13. Sphere nebula material (Req 9)
  - [ ] 13.1 Implement PBRMaterial extension with sub-surface refraction (0.95), zero metallic
  - [ ] 13.2 Implement WGSL celestial nebula shader with GLSL fallback
  - [ ] 13.3 Implement tension-driven color interpolation (blue → red)
  - [ ] 13.4 Implement breathing scale pulse (sin 1.8 Hz × tension × 0.03)
  - [ ] 13.5 Implement static jitter above tension 0.7

- [ ] 14. Mechanical platter construction (Req 10)
  - [ ] 14.1 Create platter cylinder mesh (0.18m × 1.2m) with PBR near-black metal
  - [ ] 14.2 Create recessed torus track (0.8m × 0.04m)
  - [ ] 14.3 Create garage-door slit (top/bottom box meshes)
  - [ ] 14.4 Create MODE_LEVER box mesh (0.08 × 0.12 × 0.04m at x=0.55)
  - [ ] 14.5 Create 14 keycap box meshes on rim (polar distribution)
  - [ ] 14.6 Create 52cm Sphere with glass PBR, parented to platter

- [ ] 15. Post-process corruption pipeline (Req 18)
  - [ ] 15.1 Implement PostProcessRenderPipeline (bloom, vignette, chromatic aberration)
  - [ ] 15.2 Implement tension-driven effect scaling (bloom × 0.8, vignette × 0.6, chromatic × 0.04)
  - [ ] 15.3 Implement DeviceQuality tier intensity caps

- [ ] 16. Diegetic GUI and title system (Req 19)
  - [ ] 16.1 Implement coherence ring torus (0.58m × 0.01m, emissive PBR, blue→red)
  - [ ] 16.2 Implement "COGNITIVE DISSONANCE" title plane on platter rim (GSAP back.out)
  - [ ] 16.3 Implement "COGNITION SHATTERED" game-over plane on sphere (red static, GSAP yoyo × 3)

- [ ] 17. Mechanical degradation system (Req 21)
  - [ ] 17.1 Implement PBR normal map crack intensity (up to 0.8) for WebGL2 fallback
  - [ ] 17.2 Implement rotation micro-jitter (sin(t/200) × 0.0005)
  - [ ] 17.3 Implement lever resistance creep in GSAP timelines
  - [ ] 17.4 Enforce zero sphere color changes under fallback

## Phase 6: Enemy Systems

- [ ] 18. Procedural morph-based enemies (Req 11)
  - [ ] 18.1 Implement MorphTargetManager with GPU vertex morphing
  - [ ] 18.2 Implement 7 morph trait vertex offset functions (NeonRaymarcher through SphereCorruptor)
  - [ ] 18.3 Implement tension-driven morphProgress (lerp 0→1 at tension × 1.5)
  - [ ] 18.4 Implement counter mechanic (gripStrength × 0.15 reduces morphProgress, dispose at 0)
  - [ ] 18.5 Implement DeviceQuality morph target caps (4/8/12 by tier)

- [ ] 19. Crystalline-cube boss system (Req 12)
  - [ ] 19.1 Implement boss spawn conditions (tension ≥ bossSpawnThreshold from DifficultyScalingSystem OR 3 consecutive misses)
  - [ ] 19.2 Implement 5-phase GSAP timeline (emerge → descend → slam prep → impact → resolve)
  - [ ] 19.3 Implement counter phase (health -= totalGripStrength × 0.012/frame)
  - [ ] 19.4 Implement success path (health ≤ 0 → shatter into Yuka shards)
  - [ ] 19.5 Implement failure path (health > 0.3 → permanent deformation, tension → 0.999)

## Phase 7: XR / AR Systems

- [ ] 20. Dual AR/MR modes (Req 13)
  - [ ] 20.1 Implement ARSessionManager with device type detection (Expo Device API)
  - [ ] 20.2 Implement glasses room-scale mode (WebXRAnchor + plane detection + hand interaction)
  - [ ] 20.3 Implement phone camera projection mode (hit-test + touch input)
  - [ ] 20.4 Implement MODE_LEVER mode switching with re-anchoring
  - [ ] 20.5 Implement screen-mode fallback (no AR → dark void)

- [ ] 21. XR hand tracking and haptics (Req 14)
  - [ ] 21.1 Implement XRManager with WebXRHandTracking → Hand_Archetype entities
  - [ ] 21.2 Implement HandInteractionSystem (finger→keycap, palm→lever, joints→sphere)
  - [ ] 21.3 Implement MechanicalHaptics (expo-haptics native, navigator.vibrate web)
  - [ ] 21.4 Implement Tone.js brown noise rumble synced to tension

- [ ] 22. Phone projection touch system (Req 15)
  - [ ] 22.1 Implement pointer-down/move observers on scene
  - [ ] 22.2 Implement raycast pick → keycap/lever/rim routing

- [ ] 23. AR occlusion shader (Req 16)
  - [ ] 23.1 Implement AROcclusionMaterial with environment-depth texture binding
  - [ ] 23.2 Implement depth-based fragment discard (virtualDepth > realDepth + 0.01)
  - [ ] 23.3 Implement stencil buffer + DepthRenderer fallback
  - [ ] 23.4 Apply occlusion material to all virtual meshes

## Phase 8: Audio

- [ ] 24. Audio system (Req 17)
  - [ ] 24.1 Implement ImmersionAudioBridge (Tone.js core + expo-audio native bridge)
  - [ ] 24.2 Implement tension-driven reverb wet adjustment (0.3 → 0.9)
  - [ ] 24.3 Implement SpatialAudioManager (event-driven procedural SFX at contact points)
  - [ ] 24.4 Implement Buried_Seed-derived BPM/swing/sequence parameters

## Phase 9: Accessibility

- [ ] 25. Accessibility and voice commands (Req 22)
  - [ ] 25.1 Implement voice command recognition via expo-speech
  - [ ] 25.2 Implement spoken keycap letter → holdKey mapping (1200ms, grip 1.0)
  - [ ] 25.3 Implement adaptive haptics (error above 0.7, medium 0.4–0.7)

## Phase 10: Multiplayer

- [ ] 26. Shared dreams multiplayer (Req 23)
  - [ ] 26.1 Implement AR anchor sharing with peer ID
  - [ ] 26.2 Implement remote platter rendering (glass-shard overlay)
  - [ ] 26.3 Implement shared corruption sync (+0.01 tension)

## Phase 11: Production Packaging

- [ ] 27. Production packaging (Req 24)
  - [ ] 27.1 Create app.json with iOS/Android bundle IDs, AR entitlements, and expo plugins
  - [ ] 27.2 Create eas.json with development/preview/production build profiles
  - [ ] 27.3 Verify production bundle < 5 MB gzipped

## Phase 12: CI/CD Migration

- [ ] 28. GitHub Actions CI/CD migration (Req 26)
  - [ ] 28.1 Rewrite .github/workflows/ci.yml: Biome lint, tsc --noEmit, Jest unit tests, Expo web build + size check, Gradle debug APK, Playwright web E2E, Maestro mobile E2E
  - [ ] 28.2 Rewrite .github/workflows/cd.yml: Expo web export → GitHub Pages, Gradle release APK → GitHub Release, EAS Build iOS (conditional)
  - [ ] 28.3 Update .github/actions/setup/action.yml for v3.0 pnpm lockfile
  - [ ] 28.4 Update automerge.yml with new CI job references
  - [ ] 28.5 Remove SonarCloud and CodeQL steps from CI

- [ ] 29. Dependabot configuration migration (Req 27)
  - [ ] 29.1 Update .github/dependabot.yml: remove capacitor/vitest groups, add babylonjs/reactylon/expo/react-native groups
  - [ ] 29.2 Retain react and dev-tools groups, retain github-actions ecosystem

## Phase 13: Documentation Updates

- [ ] 30. Documentation rewrite (Req 28)
  - [ ] 30.1 Rewrite docs/ARCHITECTURE.md for v3.0 (Reactylon Native + Metro + Miniplex ECS + dual AR/MR)
  - [ ] 30.2 Rewrite docs/DEPLOYMENT.md for v3.0 (Expo web export + EAS Build iOS/Android + Metro dev-client)
  - [ ] 30.3 Rewrite docs/GITHUB_ACTIONS.md for v3.0 (Jest + Playwright web E2E + Maestro mobile E2E + Expo/Gradle builds)
  - [ ] 30.4 Update docs/AUTOMATED_WORKFLOWS.md (new Dependabot groups, automerge conditions)
  - [ ] 30.5 Rewrite docs/DESIGN.md for v3.0 (dual AR/MR, morph enemies, boss, MODE_LEVER, AR occlusion)
  - [ ] 30.6 Rewrite docs/DESIGN_SYSTEM.md for v3.0 (WGSL nebula, AR occlusion, morph enemy materials, boss crystalline)
  - [ ] 30.7 Rewrite README.md for v3.0 cross-platform overview
  - [ ] 30.8 Rewrite AGENTS.md for v3.0 architecture, tech context, commands
  - [ ] 30.9 Rewrite CLAUDE.md for v3.0 conventions and commands
  - [ ] 30.10 Rewrite DEVELOPMENT.md for v3.0 dev workflow (Metro + Android Studio/Xcode)
  - [ ] 30.11 Rewrite TESTING.md for v3.0 (Jest + fast-check + Playwright web + Maestro mobile)
  - [ ] 30.12 Rewrite .github/copilot-instructions.md for v3.0 stack
  - [ ] 30.13 Update .gemini/prompts/*.toml for v3.0 architecture references

## Phase 14: Test Infrastructure Migration

- [ ] 31. Test infrastructure setup (Req 29)
  - [ ] 31.1 Remove Vitest dependencies and config (vitest, @vitest/coverage-v8, vitest.config.ts)
  - [ ] 31.2 Install Jest + ts-jest + @types/jest + fast-check
  - [ ] 31.3 Create jest.config.ts (ts-jest transform, node env, @babylonjs/core moduleNameMapper, lcov coverage)
  - [ ] 31.4 Migrate existing unit tests to Jest syntax (vi.fn → jest.fn, vi.spyOn → jest.spyOn, vi.mock → jest.mock)
  - [ ] 31.5 Update Playwright config for Expo web dev server (webServer.command: "pnpm web", port 8081)
  - [ ] 31.6 Migrate existing Playwright E2E tests to work with Expo web build
  - [ ] 31.7 Install Maestro and create .maestro/ directory with config.yaml
  - [ ] 31.8 Create Maestro flows: app-launch.yaml, gameplay-loop.yaml, ar-session.yaml, game-over.yaml

- [ ] 32. Property-based tests for core systems (Req 29.5, Req 43)
  - [ ] 32.1 Write PBT: TensionSystem tension clamping invariant (P1)
  - [ ] 32.2 Write PBT: TensionSystem over-stabilization threshold (P2)
  - [ ] 32.3 Write PBT: ECS World seed determinism (P3)
  - [ ] 32.4 Write PBT: PatternStabilization coherence bonus (P4)
  - [ ] 32.5 Write PBT: CorruptionTendril spawn rate monotonicity (P5)
  - [ ] 32.6 Write PBT: Echo uniqueness constraint (P6)
  - [ ] 32.7 Write PBT: DeviceQuality tier bounds (P7)
  - [ ] 32.8 Write PBT: Boss spawn conditions (P8)
  - [ ] 32.9 Write PBT: Seed-to-archetype mapping completeness (P9)
  - [ ] 32.10 Write PBT: Keyboard multi-key hold limit (P10)
  - [ ] 32.11 Write PBT: Game phase transition validity (P12)
  - [ ] 32.12 Write PBT: PlatterRotation reach zone invariant (P13)
  - [ ] 32.13 Write PBT: Seed audio parameter ranges (P16)
  - [ ] 32.14 Write PBT: Seed-to-entity component completeness (P17)
  - [ ] 32.15 Write PBT: Logarithmic scaling formula correctness (P18)
  - [ ] 32.16 Write PBT: Difficulty snapshot bounds invariant (P19)
  - [ ] 32.17 Write PBT: Per-archetype difficulty bounds (P20)
  - [ ] 32.18 Write PBT: Difficulty feedback loop stability (P21)
  - [ ] 32.19 Write PBT: Asymptotic strict inequality (P22)
  - [ ] 32.20 Write PBT: Seed-derived difficulty variance (P23)

## Phase 15: Gap Requirements Implementation

- [ ] 33. Level archetype gameplay mechanics (Req 30)
  - [ ] 33.1 Extract and implement DreamTypeHandler singleton with DreamHandler interface (source: ARCH v3.4 CognitiveDissonanceRoot.tsx)
  - [ ] 33.2 Implement PlatterRotationDream handler (rotation, reach zone, RPM scaling) — extract platter rotation logic from ARCH v3.1 LevelArchetypeSystem.ts
  - [ ] 33.3 Implement LeverTensionDream handler (lever-centric input, slit rhythm, frequency matching)
  - [ ] 33.4 Implement KeySequenceDream handler (multi-key sequences, ghost highlights, time windows)
  - [ ] 33.5 Implement CrystallineCubeBossDream handler (immediate boss, dual lever+keycap counter, 3 slam cycles)
  - [ ] 33.6 Implement archetype transition logic (dispose previous, preserve tension, activate new)

- [ ] 34. Keyboard input system (Req 31)
  - [ ] 34.1 Implement KeyboardInputSystem with scene.onKeyboardObservable
  - [ ] 34.2 Implement letter key → holdKey mapping with hold duration tracking
  - [ ] 34.3 Implement spacebar → pullLever with position ramp (0→1 over 800ms)
  - [ ] 34.4 Implement Enter key → game phase transitions
  - [ ] 34.5 Implement arrow keys → platter rotation (PlatterRotationDream only)
  - [ ] 34.6 Implement 6-key simultaneous hold limit
  - [ ] 34.7 Implement XR/phone projection disable logic

- [ ] 35. System orchestration (Req 32)
  - [ ] 35.1 Extract SystemOrchestrator singleton from ARCH v3.4 + v3.7 (ordered system references)
  - [ ] 35.2 Implement initAll(engine, scene) with sequential async initialization (22 systems including DifficultyScalingSystem)
  - [ ] 35.3 Implement per-frame update registration via scene.registerBeforeRender (12 systems including DifficultyScalingSystem)
  - [ ] 35.4 Implement disposeAll() with reverse-order teardown

- [ ] 36. Game phase and startup sequence (Req 33)
  - [ ] 36.1 Implement Loading phase (diegetic platter rim glow pulse)
  - [ ] 36.2 Implement Title phase (calm sphere, engraving visible, slit closed, keycaps retracted)
  - [ ] 36.3 Implement Playing phase transition (slit open, keycaps emerge, Dream spawn)
  - [ ] 36.4 Implement Shattered phase (64-shard fracture, enemy fade, platter stop, text display)
  - [ ] 36.5 Implement restart logic (4s delay, new seed, transition to Title)
  - [ ] 36.6 Implement Error state (static HTML fallback for no WebGL2/WebGPU)

- [ ] 37. Shader strategy implementation (Req 34)
  - [ ] 37.1 Create src/shaders/registry.ts with all GLSL shaders in Effect.ShadersStore — extract from ARCH v3.7 SphereNebulaMaterial + v3.5 AROcclusionMaterial
  - [ ] 37.2 Extract and modernize celestial nebula vertex + fragment shaders (GLSL) from ARCH v3.7
  - [ ] 37.3 Implement corruption tendril vertex + fragment shaders (GLSL)
  - [ ] 37.4 Extract AR occlusion fragment shader from ARCH v3.5 AROcclusionMaterial (GLSL)
  - [ ] 37.5 Implement crystalline boss vertex + fragment shaders (GLSL) from ARCH v3.5
  - [ ] 37.6 Extract neon raymarcher fragment shader — modernize from MASTER doc SDF raymarching (Three.js → Babylon.js 8)
  - [ ] 37.7 Implement common uniform bindings (tension, time, corruptionLevel, baseColor, deviceQualityLOD)

- [ ] 38. Babylon Native integration (Req 35)
  - [ ] 38.1 Create BabylonNativeView React Native component (requireNativeComponent)
  - [ ] 38.2 Implement iOS native module (Swift: MTKView → Babylon Native Metal engine)
  - [ ] 38.3 Implement Android native module (Kotlin: SurfaceView → Babylon Native Vulkan/GLES engine)
  - [ ] 38.4 Bridge native engine instance to shared SceneManager

- [ ] 39. AR integration — extract from ARCH v3.3–v3.5 (Req 36)
  - [ ] 39.1 Extract and implement web AR via Babylon.js WebXR from ARCH v3.2 XRManager.ts (immersive-ar session, hit-test, anchors, hand-tracking, depth-sensing)
  - [ ] 39.2 Implement iOS AR native module (ARKit ARSession + ARWorldTrackingConfiguration → Babylon Native bridge)
  - [ ] 39.3 Implement Android AR native module (ARCore Session + Config → Babylon Native bridge)
  - [ ] 39.4 Update app.json plugins (expo-camera instead of expo-ar, custom native module configs)
  - [ ] 39.5 Extract and implement ARSessionManager dual-mode logic from ARCH v3.3 (device detection, glasses vs phone, MODE_LEVER switching)
  - [ ] 39.6 Extract and implement PhoneProjectionTouchSystem from ARCH v3.3 (pointer observers, raycast pick routing)
  - [ ] 39.7 Extract and implement HandInteractionSystem from ARCH v3.2 (26-joint → keycap/lever/sphere mapping)
  - [ ] 39.8 Extract and implement AROcclusionMaterial from ARCH v3.5 (environment-depth + stencil fallback)
  - [ ] 39.9 Extract and implement MechanicalHaptics from ARCH v3.2 (expo-haptics + navigator.vibrate + Tone.js rumble)

- [ ] 40. Seed-to-gameplay pipeline (Req 37)
  - [ ] 40.1 Implement mulberry32 hash function and PRNG stream
  - [ ] 40.2 Implement archetype selection (seedHash % 4) → Miniplex entity creation with ALL seed-derived component values (phases, tensionCurve, difficultyConfig, audioParams, archetype-specific params)
  - [ ] 40.3 Implement buildPhaseDefinitions, buildTensionCurve, deriveDifficultyConfig, deriveAudioParams helper functions
  - [ ] 40.4 Implement pattern sequence generation from PRNG + phase patternKeys
  - [ ] 40.5 Implement enemy trait distribution with archetype bias (3x thematic weight)
  - [ ] 40.6 Implement tension curve variance (±15% on spawn rates and hold times)

- [ ] 41. Sphere shatter sequence (Req 38)
  - [ ] 41.1 Implement 200ms gameplay freeze on tension 0.999
  - [ ] 41.2 Implement 64-shard SolidParticleSystem fracture with seed-derived velocities
  - [ ] 41.3 Implement haptic burst (expo-haptics Heavy + navigator.vibrate + Tone.js glass-shatter SFX)
  - [ ] 41.4 Implement enemy freeze + fade (velocity → 0, alpha → 0 over 800ms)
  - [ ] 41.5 Implement platter shutdown (rotation stop, keycap retract via GSAP reverse)
  - [ ] 41.6 Implement "COGNITION SHATTERED" text with GSAP yoyo × 3

- [ ] 42. Physics engine configuration — extract from ARCH v4.1 (Req 39)
  - [ ] 42.1 Extract HavokInitializer from ARCH v4.1 (async WASM load, gravity -9.81, 1/60s timestep)
  - [ ] 42.2 Implement keycap 6DoF constraints (LINEAR_Y stiffness 800, damping 40, travel 0.02m) — extract from ARCH v4.1 MechanicalPlatter
  - [ ] 42.3 Apply physics impostors to keycaps (mass 0.3, restitution 0.1)
  - [ ] 42.4 Implement platter HingeConstraint + angular motor with tension-driven resistance (from ARCH v4.1)
  - [ ] 42.5 Implement MODE_LEVER HingeConstraint with dynamic resistance creep
  - [ ] 42.6 Implement hand joint → PhysicsAggregate force application (from ARCH v4.1 HandPhysicsSystem)

- [ ] 43. Performance budget enforcement (Req 40)
  - [ ] 43.1 Add CI post-build gzip size check (fail if > 5 MB)
  - [ ] 43.2 Add rollup-plugin-visualizer for bundle analysis on CI
  - [ ] 43.3 Implement runtime FPS monitoring in DeviceQuality (downgrade tier if < 30 FPS for 2s)
  - [ ] 43.4 Add Biome lint rule or build-time check flagging barrel @babylonjs/core imports

- [ ] 44. Multiplayer transport layer (Req 41)
  - [ ] 44.1 Implement WebRTC DataChannel peer connection setup
  - [ ] 44.2 Implement WebSocket signaling server (room creation via shared seed, ICE relay)
  - [ ] 44.3 Implement anchor sync messages at 10 Hz
  - [ ] 44.4 Implement tension sync messages at 30 Hz
  - [ ] 44.5 Implement 200ms latency interpolation for remote platter
  - [ ] 44.6 Implement peer disconnect detection (500ms fade, 2000ms dispose)

- [ ] 45. GSAP plugin setup (Req 42)
  - [ ] 45.1 Install gsap 3.13+ from public npm registry
  - [ ] 45.2 Register CustomEase and MotionPathPlugin in MechanicalAnimationSystem initialization
