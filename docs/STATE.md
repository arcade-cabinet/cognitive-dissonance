---
title: Current State
updated: 2026-04-10
status: current
domain: context
---

# Current State — Cognitive Dissonance v3.0

## Completed

- **v3.0 Core Architecture**: Babylon.js 8 + Miniplex ECS + Reactylon (Metro bundler)
- **Web Rendering**: WebGPU primary (Chrome 113+), WebGL2 fallback
- **ECS System**: 31 orchestrated systems, 4 bootstrap + 27 singletons
- **Gameplay Loop**: Tension system, pattern stabilization, keycap interaction
- **Level Archetypes**: 4 implemented (PlatterRotation, LeverTension, KeySequence, CrystallineCubeBoss) of 25 designed
- **Enemy AI**: Procedural morph-based enemies with 7 Yuka traits
- **Boss Encounter**: Crystalline-cube boss with 5-phase GSAP timeline
- **Audio**: Tone.js adaptive spatial audio + procedural SFX
- **Haptics**: expo-haptics on native, navigator.vibrate on web
- **AR/MR Modes**: Dual modes (glasses room-scale + phone projection) via WebXR
- **Cross-Platform**: Metro + Expo SDK 55, app entry points for web/native
- **Testing**: Jest unit + property-based tests, Playwright web E2E, Maestro mobile E2E
- **CI/CD**: GitHub Actions linting, testing, release automation
- **Documentation**: ARCHITECTURE.md, DESIGN.md, TESTING.md, DEPLOYMENT.md, AGENTS.md, CLAUDE.md
- **Code Quality**: Biome 2.4 linting, TypeScript strict mode, tree-shakable imports

## In Progress

- **Reactylon Native Integration**: Reactylon 3.5 in package.json, but zero source files yet use it. Native rendering target is Metal (iOS) and Vulkan (Android), but currently web-only.
- **Real Device Testing**: AR hand tracking and ARCore/ARKit integration need real-device validation
- **AR Occlusion**: Environment-depth API for iOS 26+ / Quest 3+, stencil fallback implemented but untested

## Known Issues

- Havok physics keycap constraints need LINEAR_Y stiffness/damping tuning
- Biome auto-fix removes private field declarations assigned only in methods (re-add manually after `biome check --write --unsafe`)
- AR hand tracking functional but needs real-device testing
- AR occlusion requires iOS 26+ or Quest 3+ for environment-depth (stencil fallback works but untested)
- Stale docs removed: `docs/memory-bank/`, session dumps, extraction plans

## Next Steps (Priority Order)

### P0: Stabilization & Real-Device Validation
1. **Real device testing**: iOS (iPhone 14+), Android (Pixel 8/OnePlus 12+)
2. **Physics tuning**: Validate keycap constraints, lever resistance
3. **AR hand tracking**: Test 26-joint tracking on glasses, mapping to keycaps/lever
4. **Performance profiling**: Memory, frame rate on mid-range Android
5. **Audio sync**: Haptic + audio + tension sync validation

### P1: Reactylon Native Wiring
1. Create `src/native/ReactylonBridge.tsx` to wire lights/camera via Reactylon JSX (planned)
2. Test native rendering pipeline on iOS/Android
3. Validate WebGPU → Metal → WGSL→MSL conversion chain
4. Validate WebGPU → Vulkan → WGSL→SPIR-V conversion chain

### P2: Extended Gameplay Content
1. Implement remaining 21 level archetypes (currently 4 of 25)
2. Add procedural music variation (seed-driven BPM/swing/root note changes)
3. Extend boss encounter phases (5 → 7-10 phases)
4. Add diegetic accessibility (voice commands via expo-speech, adaptive haptics)

### P3: Polish & Player Experience
1. Visual degradation system (cracks on sphere as tension rises)
2. World-crush visual effect during boss timeline (sphere distortion)
3. Post-processing intensity (bloom, vignette, chromatic aberration) tied to tension
4. Coherence ring animation (pulsing glow matching tension)

### P4: SharedDreams Multiplayer
1. WebRTC DataChannel for 2-player co-op
2. Anchor/tension synchronization between players
3. Shared pattern stream with per-player keycap allocation
4. Leaderboard persistence

## Active Branches

- `main` — v3.0 shipping, all tests green
- `docs/standardization-sweep` — Adding YAML frontmatter, STANDARDS.md, STATE.md, removing session dumps

## Session Notes

- Documentation standardization sweep performed 2026-04-10
- Removed stale files: `docs/memory-bank/`, `docs/claude-conversation-*.md`
- Added YAML frontmatter to all root-level and docs `.md` files
- Created new files: STANDARDS.md (code quality constraints), STATE.md (this file)
- Verified all root-level files under 300 LOC
