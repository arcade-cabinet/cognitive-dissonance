# 09 — Keycaps (Garage-Door Animation)

## What it IS today

A **dynamic input set** that emerges from the platter rim at level start,
with the actual input types driven by what the level requires. Today the
default level asks for 12 colored *pattern* keycaps + 2 action keycaps
(play / continue) + 1 pause key, but the design intent is that each level
declares its input schema:

- Pattern-matching level → N colored keycaps (N = pattern complexity)
- Push/pull level → a pair of push-me / pull-me handles
- Sequence level → numbered keys
- Mixed → any combination

All inputs share the same physical/mechanical treatment (emissive PBR box
on the rim, mechanical-eased emergence, visible physical travel on press).
The rim slits and emergence animation are the common substrate; what
emerges *through* the slits is level-specified.

**Source**: `src/components/platter.tsx` lines 100-220 (keycap section).

### Material

Each keycap is a small `BoxGeometry` with a per-color `PBRMaterial`:
```ts
const keycapMat = new PBRMaterial(`keycap${i}Mat`, scene);
keycapMat.albedoColor = new Color3(0.05, 0.05, 0.06);
keycapMat.metallic = 0.4;
keycapMat.roughness = 0.65;
keycapMat.emissiveColor = Color3.FromHexString(KEYCAP_COLORS[i]);
keycapMat.emissiveIntensity = 0.7;
```

`KEYCAP_COLORS` is an array of 12 distinct hex colors — these match the
pattern colors players need to stabilize.

### Animation

GSAP `CustomEase` curves give the mechanical feel (no generic eases
allowed per `STANDARDS.md`):

```ts
CustomEase.create('heavyMechanical', 'M0,0 C0.05,0 0.18,0.12 0.35,0.68 0.52,0.95 0.72,1 1,1');
CustomEase.create('mechSettle',     'M0,0 C0.12,0 0.25,0.62 0.42,0.82 0.58,1.08 0.75,0.96 1,1');
CustomEase.create('gearWobble',     'M0,0 C0.18,0.35 0.35,0.72 0.52,0.48 0.68,0.25 0.82,0.9 1,1');
```

Each keycap starts hidden below the platter (y position offset by ~1.6
units down) and animates up to the rim surface with a stagger delay
proportional to its index — they emerge sequentially around the ring.

When pressed (via pointer/keyboard), keycaps animate down 0.05 units and
back up, simulating physical key travel.

## What it SHOULD be

Per design intent: keycaps are **mechanical inputs on a piece of
hardware**, not virtual buttons. They should feel:

- **Physical**: you can see them move, hear them click, feel travel.
- **Discoverable**: emerging in a visible sequence at game start tells
  the player "these are the controls."
- **Color-keyed**: the only purpose of color is to match patterns —
  there's no pure decoration.
- **Tactile**: pressing them produces visible deformation + audio + haptic
  feedback (on mobile via Capacitor Haptics).

Current implementation hits all of this. Notes:

1. The 12 colors are seed-randomized by index in `KEYCAP_COLORS` — same
   seed produces same color order across runs. Good for replay
   determinism.
2. The garage-door emergence is one of the game's signature moments. It
   should NOT be skippable even with reducedMotion (it's < 1.5s total).

Areas to improve:

1. **Light source per keycap** — emissive only glows on the keycap surface.
   A small PointLight per keycap (especially the actively held ones) would
   cast colored light onto the platter, dramatically increasing the
   "physical" feel.
2. **Travel deformation** — currently keycaps press straight down. A
   slight rotation toward the touch point (0.05 rad max) would make
   off-center taps feel more responsive.
3. **Wear marks** — heavily-used keys (the action ones) could have darker
   tops over time. Pre-baked normal+roughness map.

## Three.js + WGSL port plan

Direct port. `BoxGeometry` + `MeshStandardMaterial` (Three) ≡ box mesh +
PBR (Babylon). GSAP works identically with Three's Vector3.

For per-keycap point lights: Three `PointLight` is identical, but with 12
point lights you'd need to cap maxLights or use `MeshBasicMaterial`
fallback (Three's default forward renderer caps at 4 dynamic lights for
performance). `WebGLRenderer.shadowMap` is more capable in Three than
Babylon for soft shadows.

## Comparison axes

- **Visual fidelity**: identical PBR.
- **Code complexity**: ~120 LOC for the keycap section, ports 1:1.
- **Bundle impact**: zero.
- **Performance**: Three's renderer is generally tighter for many small
  objects. 15 keycaps × box geometry = trivial in either.
