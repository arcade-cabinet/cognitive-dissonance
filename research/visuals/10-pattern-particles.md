# 10 — Pattern Particles

## What it IS today

The corruption tendrils that escape from the sphere center toward the
platter rim. Each pattern is a colored particle stream that the player
must intercept by holding the matching keycap.

**Source**: `src/components/pattern-stabilizer.tsx` (~150 LOC).

### Particle system setup

For each pattern (one per spawned corruption):

```ts
const ps = new ParticleSystem(`pattern${i}`, 80, scene);
ps.particleTexture = particleTex; // generated once, white circle on transparent
ps.minSize = 0.02;
ps.maxSize = 0.045;
ps.color1 = new Color4(color.r, color.g, color.b, 1);
ps.color2 = new Color4(color.r*0.5, color.g*0.5, color.b*0.5, 0.5);
ps.emitRate = 70;
ps.minLifeTime = 1.8;
ps.maxLifeTime = 3.2;
ps.createPointEmitter(/* small box */);
ps.start();
```

### Per-frame logic

The pattern's emitter position is updated every tick:
```ts
p.progress += p.speed * dt;
const radius = p.progress * 0.52; // 0 = center, 0.52 = at rim
p.particleSystem.emitter = new Vector3(
  cos(p.angle) * radius,
  0.4,
  sin(p.angle) * radius,
);
```

So the emitter physically moves outward, leaving a trail of particles
behind. When the player holds the matching keycap, `progress` reverses.
When `progress >= 1.0` the pattern "escapes" → tension rises 0.22.

### Color mapping

Each pattern's color comes from the keycap palette by `colorIndex` (0-11).
The player matches by visual color, not by symbol/letter.

## What it SHOULD be

Per design intent: corruption patterns are **the AI's escaping thoughts**.
They should:

- **Look organic, not synthetic**: smooth flowing particles, not sharp
  squares.
- **Communicate threat by speed and color**: faster patterns = more
  dangerous; matching color tells the player which key to press.
- **Be readable at any tension level**: the player must always be able to
  see them, even with the post-process corruption running.

Current implementation:
- ✓ Color-keyed to keycaps (clear visual mapping)
- ✓ Outward radial motion (clear "escaping" intent)
- ✓ Particle trail (the path is visible, not just the head)

Areas to improve:

1. **Connecting line / SDF tendril** — currently the particles are loose;
   a thin tube/line connecting them to the sphere center would emphasize
   "tendril escaping from the sphere" rather than "particles flying."
2. **Glow halo** — additive blending with a wider blur particle behind
   each tight one would give them a CRT-glow feel.
3. **Speed-coded color brightness** — fast patterns could be saturated,
   slow ones desaturated. Currently all patterns at the same colorIndex
   look identical.

## Three.js + WGSL port plan

Three has built-in particle systems via:
- `THREE.Points` + `THREE.PointsMaterial` — basic point sprites, fast.
- Custom `RawShaderMaterial` on `Points` for full control.
- `pmndrs/drei`'s `<Sparkles>` for declarative particles (R3F only).

For this case, `Points` with a custom shader gives us tendril-like
behavior:
- Vertex shader: animates positions outward along the angle vector.
- Fragment shader: soft-edged disc with color and alpha falloff.

Babylon's `ParticleSystem` is more abstracted but less customizable. The
Three port would let us implement the "connecting tendril" improvement
trivially via additional line geometry.

## Comparison axes

- **Visual fidelity**: Three's `Points` look essentially the same as
  Babylon's `ParticleSystem` for soft-particle billboards.
- **Code complexity**: Babylon's `ParticleSystem` is one-liner setup;
  Three's `Points` requires manually wiring buffers but is more flexible.
- **Bundle impact**: zero (both built-in).
- **Performance**: Three's GPU particles are typically tighter; for 80
  particles per pattern × 5 patterns = 400 particles, both stacks are
  trivial.
