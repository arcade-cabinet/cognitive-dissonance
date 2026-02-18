# Architecture — Cognitive Dissonance v2

> For the full system patterns, see `docs/memory-bank/systemPatterns.md`.
> For the tech stack details, see `docs/memory-bank/techContext.md`.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript 5**
- **Babylon.js 8.51** + **Reactylon 3.5.4** (declarative 3D)
- **GSAP 3.12** (CustomEase, MotionPath, Flip, timeline)
- **Tone.js 14.8** (adaptive spatial audio)
- **Zustand 5** (state) + **Miniplex 2** (ECS)
- **Yuka.js 0.7** (enemy AI) + **seedrandom 3.0** (buried seed)
- **Tailwind CSS 4** (2D overlays)

## System Architecture

```
Next.js 15 App Router
├── app/page.tsx ── dynamic(() => import('GameBoard'), { ssr: false })
│
├── GameBoard (2D React)
│   ├── ATCShader ── WebGL2 background (pure canvas, no Babylon)
│   ├── Title Overlay ── "COGNITIVE DISSONANCE"
│   └── Game Over Overlay ── "COGNITION SHATTERED"
│
├── GameScene (Reactylon Engine/Scene)
│   ├── AISphere ── glass PBR sphere + celestial ShaderMaterial
│   ├── Platter ── industrial base + GSAP garage-door keycaps
│   ├── PatternStabilizer ── hold-to-stabilize corruption tendrils
│   ├── EnemySpawner ── Yuka AI + SDF shader billboard enemies
│   ├── PostProcessCorruption ── chromatic aberration + noise + vignette
│   ├── SPSEnemies ── SolidParticleSystem dense visuals
│   ├── DiegeticGUI ── coherence ring torus
│   ├── SpatialAudio ── Tone.js 3D positioning (placeholder)
│   └── AudioEngine ── Zustand bridge for Tone.js
│
└── State Layer (Zustand)
    ├── seed-store ── buried seed (seedrandom)
    ├── level-store ── tension, coherence, level
    └── audio-store ── Tone.js init + tension sync
```

## Key Patterns

1. **Imperative Mesh Creation**: All Babylon.js objects in `useEffect`, not JSX
2. **Observable Render Loop**: `scene.onBeforeRenderObservable.add()`
3. **CSP-Safe Shaders**: Static GLSL in `BABYLON.Effect.ShadersStore`
4. **GSAP + Babylon.js**: `gsap.to(mesh.position, {...})` works natively
5. **SSR Bypass**: `'use client'` + `dynamic({ ssr: false })`
6. **Zustand Bridge**: Render loop reads `getState()`, React subscribes

## File Structure

See `docs/memory-bank/techContext.md` for the complete file tree.
