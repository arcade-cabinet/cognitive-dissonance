# 06 — Glass Sphere

## What it IS today

The outer fragile glass shell containing the celestial nebula. PBR material
with refraction, low alpha, and per-frame degradation as tension rises.

**Source**: `src/components/ai-sphere.tsx` lines 57-126.

### Material setup

```ts
const glassMat = new PBRMaterial('glassMat', scn);
glassMat.albedoColor = new Color3(0.02, 0.04, 0.09); // deep navy tint
glassMat.roughness = 0.02;                            // mirror-like base
glassMat.metallic = 0.05;
glassMat.subSurface.isRefractionEnabled = true;
glassMat.subSurface.indexOfRefraction = 1.52;         // real glass IOR
glassMat.alpha = 0.3;                                 // 30% transparency
glassMat.transparencyMode = Material.MATERIAL_ALPHABLEND;
```

Plus, in the per-frame render loop:

```ts
glassMatRef.current.roughness = 0.02 + cur * 0.45;  // gets cloudy with tension
glassMatRef.current.alpha = 0.3 - cur * 0.15;        // gets darker
```

### Lifecycle

- **Emerge** (initial mount): scale 0.01 → 1.0 over 3.8s with `power4.out`
  ease, delayed 2.6s after scene load (matches the title sequence). Blue
  → white → off emissive pulse on emergence.
- **Tension-driven**: roughness clouds the glass; alpha darkens it.
- **Moment of clarity** (coherence == 100): blue emissive flash.
- **Shatter** (tension >= 0.99): scale animation + 1600-particle explosion
  (handled by piece #12 below).

## What it SHOULD be

The glass sphere is **the literal embodiment of the AI's mind**. Per
`docs/DESIGN.md`:

- **Fragile**: visibly thin, refractive, you can see right through it.
- **Containing**: the inner nebula must be visible AND distorted by the
  glass refraction. The current implementation achieves this.
- **Degradable**: as tension rises, it should look strained — micro-cracks
  appearing, surface fogging up, color shifting from cool clear → red-tinted.

Areas to improve:

1. **Cracks** — current implementation has no surface fractures even at
   95% tension. A normal-map detail texture that fades in with tension
   would sell the structural failure.
2. **Edge highlight** — fresnel rim lighting on the glass would catch
   light dramatically without needing additional point lights.
3. **Caustics on platter** — the glass should cast caustic light patterns
   on the surface below. Currently no shadow/caustic interaction.

## Three.js + WGSL port plan

Three.js has `MeshPhysicalMaterial` with native support for:

- `transmission` (corresponds to refraction, IOR via `ior` prop)
- `roughness`
- `metalness`
- `attenuationColor` + `attenuationDistance` (volumetric tinting)
- `clearcoat` (extra glossy layer — could replace the emissive pulse with
  a scaled clearcoat intensity)

Mapping:
| Babylon PBR | Three Physical |
|---|---|
| `albedoColor` | `color` |
| `roughness` | `roughness` |
| `metallic` | `metalness` |
| `subSurface.isRefractionEnabled` + `indexOfRefraction` | `transmission: 1.0` + `ior: 1.52` |
| `alpha` (with refraction) | `transmission` controls visibility behind |

Three's transmission requires a depth+color render buffer for proper
back-rendering — `pmndrs/drei`'s `<MeshTransmissionMaterial>` handles this
automatically. For pure Three (no React), you'd manually wire up the
back-render pass.

For the cracks/edge improvements (regardless of stack), TSL or a custom
fragment shader extension on `MeshPhysicalMaterial` would be needed.

## Comparison axes

- **Visual fidelity**: Three's `MeshPhysicalMaterial` with `transmission`
  produces glass that's typically more accurate than Babylon's
  `subSurface.isRefractionEnabled` (which is approximated). But Babylon's
  is faster.
- **Code complexity**: ~12 LOC either way for the material setup.
- **Bundle impact**: zero — both engines include physical materials.
- **Performance**: Three's transmission with proper buffers is more
  expensive (extra render pass per glass mesh). For a single glass sphere
  that cost is negligible.
