# Progress — Cognitive Dissonance

## What Works

### Foundation
- [x] Next.js 16 + Turbopack (dev: 440ms startup, build: ~14s)
- [x] React 19 + TypeScript 5.9
- [x] Biome 2.4.1 — 0 errors, 0 warnings
- [x] babel-plugin-reactylon tree-shaking via Turbopack
- [x] `pnpm build` passes
- [x] `pnpm dev` serves 200 OK
- [x] All component files compile and load at runtime

### Core Gameplay
- [x] Deterministic fixed-step spawn scheduling for patterns and enemy waves (FPS-independent tick model)
- [x] Per-color keycap matching (12 keycaps, seeded colorIndex, only matching key stabilizes)
- [x] Pattern stabilization (escaping tendrils, hold to pull back, per-color matching)
- [x] Enemy spawner (Yuka AI: seek, wander, zigzag, split behaviors)
- [x] Enemy split behavior (2 smaller seeker children on death)
- [x] Moment of clarity (coherence at 100 → blue pulse, "COHERENCE MAINTAINED", entropy resumes)
- [x] Glass sphere with celestial nebula shader (tension-driven degradation)
- [x] Sphere shatter at max tension (particle explosion + game over)
- [x] Restart ritual (spheres recreate with GSAP emergence + emissive pulse)
- [x] Keycap color palette (`src/lib/keycap-colors.ts`)

### Visual Polish
- [x] Reduced-motion behavior applied to overlays and high-motion 3D/post-process systems
- [x] Heavy industrial platter (PBR metal, garage-door keycap emergence)
- [x] GSAP CustomEase animations (heavyMechanical, mechSettle, gearWobble)
- [x] Metallic dust particles on garage-door open
- [x] Recess glow animation (tension-driven intensity + color shift)
- [x] Diegetic GUI coherence arc (two-layer: dim background + proportional foreground)
- [x] Post-process corruption (chromatic aberration, noise, vignette, scanlines)
- [x] SPS enemies (SolidParticleSystem for dense wave visuals)
- [x] Symmetric title/game-over overlays ("COGNITIVE DISSONANCE" → "COGNITION SHATTERED")
- [x] ATC WebGL2 background shader (CSP-safe)

### Audio
- [x] Audio graph lifecycle registry + shutdown disposal (Tone nodes/loops cleaned on teardown)
- [x] Tone.js ambient score (4 seed-driven layers: drone, pads, glitch, chimes)
- [x] Spatial audio: pattern escape whoosh (brown noise + filter sweep)
- [x] Spatial audio: stabilization chime (sine synth, chromatic pitch)
- [x] Spatial audio: glass shatter (white noise + highpass + long reverb)

### State Management
- [x] 5 Zustand stores (seed, level, audio, game, input)
- [x] Miniplex ECS world
- [x] Zustand bridge on window for E2E access

### Platform Scaffolds
- [x] Web (Next.js app)
- [x] Android/iOS native entry (`native/App.tsx`)
- [x] XR session stub (`xr-session.tsx`)

### Testing
- [x] 59 Vitest unit tests (stores, utilities, shaders, fixed-step determinism helpers) — all passing
- [x] 18 Playwright E2E tests (smoke, gameplay, governor) — all passing
- [x] Governor survives 30+ seconds with active play
- [x] 3 restart cycle stability test
- [x] Console error monitoring intentionally disabled in E2E
- [x] xvfb-run for headed WebGL testing on headless servers

## What's Left

- [ ] Execute `docs/memory-bank/release-2.0-alignment-plan.md` for production 2.0 alignment closure
- [ ] XR hand tracking → keycap interaction — stub only
- [ ] Visual quality human eye-test
- [ ] Mobile touch optimization
- [ ] Full release-gate E2E run in CI/Xvfb environment

## Known Issues

- Reactylon Engine does NOT accept `antialias` as top-level prop (must be in `engineOptions`)
- Reactylon Scene does NOT accept `clearColor` as prop (must use `onSceneReady` callback)
- `ShaderMaterial` does NOT have `storeEffectOnSubMeshes` option
- `Tone.js` MetalSynth does NOT accept `frequency` in constructor
- React Native peer dep warnings from reactylon transitive deps (harmless)
