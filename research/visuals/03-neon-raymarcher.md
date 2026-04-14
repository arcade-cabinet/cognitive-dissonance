# 03 — Neon Raymarcher

## What it IS today

Enemy material variant B — a multi-cube SDF union with smooth blending,
holographic green/cyan iridescence, and depth fog.

**Source**: `src/lib/shaders/neon-raymarcher.ts` (122 LOC).

### GLSL summary

- **Vertex**: standard.
- **Fragment**:
  1. Maps `vUV` to centered space, ray origin `(0,0,2.3)`, ray direction
     `normalize(uv, -1)`.
  2. **`map(p)`**: loops up to 16 cubes (count from `u_amount`), each
     positioned by `u_positions[i]`, individually rotated by `u_time`,
     joined via `opSmoothUnion(d1, d2, 0.4)` for the metaball-style
     blending.
  3. 128-iteration sphere tracer with break on hit (`<0.0005`) or escape
     (`t>5.0`).
  4. On hit: 6-tap normal estimate, diffuse + Blinn-Phong specular,
     **holographic shading**: `getHolographic` produces green/cyan iridescent
     surface based on view-normal angle and time.
  5. Rim light `pow(1 - dot(n, viewDir), 3)` adds the bright outline.
  6. Distance fog `1 - exp(-t*0.2)` mixes toward black.
  7. Tension boost: `*= (1 + u_tension*0.5)`.

### Uniforms (driven from `enemy-spawner.tsx`)

| Uniform | Range | Purpose |
|---|---|---|
| `u_time` | seconds | rotation + iridescence animation |
| `u_amount` | 1-16 | how many cubes to render |
| `u_positions[16]` | vec3 array | per-cube center positions |
| `u_tension` | 0 → 1 | brightness boost |

The enemy spawner builds clusters of enemies and pumps the cluster
positions into the `u_positions` array.

## What it SHOULD be

The neon raymarcher is the **boss enemy** visual — it should feel
otherworldly and threatening, distinctly different from the regular
crystalline cubes. Per design intent:

- **Smooth metaball blending** — multiple components fuse into one organic
  mass. ✓
- **Holographic iridescence** — surface color shifts with viewing angle. ✓
- **Threat scale** — bosses are bigger and more visually overwhelming. ✓
- **Ghostly transparency** — bosses should feel like apparitions, not
  solid matter.

Areas to improve:

1. **Internal energy** — currently the holographic surface is uniform.
   Sampling a 3D noise volume inside the SDF and modulating brightness
   would give the boss an "energy core" feel.
2. **Procedural displacement** — the cubes are perfectly rectangular.
   Adding low-frequency noise displacement would make them feel less
   mechanical.
3. **Trail / motion blur** — bosses moving through space leave no trail.
   A history buffer or reactive motion blur post-process would sell the
   movement.

## Three.js + WGSL port plan

- Same as crystalline-cube: direct mechanical translation.
- The 16-position uniform array becomes a `THREE.Uniform<Vector3[]>` —
  Three.js handles uniform arrays natively.
- WGSL needs the array sized at compile time: `var<uniform> u_positions:
  array<vec3<f32>, 16>;`.
- The `for (i = 0; i < 16; i++) if (i >= u_amount) break;` pattern is
  WGSL-friendly.

## Comparison axes

- **Visual fidelity**: identical expected.
- **Code complexity**: 122 LOC GLSL → ~125 LOC WGSL (slight verbosity for
  array declarations).
- **Bundle impact**: zero.
- **Performance**: 128-step tracer is the hot path. Identical on both
  stacks.
