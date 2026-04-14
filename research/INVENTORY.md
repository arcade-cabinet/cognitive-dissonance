# Visual Pieces Inventory

Master catalog of every distinct visual element in the game. Sourced from
exhaustive grep over `src/`, cross-referenced against `STANDARDS.md` and
`docs/DESIGN.md`.

## Custom-shader pieces (5)

These have hand-written GLSL fragment shaders. They define the game's
distinctive visual identity.

| # | Name | File | LOC | Visual role |
|---|------|------|-----|-------------|
| 1 | **Celestial nebula** | `src/lib/shaders/celestial.ts` | 86 | Inner sphere — swirling cosmic clouds, the AI's "consciousness" |
| 2 | **Crystalline cube** | `src/lib/shaders/crystalline-cube.ts` | 107 | Enemy material A — raymarched displaced box, color-shifts with tension |
| 3 | **Neon raymarcher** | `src/lib/shaders/neon-raymarcher.ts` | 122 | Enemy material B — multi-cube SDF union, holographic green/cyan |
| 4 | **Post-process corruption** | `src/components/post-process-corruption.tsx` | 74 | Full-screen — chromatic aberration + film noise + vignette + scanlines, intensity scales with tension |
| 5 | **ATC scanner** | `src/components/ui/atc-shader.tsx` | 170 | Background fullscreen — tanh raymarcher with rotating planes, runs on its own raw WebGL2 context |

## Material-driven pieces (7)

These use Babylon stock materials (PBR / Standard) but contribute to the
visual identity through composition, lighting, and animation. Each is a
candidate for shader replacement under the Three+WGSL plan.

| # | Name | File | Material | Visual role |
|---|------|------|----------|-------------|
| 6 | **Glass sphere** | `ai-sphere.tsx` | `PBRMaterial` (refraction, IOR 1.52, alpha 0.3) | Outer sphere — fragile glass containing the nebula |
| 7 | **Industrial platter** | `platter.tsx` | `PBRMaterial` (matte black, brushed steel) | Heavy base — deck the sphere sits on, etched with track + ATC text |
| 8 | **Coherence ring** | `diegetic-gui.tsx` | `StandardMaterial` (emissive, alpha) | Glowing arc on platter — the only "HUD", emissive color shifts with coherence |
| 9 | **Keycaps** | `platter.tsx` | `PBRMaterial` (per-color emissive) | Garage-door keycaps — slide up from platter rim with GSAP CustomEase |
| 10 | **Pattern particles** | `pattern-stabilizer.tsx` | `ParticleSystem` | Corruption tendrils — colored streams escaping sphere center toward rim |
| 11 | **SPS enemies** | `sps-enemies.tsx` | `SolidParticleSystem` + `StandardMaterial` | Enemy swarm — 120 particle boxes raining from the sky |
| 12 | **Shatter particles** | `ai-sphere.tsx` (gameover handler) | `ParticleSystem` | Game-over — 1600-particle white-orange explosion when sphere shatters |

## Out-of-scope (intentional)

- **2D HTML overlays** (loading screen, title, gameover, share button) —
  pure React + Tailwind, identical regardless of 3D engine.
- **Audio** (Tone.js graph) — entirely independent of rendering.
- **Physics** (Havok plugin) — used for keycap travel only; not a visual
  surface.

## Summary

- **5** authored shaders, **7** material-driven visuals = **12 isolated
  pieces** to spec, port, screenshot, and compare.
- The 5 authored shaders are the highest-risk migration candidates because
  the GLSL would need to translate to WGSL or Three's TSL.
- The 7 material-driven pieces are lower risk because Three.js + drei have
  direct equivalents (`MeshPhysicalMaterial`, `EffectComposer`, etc.) but
  may not match Babylon's PBR fidelity 1:1.
