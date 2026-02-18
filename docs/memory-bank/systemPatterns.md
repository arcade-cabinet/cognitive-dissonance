# System Patterns — Cognitive Dissonance

## Architecture

```
Next.js 16 App Router (Turbopack)
├── src/app/page.tsx: dynamic import of GameBoard with ssr: false
├── GameBoard (2D React + Tailwind):
│   ├── ATCShader background (WebGL2, CSP-safe)
│   ├── Title overlay ("COGNITIVE DISSONANCE")
│   └── Game-over overlay ("COGNITION SHATTERED")
├── GameScene (Reactylon Engine/Scene):
│   ├── Declarative: hemisphericLight, pointLight, arcRotateCamera
│   ├── AISphere: imperative glass PBR sphere + celestial ShaderMaterial
│   ├── Platter: imperative cylinders + boxes + GSAP garage-door
│   ├── PatternStabilizer: imperative particle systems for escaping tendrils
│   ├── EnemySpawner: Yuka AI + imperative billboard planes with SDF ShaderMaterials
│   ├── PostProcessCorruption: imperative custom PostProcess
│   ├── SPSEnemies: imperative SolidParticleSystem
│   ├── DiegeticGUI: imperative torus ring mesh
│   ├── SpatialAudio: Tone.js positioning (placeholder)
│   └── AudioEngine: Tone.js adaptive score bridge
└── State Layer (Zustand):
    ├── seed-store: buried seed (seedrandom)
    ├── level-store: tension, coherence, level
    ├── audio-store: Tone.js bridge
    ├── game-store: phase (title/playing/paused/gameover)
    └── input-store: keycap input state
```

## Key Patterns

1. **Imperative Mesh Creation**: All Babylon.js meshes/materials created in `useEffect`, NOT as JSX. Only lights and camera use Reactylon JSX.
2. **Render Loop**: `scene.registerBeforeRender(fn)` / `scene.unregisterBeforeRender(fn)` — NOT `onBeforeRenderObservable`.
3. **CSP-Safe Shader Store**: All GLSL in `BABYLON.Effect.ShadersStore` as static string constants.
4. **GSAP + Babylon.js**: `gsap.to(mesh.position, {...})` works natively with Vector3 number properties.
5. **SSR Bypass**: All 3D code in `'use client'` files loaded via `dynamic({ ssr: false })`.
6. **Zustand Bridge**: Render loop reads `useLevelStore.getState().tension`. React subscribes normally.
7. **Reactylon JSX (lowercase)**: `<hemisphericLight>`, `<arcRotateCamera>`, `<pointLight>` for declarative scene elements. Registered by babel-plugin-reactylon.
8. **Turbopack + Babel coexistence**: `babel.config.js` has only `@babel/preset-typescript` + `babel-plugin-reactylon`. Turbopack uses Babel for user code, SWC for Next.js internals.
9. **Engine Config**: `forceWebGL={true}`, `engineOptions` for antialias/adaptToDeviceRatio/audioEngine:false.
