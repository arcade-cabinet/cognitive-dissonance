# Changelog

All notable changes to Cognitive Dissonance (formerly Psyduck Panic) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **3D rendering via React Three Fiber** replacing PixiJS 2D
  - 3D diorama room (desk, window, moon, stars, posters, progressive clutter)
  - 3D character model with Normal/Panic/Psyduck transformation states
  - Dynamic eye pupil tracking (speed scales with panic level)
  - Enemy bubbles with sphere glow and point lights
  - Boss rendering with pulsing sphere, orbiting orbs, iFrame flash
  - Particle burst, trail ring, and confetti VFX systems
  - Camera shake and fullscreen flash overlay
  - Monitor glow that shifts from calm blue to panicked red
- **Miniplex ECS** for entity management (enemies, bosses, particles, trails, confetti, powerups)
- **Tone.js adaptive music** system with synth layers that intensify with panic and wave progression
- **Grading system** (S/A/B/C/D) on game over based on accuracy and max combo
- **AGENTS.md** cross-agent memory bank for persistent AI context
- Character rendering system with three transformation states (Normal → Panic → Psyduck)
- Comprehensive responsive viewport system supporting phones, tablets, foldables, and desktops
- Capacitor native mobile integration for iOS and Android
- Design token system with 350+ tokens across 7 categories
- Playwright device testing with 15+ device profiles
- Release automation with release-please
- Android APK distribution for all major architectures (arm64-v8a, armeabi-v7a, x86, x86_64)

### Changed
- **Migrated rendering from PixiJS to React Three Fiber** (3D)
- Extracted UI state management to `src/lib/ui-state.ts` (reducer pattern)
- Extracted grade calculation to `src/lib/grading.ts`
- Added Tone.js adaptive music in `src/lib/music.ts`
- Vite build chunks reorganized: `vendor-three`, `vendor-tone`, `game-ecs` replace `vendor-pixi`, `game-renderer`
- Migrated from fixed 800x600 dimensions to fully responsive layout
- Enhanced Game.tsx with viewport-aware coordinate conversion
- Updated CSS with design token variables and grade animations

### Removed
- **PixiJS dependency** (`pixi.js`) — fully replaced by React Three Fiber
- `src/lib/pixi-renderer.ts` and `src/lib/character-renderer.ts` (dead code)
- `@miniplex/react` (replaced by correct `miniplex-react` package)

### Documentation
- Added comprehensive ARCHITECTURE.md (updated for R3F/ECS)
- Added AGENTS.md cross-agent memory bank
- Added device testing documentation
- Added release process documentation

## [1.0.0] - 2026-02-15

### Added
- Initial release of Psyduck Panic: Evolution Deluxe
- WebGL rendering via PixiJS 8.16
- Web Worker-based game loop for 60 FPS performance
- Three enemy types with unique counter mechanics
- 5 waves with increasing difficulty
- Boss battles on waves 3 and 5
- Endless mode after completing wave 5
- Panic meter system with character transformation
- Combo system for score multipliers
- Power-ups (Time Warp, Clarity, 2X Score)
- Enemy variants (normal, speeder, splitter, encrypted)
- Particle effects and visual feedback
- Audio system with dynamic music and sound effects
- PWA support with offline capability
- E2E testing with Playwright
- Unit testing with Vitest

[Unreleased]: https://github.com/arcade-cabinet/cognitive-dissonance/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/arcade-cabinet/cognitive-dissonance/releases/tag/v1.0.0
