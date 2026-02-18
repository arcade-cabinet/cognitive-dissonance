# System Patterns — Cognitive Dissonance

## Architecture

```text
Next.js 16 App Router (Turbopack)
├── src/app/page.tsx: dynamic import of GameBoard with ssr: false
├── GameBoard (2D React + Tailwind):
│   ├── ATCShader background (WebGL2, CSP-safe)
│   ├── Title overlay ("COGNITIVE DISSONANCE")
│   ├── Clarity overlay ("COHERENCE MAINTAINED")
│   ├── Game-over overlay ("COGNITION SHATTERED")
│   └── Zustand store bridge (window.__zustand_*)
├── GameScene (Reactylon Engine/Scene):
│   ├── Declarative: hemisphericLight, pointLight, arcRotateCamera
│   ├── AISphere: glass PBR sphere + celestial ShaderMaterial + moment of clarity + restart ritual
│   ├── Platter: cylinders + boxes + GSAP garage-door + dust particles + recess glow + colored keycaps
│   ├── PatternStabilizer: particle systems for escaping tendrils + per-color matching
│   ├── EnemySpawner: Yuka AI + SDF shader enemies + split behavior
│   ├── PostProcessCorruption: chromatic aberration + noise + vignette
│   ├── SPSEnemies: SolidParticleSystem visuals
│   ├── DiegeticGUI: two-layer coherence arc (background ring + foreground tube)
│   ├── SpatialAudio: 3 Tone.js procedural synths (whoosh, chime, shatter)
│   ├── AudioEngine: Tone.js adaptive score bridge
│   └── XRSession: WebXR stub with hand tracking
└── State Layer (Zustand):
    ├── seed-store: buried seed (seedrandom)
    ├── level-store: tension, coherence, level
    ├── audio-store: Tone.js bridge
    ├── game-store: phase (title/playing/paused/gameover)
    └── input-store: keycap hold state (Set<number>)
```

## Key Patterns

1. **Imperative Mesh Creation**: All Babylon.js meshes/materials created in `useEffect`, NOT as JSX. Only lights and camera use Reactylon JSX.

2. **Render Loop**: `scene.onBeforeRenderObservable.add(fn)` / `scene.onBeforeRenderObservable.remove(observer)`.

3. **CSP-Safe Shader Store**: All GLSL in `BABYLON.Effect.ShadersStore` as static string constants.

4. **GSAP + Babylon.js**: `gsap.to(mesh.position, {...})` works natively with Vector3 number properties. CustomEase for mechanical feel.

5. **SSR Bypass**: All 3D code in `'use client'` files loaded via `dynamic({ ssr: false })`.

6. **Zustand Bridge**: Render loop reads `useLevelStore.getState().tension`. React subscribes normally. Stores exposed on window for E2E.

7. **Reactylon JSX (lowercase)**: `<hemisphericLight>`, `<arcRotateCamera>`, `<pointLight>` for declarative scene elements.

8. **Turbopack + Babel coexistence**: `babel.config.js` has only `@babel/preset-typescript` + `babel-plugin-reactylon`.

9. **Engine Config**: `forceWebGL={true}`, `engineOptions` for antialias/adaptToDeviceRatio/audioEngine:false.

10. **Per-Color Keycap Matching**: `src/lib/keycap-colors.ts` provides 12 evenly-spaced HSL colors. Both platter (material emissive) and pattern-stabilizer (particle color + colorIndex) import from the same source of truth.

11. **Spatial Audio Events**: Pattern-stabilizer dispatches `patternEscaped` / `patternStabilized` CustomEvents. AISphere dispatches `sphereShattered`. SpatialAudio component listens and triggers Tone.js synths.

12. **Moment of Clarity**: At coherence 100, GSAP smoothly eases jitter to zero, pulses blue emissive on glass, shifts celestial shader to calm blue. After 3s, coherence drops -75, tension +0.05. No win state — just a fleeting respite.

13. **Enemy Split**: Split-behavior enemies spawn 2 half-size seeker children on contact with sphere instead of adding tension directly. Children add tension when they reach the sphere.

14. **Diegetic Coherence Arc**: `CreateTube` with a partial circular path (not `CreateTorus` — it lacks `arc` param). Throttled recreation at 2% coherence buckets.

15. **Restart Ritual**: AISphere subscribes to game-store. On phase transition to `playing` after shatter, recreates both spheres with GSAP scale-in + emissive pulse.
