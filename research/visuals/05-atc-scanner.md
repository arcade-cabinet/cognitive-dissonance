# 05 — ATC Scanner

## What it IS today

The background visual behind the entire game — a tanh raymarcher running
on a **separate raw WebGL2 context** (not Babylon, not Reactylon). Renders
to a fullscreen canvas behind everything else.

**Source**: `src/components/ui/atc-shader.tsx` (170 LOC).

### GLSL summary

The shader (compact, derived from a Shadertoy original):

```glsl
void main(){
  vec3 FC = vec3(gl_FragCoord.xy, 0);
  vec3 r  = vec3(u_res, max(u_res.x, u_res.y));
  float t = u_time;

  vec4 o = vec4(0);
  vec3 p = vec3(0), v = vec3(1, 2, 6);
  float i = 0, z = 1, d = 1, f = 1;

  for (; i++ < 50;
       o.rgb += (cos((p.x + z + v) * 0.1) + 1) / d / f / z) {
    p = z * normalize(FC * 2 - r.xyy);
    vec4 m = cos((p + sin(p)).y * 0.4 + vec4(0, 33, 11, 0));
    p.xz = mat2(m) * p.xz;
    p.x += t / 0.2;
    z += (d = length(cos(p / v) * v + v.zxx / 7) /
              (f = 2 + d / exp(p.y * 0.2)));
  }

  o = tanh(0.2 * o);
  fragColor = vec4(o.rgb, 1.0);
}
```

50-iteration accumulating raymarcher with rotating planes via a `cos`-built
mat2. The output is hyperbolic-tangent saturated for soft highlights. The
result is a pulsing, shimmering "data scape" — flowing tunnels of muted
color that suggest air-traffic-control radar scanning.

### Uniforms

| Uniform | Range | Purpose |
|---|---|---|
| `u_res` | viewport size in px | aspect correction |
| `u_time` | seconds | drives the entire animation |

No tension input — the ATC scanner runs at constant intensity. It's
**ambient atmosphere**, not a state indicator.

## What it SHOULD be

Per design intent: the ATC scanner is the **eternal background hum** of
the system. It should:

- Be present from the loading screen through gameover, never absent.
- Stay visually quiet enough that it never competes with the sphere/platter
  for attention.
- Suggest "machine activity" without being literal — abstract enough that
  the player stops parsing it as a thing.
- Have an organic-but-mechanical quality: not a spinning logo, not random
  noise, but flowing structure with discoverable pattern.

Current implementation nails this. The only consideration is that it
runs on its **own raw WebGL2 context** which means:

- Two GL contexts active simultaneously (background + Babylon).
- Two render loops via `requestAnimationFrame`.
- Compositing happens at the DOM level (z-index stacking).

This actually works fine on desktop but adds GPU cost on mobile (two
contexts = two state machines).

## Three.js + WGSL port plan

There are two viable approaches:

1. **Keep the raw WebGL2 approach as-is** — it's already engine-agnostic
   and works perfectly. Just fix the dual-context cost by moving to one
   shared context if needed.

2. **Promote into the main 3D scene** — render as a fullscreen quad in the
   background of the main render pass. Saves a context but couples it to
   the main scene's lifecycle.

For the comparison work: port the GLSL to WGSL and render as a fullscreen
quad in a Three.js scene. This proves the visual is reproducible and
gives us the option to consolidate later.

The `tanh` function is a WGSL builtin (different name in older GLSL —
this shader implements it manually). WGSL spelling: `tanh(v)`.

## Comparison axes

- **Visual fidelity**: identical (math is mechanical).
- **Code complexity**: 170 LOC current (most of it is WebGL2 setup
  boilerplate). A Three.js port using `RawShaderMaterial` would be ~60 LOC
  total.
- **Bundle impact**: current implementation is zero-dep. Three.js port
  adds the Three import (already paid for).
- **Performance**: 50 iterations, low math intensity per iteration. Both
  stacks compile to similar code. The dual-context cost goes away.
