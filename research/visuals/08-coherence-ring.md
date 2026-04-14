# 08 — Coherence Ring

## What it IS today

The only "HUD" — a glowing arc on the platter showing current coherence
percentage. Diegetic, etched into the machine itself.

**Source**: `src/components/diegetic-gui.tsx` (~120 LOC).

### Mesh setup

Two meshes, both at y=-1.2 on the platter surface:

| Mesh | Geometry | Material | Purpose |
|---|---|---|---|
| `coherenceBgRing` | Torus (d=0.84, t=0.02, 64-seg) | StandardMaterial: emissiveColor (0.1, 0.15, 0.2), alpha 0.15 | Always-visible dim background ring |
| `coherenceFgArc` | Tube along partial circular path, radius 0.012, 64-seg | StandardMaterial: emissiveColor varies with coherence, alpha 0.3-0.8 | Filled portion |

### Per-frame logic

The arc mesh is **recreated** when coherence changes by ≥2 units (bucketed
to avoid disposal churn). The new tube is built along a partial circle
path:

```ts
const segments = Math.max(4, Math.floor(64 * coherence/100));
const path = [];
for (let i = 0; i <= segments; i++) {
  const angle = (i/segments) * (coherence/100) * 2π;
  path.push(new Vector3(cos(angle)*0.42, 0, sin(angle)*0.42));
}
const fgArc = MeshBuilder.CreateTube('coherenceFgArc', { path, radius: 0.012, ... });
```

### Color logic

Emissive shifts with coherence:
- Low coherence (<50%): red-orange
- Mid: yellow-green
- High: bright green-cyan
- Alpha ramps 0.3 → 0.8 with coherence (brighter when full)

## What it SHOULD be

Per design intent: this IS the HUD, and it should be the smallest possible
HUD that still communicates coherence. It must feel like a physical etched
display, not a UI overlay.

Current implementation:
- ✓ Etched into platter surface, not floating
- ✓ Emissive — glows like a CRT or LED display
- ✓ Color scale conveys state (red=danger, green=stable)
- ✓ Always present, never disappears or animates intrusively

Areas to improve:

1. **Tick marks** — currently a smooth arc. Tick marks at 25/50/75/100%
   would give it the look of a real measurement instrument.
2. **Sub-segment animation** — when coherence rises, the new portion
   should briefly flash bright then settle. Currently it just appears.
3. **Pulse on zero** — at coherence 0%, the arc disappears entirely. A
   slow pulsing red dot at the start position would communicate critical
   state better than absence.

## Three.js + WGSL port plan

The mesh-recreation pattern works in either engine — but for an arc that
changes every few frames, a **single full-circle mesh with a custom
fragment shader that masks based on UV** would be more efficient:

```glsl
void main() {
  float angle = atan(vUV.y - 0.5, vUV.x - 0.5);
  float t = (angle + π) / (2π); // 0..1 around the ring
  if (t > coherence/100) discard;
  // ...emissive color from coherence...
}
```

This avoids dispose/recreate per change. Three's `RawShaderMaterial` on a
torus gives us this directly. Babylon's `ShaderMaterial` could too — the
current implementation just chose the simpler "rebuild geometry" approach.

## Comparison axes

- **Visual fidelity**: identical for the ring shape. The shader-mask
  approach (Three port) would produce smoother edges (no segment count
  steps).
- **Code complexity**: 120 LOC current → ~80 LOC with shader mask.
- **Bundle impact**: zero.
- **Performance**: shader-mask is faster (no mesh churn). For a 60fps
  game with coherence changing many times per second, this is a real win.
