# Active Context — Cognitive Dissonance

## Current State (2026-02-18)

### Branch: `feat/reactylon-migration`

### What's Done
- Full foundation fix: Next.js 16.1.6 + Turbopack + Babylon.js 8 + Reactylon 3.5.4
- React 19, TypeScript 5.9, Tailwind 4
- Biome 2.4.1 for linting/formatting (replaced ESLint)
- `pnpm build` passes in ~11s (Turbopack production)
- `pnpm dev` starts in 440ms, first page compile ~10s
- All game code migrated to `src/` directory structure
- babel-plugin-reactylon working with Turbopack (Babel for user code, SWC for internals)
- 11 Playwright E2E tests passing (smoke, gameplay, governor)
- All 15 component files compiling and served at runtime (200 OK)
- 5 Zustand stores (seed, level, audio, game, input)
- 3 shader materials ported to Babylon.js (celestial, neon-raymarcher, crystalline-cube)
- Miniplex ECS world with entity archetypes
- GSAP CustomEase definitions for mechanical animations
- Title/game-over overlays with symmetric design
- ATC WebGL2 background shader (CSP-safe)

### What's NOT Done (Runtime Visual Verification)
- 3D scene rendering not visually verified (renders 200 OK but no human eye-test)
- Glass sphere + celestial shader visual quality untested
- Platter geometry + GSAP garage-door animation untested
- Pattern stabilization click detection not wired to real gameplay
- Enemy spawner billboard planes need depth/alpha testing
- Post-process corruption shader needs visual testing
- Audio Tone.js initialization requires user gesture flow testing
- Spatial audio Panner3D not connected
- Physics keys (Ammo.js) stubbed

### Next Steps (Priority Order)
1. Visual smoke test: run dev, verify 3D scene renders correctly in browser
2. Debug glass sphere + celestial shader display
3. Verify platter geometry + GSAP garage-door animations
4. Wire pattern stabilization click detection
5. Wire enemy spawner tension-threshold spawning
6. Test audio initialization flow
7. Test post-process corruption ramp
8. Connect spatial audio Panner3D nodes
9. XR hand tracking setup

### Open Decisions
- Physics engine (Ammo.js) for keycap press weight — currently stubbed
- XR hand tracking session setup — not implemented
- Spatial audio (Tone.js Panner3D) — placeholder only
- Whether to keep android/ios scaffolds or remove them
