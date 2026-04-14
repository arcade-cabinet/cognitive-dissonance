# 02 — Crystalline Cube

## What it IS today

Enemy material variant A — a raymarched displaced cube with rainbow palette
shading and tension-driven brightness boost.

**Source**: `src/lib/shaders/crystalline-cube.ts` (107 LOC).

### GLSL summary

- **Vertex**: standard mvp + UV passthrough.
- **Fragment**:
  1. Maps `vUV` to centered `[-1, 1]²`, builds ray origin `(0,0,-3)` and
     ray direction `normalize(uv, 1)`.
  2. **`getDist(p)`**: rotates `p` around `(1,1,1)` by `u_time*0.2`,
     computes distance to a unit cube `length(max(abs(p)-1, 0))` minus a
     sinusoidal displacement `sin(u_complexity*p.x)*sin(p.y)*sin(p.z)*0.1`.
     The displacement gives the "crystal facet" look.
  3. 64-iteration sphere tracer: `dO += getDist(ro + rd*dO)` until hit
     (`<0.001`) or escape (`>100`).
  4. On hit: 6-tap normal estimate, diffuse + specular Phong, base color
     from a cosine palette `palette(length(p)*0.2 + u_time*u_colorShift)`.
  5. Tension boost: `col *= (1.0 + u_tension*0.8)`.
  6. Atmospheric tint: adds `palette(length(uv)*0.5 - u_time*u_colorShift*0.2) * 0.2`
     to give a non-zero background even on misses.

### Uniforms (driven from `enemy-spawner.tsx`)

| Uniform | Range | Purpose |
|---|---|---|
| `u_time` | seconds | rotation + palette animation |
| `u_complexity` | 5 → 10 | displacement frequency, finer facets |
| `u_colorShift` | 0 → 0.8 | palette hue rotation speed |
| `u_lightIntensity` | 1.5 fixed | shading multiplier |
| `u_tension` | 0 → 1 | overall brightness boost |

Each enemy mesh gets its own material instance with these uniforms updated
per frame in the spawner's tick callback.

## What it SHOULD be

The crystalline cube is the **regular enemy** visual — it should feel
hostile-but-orderly, like a corrupted thought that retains some structure.
Per design intent:

- **Sharp angular silhouette** — cubes, not spheres. ✓
- **Iridescent surface** — palette-cycle hue, not a flat color. ✓
- **Tension-responsive** — gets brighter / more aggressive as the player
  loses ground. ✓
- **Holographic feel** — slight transparency or scan-line treatment would
  reinforce that these are "synthetic" enemies, not natural objects.

Areas to improve (independent of stack):

1. **Edge-glow on rim** — currently no edge-detection. A fresnel rim or
   sobel-on-normals pass would make the cubes pop from the dark scene.
2. **Static sub-pattern** — Perlin or Worley noise modulating the
   displacement amplitude would break up the regular sin-grid pattern that
   currently looks too perfect.
3. **Per-instance jitter** — every enemy uses the same displacement
   pattern. A `u_seed` uniform fed from the spawn order would give each
   one a slightly different facet arrangement.

## Three.js + WGSL port plan

- Direct GLSL → WGSL translation. Mechanical: `mat3 rotate(axis, angle)`
  becomes a small TSL function or inline WGSL.
- Raymarcher loop is fine in WGSL — explicit `for` loops with `break`
  conditions are supported.
- Cosine palette function (`palette(t) = a + b*cos(2π*(c*t+d))`) is from
  Inigo Quilez and ports trivially.

## Comparison axes

- **Visual fidelity**: identical output expected. The math is fully
  geometric.
- **Code complexity**: 107 LOC GLSL → ~107 LOC WGSL.
- **Bundle impact**: same string size.
- **Performance**: 64 raymarch steps per fragment is the bottleneck; both
  stacks compile to similar GPU code. Expect identical FPS.
