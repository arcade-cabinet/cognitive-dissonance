---
title: Physics Engine Research for v4
updated: 2026-04-14
status: current
domain: technical
---

# Physics Engine Research

## Requirements (from user direction)

The game needs:

1. **Rotational dynamics** — the platter spins; keycaps, the AI sphere, and sky-rain cubes rotate on multiple axes
2. **Gravity** — sky-rain cubes fall, anything sitting on the platter feels weight, keycap travel has a springy return
3. **Solid-body collisions** — sphere vs rain impacts, rain vs platter surface (for impact flash), rain vs rim (deflection), enemy behaviour inside the sphere

What the game does **NOT** need:

- Soft bodies, cloth, fluids, ragdolls
- Complex joint constraints (the Babylon 6DoF keycap joints were over-engineered — a spring-driven Y translation is enough)
- Networking / determinism across devices (this is a solo game; seed determinism is a replay feature, not a physics feature)
- CCD-intensive workloads (we cap enemy/rain velocity; tunneling is avoidable by design)

## Candidates

### @dimforge/rapier3d (WASM, non-compat)

- **Language**: Rust compiled to WebAssembly
- **Perf**: near-native speed, SIMD-optional variant available
- **Bundle**: JS ~180 KB gzip, WASM ~400 KB gzip (separate file, lazy-loadable)
- **API**: explicit `RigidBodyDesc` + `ColliderDesc` + `world.step()` — minimal, clean
- **Joints/constraints**: prismatic, revolute, ball, fixed — more than enough
- **Determinism**: dedicated deterministic variant if we ever need it
- **Ecosystem**: pmndrs standard (`@react-three/rapier` exists; we don't need it, but it validates the library as production-grade)
- **Status**: actively developed by dimforge, 2024-2025 releases, stable

### cannon-es (pure JS)

- **Language**: TypeScript (fork of cannon.js, maintained by pmndrs)
- **Perf**: adequate for small scenes (< 100 bodies); noticeably slower than rapier for larger counts
- **Bundle**: ~100 KB gzip, no WASM
- **API**: `Body` + `Shape` + `world.step()` — mature, well documented
- **Joints/constraints**: all the basics
- **Determinism**: inherently deterministic (pure JS, no WASM FP quirks)
- **Ecosystem**: wide adoption, many tutorials
- **Status**: maintenance mode — active bug fixes, rare new features. Stable enough for our scope.

### Zero-physics (manual integration)

- **Language**: none — hand-rolled in src/three/*.ts
- **Perf**: exactly what we need, no overhead
- **Bundle**: 0
- **Risks**: lots of subtle bugs to write ourselves. Sphere-rain impact response, rain-platter surface detection, keycap spring damping — each is a small physics problem we'd have to nail.
- **Precedent**: v3 already did this for sky rain (cube position integrated manually in sps-enemies.tsx). Worked fine.

## Recommendation

**Rapier (non-compat)** for these reasons:

1. **Perf headroom for mobile**: we target mobile WebGL; every saved ms in physics is frame budget for three.js + post-process. Rapier's WASM is dramatically faster than cannon-es at the scale we expect (hundreds of rain particles + sphere + keycaps + future levels with more bodies).
2. **Future-proofing**: as we add level types (tug-of-war, rhythm, sequence), physical interactions multiply. Rapier scales. cannon-es would bottleneck at ~100-200 dynamic bodies on mobile.
3. **Clean API**: no React wrapper needed. Rapier works beautifully with hand-rolled three.js — each frame, step the world, then copy rigid-body transforms into three mesh objects.
4. **Bundle cost is acceptable**: WASM lazy-loads (doesn't block first paint of the cabinet boot overlay). Total gzipped footprint under 600 KB, and the WASM file caches aggressively after first load.

**Rejected: cannon-es** — we could ship it in a weekend but we'd hit perf walls as the game grows. Swap cost later is higher than just picking rapier now.

**Rejected: zero-physics** — fine for the *current* scope but a false economy. We'd end up manually re-implementing contact resolution, continuous collision against the glass shell, and spring dampers on keycaps. That's three wheels to re-invent when rapier gives all of them with correct damping/contact ε/rest thresholds for free.

## Integration Plan

- Add `@dimforge/rapier3d` (non-compat variant)
- Lazy `await RAPIER.init()` inside `createCabinet()` — overlay covers the delay
- Mirror three meshes to rapier bodies: platter = `Fixed` kinematic cylinder; sphere = `Dynamic` ball with high angular damping; sky-rain = `Dynamic` boxes with CCD off (velocity-capped); keycaps = `Dynamic` boxes with prismatic joint along local-Y + motor spring back to rest height
- One `world.step(1/60)` per rAF frame after Koota updates
- Copy rigid-body transforms into three mesh `.position` / `.quaternion` at the end of the step
- Physics is **only active during `phase === 'playing'`** — paused / title / game-over freeze the world (`world.timestep = 0` or skip step)

## Defer

- Deterministic rapier variant — only if we ship replay-by-seed as a feature
- SIMD variant — only if we profile and see physics in the red
- Joint visualization / debug render — lazy-load via rapier's `world.debugRender()` in dev only

## Sources

- [Rapier homepage](https://rapier.rs/)
- [dimforge/rapier.js](https://github.com/dimforge/rapier.js)
- [Rapier vs Cannon performance thread](https://discourse.threejs.org/t/rapier-vs-cannon-performance/53475)
- [pmndrs/cannon-es](https://github.com/pmndrs/cannon-es)
