# Changelog

All notable changes to Psyduck Panic will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Character rendering system with three transformation states (Normal → Panic → Psyduck)
- Comprehensive responsive viewport system supporting phones, tablets, foldables, and desktops
- Capacitor native mobile integration for iOS and Android
- Design token system with 350+ tokens across 7 categories
- Playwright device testing with 15+ device profiles
- Release automation with release-please
- Android APK distribution for all major architectures (arm64-v8a, armeabi-v7a, x86, x86_64)

### Changed
- Migrated from fixed 800x600 dimensions to fully responsive layout
- Enhanced Game.tsx with viewport-aware coordinate conversion
- Updated CSS with design token variables

### Documentation
- Added comprehensive ARCHITECTURE.md
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

[Unreleased]: https://github.com/arcade-cabinet/psyduck-panic/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/arcade-cabinet/psyduck-panic/releases/tag/v1.0.0
