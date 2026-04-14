# 04 — Post-Process Corruption

## What it IS today

A full-screen post-process pass that applies chromatic aberration, film
noise, vignette, and scanlines on top of the scene render. Intensity scales
with the global tension value.

**Source**: `src/components/post-process-corruption.tsx` (74 LOC).

### GLSL summary

Single fragment shader applied via `BABYLON.PostProcess`:

```glsl
void main() {
  vec2 uv = vUV;
  float t = u_tension;

  // Chromatic aberration — split RGB by ±0.008 * t in X
  float r = texture2D(textureSampler, uv + vec2(0.008*t, 0)).r;
  float g = texture2D(textureSampler, uv).g;
  float b = texture2D(textureSampler, uv - vec2(0.008*t, 0)).b;
  vec3 color = vec3(r, g, b);

  // Film noise — hash-based, grain amplitude scales with tension
  float noise = fract(sin(dot(uv + u_time, vec2(12.9898,78.233))) * 43758.5453);
  color += (noise - 0.5) * t * 0.15;

  // Vignette — quadratic falloff from center
  float vignette = 1.0 - length((uv - 0.5) * 1.4) * t * 0.8;
  color *= vignette;

  // Scanlines — sin pattern at 800 cycles/screen, scrolls with time
  color -= sin(uv.y * 800.0 + u_time * 10.0) * t * 0.03;

  gl_FragColor = vec4(color, 1.0);
}
```

### Uniforms (driven from `useLevelStore.tension`)

| Uniform | Range | Purpose |
|---|---|---|
| `u_tension` | 0 → 1 | master intensity |
| `u_time` | seconds | scrolls noise + scanlines |

The component reads `useLevelStore.getState().tension` in `onApply` and
multiplies by 0.4 if `reducedMotion` is set.

## What it SHOULD be

Per design intent (`docs/DESIGN.md`): the post-process is the **direct
visual indicator of the AI's cognitive collapse**. As tension rises:

- **Calm**: nothing visible — tension is 0.12 by default, multipliers cap
  most effects below the perception threshold.
- **Mid-tension** (0.3-0.6): subtle RGB fringe, soft scanlines, dim vignette.
  The viewer notices "something is off" but can still play.
- **High tension** (0.7-0.9): aggressive aberration, visible film noise,
  dark vignette closing in. Reading the platter gets harder.
- **Crisis** (0.95+): everything maxed. The screen is hostile.

Current implementation hits all four states correctly. Areas to consider:

1. **Smear / ghosting** — chromatic aberration is purely lateral. Real CRT
   distortion has radial components (more aberration at screen edges).
2. **Bloom / overexposure flicker** — high-tension moments could pulse
   exposure briefly, like a CRT being hit by EMI.
3. **Geometric distortion** — barrel/pincushion warp at extreme tension
   would push past "video glitch" toward "physical sphere shaking the
   camera."

## Three.js + WGSL port plan

- Three has `EffectComposer` + custom `ShaderPass`. Direct port.
- For WGSL: this kind of fullscreen shader is exactly what TSL excels at;
  rewriting as nodes gives runtime composability (toggle individual effects
  on/off via UI) but adds dependency on TSL.
- For straight WGSL/GLSL: `pmndrs/postprocessing` library has
  `EffectComposer` with a more performant pipeline than EffectComposer in
  vanilla Three (single render target, batched effects).

The Babylon `PostProcess` API is roughly equivalent to Three's `ShaderPass`
— constructor takes a fragment string and uniform names.

## Comparison axes

- **Visual fidelity**: identical math, identical output.
- **Code complexity**: 74 LOC → 70-90 LOC depending on EffectComposer setup.
- **Bundle impact**: importing `postprocessing` adds ~30KB gz; rolling our
  own ShaderPass is ~3KB.
- **Composability**: `pmndrs/postprocessing` lets us toggle individual
  effects easily; our current monolithic shader requires source edits.
