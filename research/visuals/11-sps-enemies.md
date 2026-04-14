# 11 — SPS Enemies (Atmospheric Rain)

## What it IS today

Decorative atmospheric "rain" of glowing cyan boxes falling from the sky.
Pure visual density — does not interact with sphere or affect tension.
Intensity scales with current tension.

**Source**: `src/components/sps-enemies.tsx` (86 LOC).

### SPS setup

```ts
const SPS = new SolidParticleSystem('enemiesSPS', scene, { updatable: true });
const model = MeshBuilder.CreateBox('spsModel', { size: 0.35 }, scene);
SPS.addShape(model, 120);  // 120 box particles, all identical mesh
model.dispose();
const mesh = SPS.buildMesh();

const mat = new StandardMaterial('spsMat', scene);
mat.emissiveColor = new Color3(0.2, 0.8, 1.0); // cyan glow
mat.alpha = 0.7;
mesh.material = mat;
```

`SolidParticleSystem` is Babylon-specific: it batches N copies of a mesh
into a single draw call, with per-particle position/rotation/color
mutability.

### Per-particle update

```ts
SPS.updateParticle = (particle) => {
  if (!particle.alive) return particle;
  particle.position.y -= (2 + curTension * 4) * dt; // falls faster at high tension
  particle.rotation.x += 0.02;
  particle.rotation.y += 0.01;
  if (particle.position.y < 0.4) {
    particle.alive = false;
    particle.position.y = -100;
  }
  return particle;
};
```

### Spawn logic

In the `onBeforeRender` observer:
```ts
if (Math.random() < curTension * 0.3) {
  // wake up the next dead particle, place it at random x/z above the scene
}
```

So: at low tension nothing falls; at 30% tension a particle spawns ~10% of
frames; at 100% tension it spawns ~30% of frames (= ~18/sec at 60fps).

## What it SHOULD be

Per design intent: the SPS rain is **visual reinforcement of the AI's
distress**. As the system breaks down, more digital "debris" falls from
above. It should:

- **Be subtle at low tension** (almost absent — barely there)
- **Build to overwhelming at high tension** (lots of falling cubes)
- **Suggest digital decay**, not actual physical objects (boxes, cyan,
  emissive — clearly synthetic)
- **Never block visibility** of the sphere (alpha 0.7 lets the sphere
  show through)

Current implementation hits this. Notes:

1. The cubes are uniform — adding size variance (0.2 → 0.5 random) would
   make them feel more like data shards.
2. They fall straight down — adding slight x-axis drift (turbulence)
   would feel more chaotic at high tension.

Areas to improve:

1. **Trail glow** — each falling cube could leave a brief vertical
   afterimage line. Adds movement legibility.
2. **Color variance** — currently all cyan. Mixing in occasional red
   shards at high tension would communicate critical state.
3. **Impact on platter** — when a cube reaches y < 0.4 it disappears
   silently. A small flash + sparks at the impact point would close the
   loop and give the rain consequence.

## Three.js + WGSL port plan

Three's equivalent of `SolidParticleSystem` is `THREE.InstancedMesh`:

```ts
const geometry = new BoxGeometry(0.35, 0.35, 0.35);
const material = new MeshStandardMaterial({
  emissive: new Color(0.2, 0.8, 1.0),
  transparent: true,
  opacity: 0.7,
});
const instancedMesh = new InstancedMesh(geometry, material, 120);
```

Per-instance position/rotation via `instancedMesh.setMatrixAt(i, matrix)`.
Performance is comparable to Babylon SPS (single draw call, GPU-side).

For the emissive cyan look, `MeshStandardMaterial` with `emissive` and
`emissiveIntensity` matches the Babylon `StandardMaterial.emissiveColor`
behavior.

## Comparison axes

- **Visual fidelity**: identical (basic emissive cube material).
- **Code complexity**: SPS API is more particle-friendly (`alive`/`update`
  callbacks); `InstancedMesh` requires manual matrix bookkeeping. ~30 LOC
  more in Three port.
- **Bundle impact**: zero.
- **Performance**: identical (both are single instanced draw call).
