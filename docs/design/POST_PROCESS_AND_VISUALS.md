# Post-Process and Visuals - Cognitive Dissonance

**Post-Processing Pipeline**
- `DefaultRenderingPipeline` from `@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline`.
- All effects scale with tension via the `PostProcessCorruption` system.
- Device quality tiers cap intensity (low: bloom only, mid: +vignette, high: full pipeline).

**Effects**
- **Bloom**: weight = `tension * 0.8`. Soft glow at calm, intense at panic. Applied to sphere, coherence ring, keycap emissives.
- **Vignette**: weight = `tension * 0.6`. Subtle darkening at edges, intensifies with tension.
- **Chromatic Aberration**: aberration amount = `tension * 0.04`. Absent at calm, heavy RGB split at panic.

**Sphere Visual Degradation**
- GLSL celestial nebula shader in `Effect.ShadersStore` with tension-driven uniforms:
  - Color interpolation: calm blue (`#082f49` / `#7dd3fc`) → violent red (`#9f1239` / `#ef4444`).
  - Pulse rate increases with tension.
  - fbm noise intensity increases.
  - Fresnel glow shifts from blue to red.
- PBR glass properties degrade: roughness increases, alpha decreases, jitter ramps up.
- At tension 0.999: 64-shard fracture via `ShatterSequence` (SPS procedural geometry).

**Corruption Tendrils**
- SolidParticleSystem with 24 cylinder shapes.
- Spawn rate proportional to tension (threshold > 0.3).
- Per-tendril color matching target keycap.
- Retraction animation when matching keycap is held.

**Mechanical Degradation (WebGL2 Fallback)**
- `MechanicalDegradationSystem` for devices without full post-process:
  - PBR normal map crack intensity (0 → 0.8 with tension).
  - Sinusoidal rotation micro-jitter (200ms period, 0.0005 amplitude).
  - Lever resistance multiplier.
  - `triggerWorldImpact()` for boss slam camera shake.

**Diegetic GUI**
- Coherence ring: `MeshBuilder.CreateTorus` on platter surface.
- Emissive PBR material with blue (`#0088ff`) to red (`#ef4444`) interpolation.
- Ring completion maps to coherence level (0.0--1.0).
- The only "HUD" — and it is part of the machine.

**Platter RGB Pulsing**
- Keycap emissive colors driven by tension state and pattern assignment.
- Seed-derived palette for tendril and keycap color matching.
- Garage-door slit internal glow during open animation.

**DeviceQuality Adaptive Scaling**
- **High tier** (iPhone 12+ / Snapdragon 888+, 6+ GB RAM): 5000 particles, 12 morph targets, full post-process pipeline.
- **Mid tier** (4 GB RAM): 2500 particles, 8 morph targets, reduced bloom/vignette.
- **Low tier** (<4 GB): 800 particles, 4 morph targets, mechanical degradation only (no DefaultRenderingPipeline).
- Target: 45+ fps on mid-tier at <3s cold load.
- Applied to: SolidParticleSystem counts, shader defines, morph target count, post-process intensity.

**Key Files**
- `src/postprocess/PostProcessCorruption.ts` — DefaultRenderingPipeline controller
- `src/shaders/SphereNebulaMaterial.ts` — PBR glass + custom GLSL nebula
- `src/systems/CorruptionTendrilSystem.ts` — SPS 24 tendrils
- `src/ui/DiegeticCoherenceRing.ts` — Torus mesh emissive ring
- `src/fallback/MechanicalDegradationSystem.ts` — WebGL2 fallback visuals
- `src/shaders/registry.ts` — All GLSL shader registration
