# 07 — Industrial Platter

## What it IS today

The heavy black-metal deck the sphere sits on. Multi-mesh composition with
PBR materials, dynamic-texture-painted text on the rim, and a glowing
recess that holds the sphere.

**Source**: `src/components/platter.tsx` (largest game component, ~250 LOC).

### Mesh hierarchy

All children of `platterGroup` (a TransformNode at y=-1.6):

| Mesh | Geometry | Material | Purpose |
|---|---|---|---|
| `platterBase` | Cylinder (h=0.32, d=3.0, 64-seg) | PBR matte black metal (R=0.28, M=0.92) | The body |
| `rim` | Cylinder (h=0.2, d=3.2, 64-seg) | PBR darker metal + emissive cyan | Outer ring with etched text |
| `track` | Cylinder (h=0.25, d=0.78, 64-seg) | PBR darker, slightly rougher | Recessed circle holding the sphere |
| `playKeycap`, `continueKeycap` | Box | PBR per-color emissive | Action keycaps |
| `decorKey0..11` | Small boxes | PBR neutral | Decorative keycaps around the rim |
| `pauseKey` | Box | PBR | Single pause key |

### Notable rendering tricks

1. **Dynamic texture text** (line 77-87): paints "MAINTAIN COHERENCE · "
   repeated around the circumference into a 1024x128 canvas, used as the
   rim's emissive texture. Reads as scrolling LED text in the final render.
2. **Recessed point light** (line 41 ref): cyan PointLight in the recess
   makes the sphere area glow from below.
3. **Per-color keycap material** (each keycap gets its own PBR with the
   emissive set to the channel color from `KEYCAP_COLORS`).
4. **GSAP CustomEase** for keycap garage-door animation (separate spec
   below in piece 09).

## What it SHOULD be

Per `STANDARDS.md`: **matte black, industrial, deliberate**. The platter
should feel like a piece of professional broadcast equipment — heavy,
machined from a single billet, with no decoration that isn't functional.

Current implementation hits the brief:
- ✓ Matte black metal (right roughness/metallic balance)
- ✓ Etched text reads as functional labeling, not decoration
- ✓ Recessed track gives physical depth
- ✓ Keycaps are mechanical buttons, not skeuomorphic UI

Areas to improve:

1. **Surface detail** — pure smooth metal looks plastic. A subtle brushed
   normal map (radial brush pattern around the sphere center) would catch
   light authentically.
2. **Edge bevel highlights** — the cylinder edges are perfectly sharp.
   Adding a small bevel via geometry or normal map would give them
   light-catching character.
3. **Wear / scratches** — the platter is "used equipment" per design
   intent. Aging via a normal+roughness map overlay (low-frequency
   scratches around the sphere area where countless games have been
   played) would sell the diegesis.

## Three.js + WGSL port plan

`MeshStandardMaterial` (PBR) is the direct equivalent. Mapping:
| Babylon PBR | Three Standard |
|---|---|
| `albedoColor` | `color` |
| `roughness` | `roughness` |
| `metallic` | `metalness` |
| `emissiveColor` | `emissive` |
| `emissiveTexture` | `emissiveMap` |

For dynamic text texture: Three has `THREE.CanvasTexture` which accepts a
canvas element directly — same pattern as Babylon's `DynamicTexture`.

For the recessed PointLight: identical between engines.

For surface detail (improvements list above): generated normal maps via
TSL or pre-baked PNG. Three has good support for both.

## Comparison axes

- **Visual fidelity**: PBR fundamentals are identical (both implement
  Burley/GGX). Output should be pixel-equivalent at default settings.
- **Code complexity**: ~250 LOC current → ~250 LOC ported. The mesh
  hierarchy is the same; only the material constructor calls change.
- **Bundle impact**: zero — Three's std material is in the core bundle.
- **Performance**: identical.
