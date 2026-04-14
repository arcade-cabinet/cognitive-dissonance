# 01 — Celestial Nebula

## What it IS today

The interior surface of the inner sphere — a procedural cosmic-cloud shader
with parameter-driven coloring and density.

**Source**: `src/lib/shaders/celestial.ts` (86 LOC).

### GLSL summary

- **Vertex**: passes UV through, transforms position with `worldViewProjection`.
- **Fragment**:
  1. Maps `vUV` to a 2D disk and reconstructs a hemisphere position
     (`pos = vec3(uv, sqrt(1.0 - dot(uv,uv)))`); discards anything outside
     the unit disk.
  2. 6-octave fractal-Brownian-motion noise sampled in 3D at `pos *
     u_cloud_density + u_time * 0.1`.
  3. Mix between `u_color1` (deep blue `#082f49`) and `u_color2` (sky cyan
     `#7dd3fc`) via `smoothstep(0.4, 0.6, fbm)` — gives the cloud bands.
  4. Fresnel rim glow `pow(1 - max(dot(normal, viewZ), 0), 2) * u_glow_intensity`
     adds the bright limb.
  5. Output `nebula + fresnel*color2`.

### Uniforms (driven from `ai-sphere.tsx`)

| Uniform | Range | Purpose |
|---|---|---|
| `u_time` | seconds | animates the noise field |
| `u_color1`, `u_color2` | RGB | shift from calm blue → angry red as tension rises |
| `u_cloud_density` | 2.5 → 6.0 | denser swirls at high tension |
| `u_glow_intensity` | 1.5 → 4.0 | brighter rim at high tension |

The `ai-sphere.tsx` render loop lerps these uniforms based on
`useLevelStore.getState().tension`.

## What it SHOULD be

Per `STANDARDS.md` and `docs/DESIGN.md`:

- **Calm state** (low tension): deep cosmic blues, slow swirling, soft fresnel
  glow. The AI is whole.
- **Crisis state** (high tension): saturated reds + violet, faster turbulent
  motion, harsh bright fresnel that almost flares. The AI is breaking.

The current shader achieves the calm→crisis arc but the noise is somewhat
generic. Areas for improvement (regardless of stack):

1. **Anisotropic streaks** — real nebulae have directional gas filaments.
   Adding domain warping or curl noise would give the clouds character
   beyond plain fbm.
2. **Specular twinkle** — embedded "stars" inside the nebula would sell the
   cosmic depth. Currently the shader is purely volumetric.
3. **Inner-glow modulation** — the fresnel is constant per-pixel; modulating
   it by the underlying noise value would make the rim "breathe" with the
   cloud structure.

## Three.js + WGSL port plan

- Use `THREE.RawShaderMaterial` (or TSL `MeshNodeMaterial` for WGSL).
- Vertex: standard model-view-projection passthrough — same math, different
  attribute names (`position`, `uv` → `THREE` builtin attributes).
- Fragment: GLSL is portable to WGSL with mechanical translation; or
  rewrite as TSL nodes for engine-agnostic representation.
- Uniforms: `THREE.Uniform<number>` / `Uniform<Color>`. Setting them from
  outside the render loop is identical.
- The `discard` for off-disk pixels is a key correctness check — must be
  preserved. WGSL spelling is `discard;` (same).

## Comparison axes

- **Visual fidelity**: noise should look identical (math is mechanical).
  Fresnel should look identical (geometry-based). The only meaningful delta
  could come from gamma / tonemapping pipeline differences.
- **Code complexity**: 86 LOC GLSL → ~86 LOC WGSL OR ~120 LOC TSL nodes.
- **Bundle impact**: zero — fragment shader source is the same string size.
- **Tooling**: Three.js + WGSL gives us TSL preview / debugging in
  Three's editor; Babylon has Inspector.
