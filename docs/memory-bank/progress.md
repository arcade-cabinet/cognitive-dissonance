# Progress — Cognitive Dissonance

## What Works

- [x] Next.js 16 + Turbopack (dev: 440ms startup, build: ~11s)
- [x] React 19 + TypeScript 5.9
- [x] Biome 2.4.1 linting/formatting
- [x] babel-plugin-reactylon tree-shaking via Turbopack
- [x] `pnpm build` passes — zero errors
- [x] `pnpm dev` serves 200 OK on first page load
- [x] All 15 component files compile and load at runtime
- [x] 5 Zustand stores (seed, level, audio, game, input)
- [x] 3 shader materials ported to Babylon.js 8 (celestial, neon-raymarcher, crystalline-cube)
- [x] Miniplex ECS world with archetypes
- [x] ATC WebGL2 background shader (CSP-safe)
- [x] Title/game-over overlays with symmetric static design
- [x] GSAP CustomEase definitions for mechanical feel
- [x] Game code migrated to src/ directory structure
- [x] 11 Playwright E2E tests — all passing:
  - Smoke (5): page loads, canvas exists, title appears, title fades, canvas has context
  - Gameplay (3): scene visible, game-over overlay, restart flow
  - Governor (3): 10s survival, restart cycle, 3-cycle stability

## What's Left (Runtime Visual Verification)

- [ ] 3D scene visual quality check (human eye-test)
- [ ] Glass sphere + celestial shader display
- [ ] Platter geometry + GSAP garage-door animations
- [ ] Pattern stabilization click detection wiring
- [ ] Enemy spawner billboard plane depth/alpha
- [ ] Post-process corruption visual ramp
- [ ] SPS enemy particles activation
- [ ] Diegetic GUI ring visibility
- [ ] Audio initialization on user gesture
- [ ] Full gameplay loop end-to-end

## Stubbed / Placeholder

- `physics-keys.tsx`: Ammo.js setup commented out — needs full physics integration
- `spatial-audio.tsx`: No Tone.js Panner3D nodes connected — placeholder
- XR hand tracking: Not implemented — requires WebXR session setup

## Known Issues

- Reactylon Engine does NOT accept `antialias` as top-level prop (must be in `engineOptions`)
- Reactylon Scene does NOT accept `clearColor` as prop (must use `onSceneReady` callback)
- `babel-plugin-reactylon` requires `@babel/preset-typescript` with `isTSX: true` for Turbopack
- Zustand store action renamed from `useLastSeed` to `replayLastSeed` (avoids React hooks naming conflict)
- `ShaderMaterial` does NOT have `storeEffectOnSubMeshes` option
- `Tone.js` MetalSynth does NOT accept `frequency` in constructor
- `@types/yuka` v0.7.4 provides proper type definitions
- React Native peer dep warnings from reactylon's transitive deps (harmless)
