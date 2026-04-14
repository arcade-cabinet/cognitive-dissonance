# 12 — Shatter Particles (Game Over)

## What it IS today

The 1600-particle explosion that fires when the sphere shatters at 100%
tension. The defining "game over" moment.

**Source**: `src/components/ai-sphere.tsx` lines 274-318 (inside the
shatter handler).

### Particle setup

```ts
const particleTex = new DynamicTexture('shatterTex', 64, scene, false);
// paint white circle
texCtx.fillStyle = '#ffffff';
texCtx.beginPath();
texCtx.arc(32, 32, 28, 0, π*2);
texCtx.fill();
particleTex.update();

const shatterParticles = new ParticleSystem('shatter', 1600, scene);
shatterParticles.particleTexture = particleTex;
shatterParticles.emitter = sphereCenterPosition;
shatterParticles.minSize = 0.012;
shatterParticles.maxSize = 0.11;
shatterParticles.color1 = new Color4(0.9, 0.3, 0.3, 1);    // angry red
shatterParticles.color2 = new Color4(1.0, 0.6, 0.4, 1);    // warm orange
shatterParticles.emitRate = 1200;
shatterParticles.minLifeTime = 0.6;
shatterParticles.maxLifeTime = 3.2;
shatterParticles.direction1 = new Vector3(-8, 4, -8);
shatterParticles.direction2 = new Vector3(8, 12, 8);
shatterParticles.gravity = new Vector3(0, -15, 0);
shatterParticles.createPointEmitter(/* tight */);
shatterParticles.start();
shatterParticles.targetStopDuration = 2.8;
```

### Lifecycle

- Triggered exactly once per game when tension >= 0.99.
- Burst lasts ~2.8 seconds (`targetStopDuration`), individual particles
  live up to 3.2s after that.
- Total cleanup at ~6s post-trigger via `setTimeout`.

## What it SHOULD be

Per design intent: this is the **most dramatic moment in the game**. It
must:

- Feel **catastrophic** — large explosion, lots of debris, can't be
  ignored.
- Feel **glass-shattering** — radial outward motion, falling under
  gravity, spinning shards.
- Be **angry** — red and orange palette, not the calm blues of normal
  play. The AI's death is violent.
- Be **brief** — 2-3 seconds total. Cuts to "COGNITION SHATTERED" overlay
  before the player has time to study individual particles.

Current implementation hits this. Notes:

1. Particles are circular discs (not jagged shards). Real glass would
   produce angular pieces. But circles read as soft motion blur, which
   suits the dreamlike aesthetic.
2. 1600 particles × Babylon ParticleSystem = expensive on mobile. The
   actual measured cost was acceptable but it's the most expensive single
   moment in the game.

Areas to improve:

1. **Real shard geometry** — replace point particles with small triangular
   meshes via instancing, each rotating individually. More expensive but
   reads as actual broken glass.
2. **Color flash on trigger** — first frame should be a pure white
   bright-fullscreen flash (40ms) before the particles. Sells the impact.
3. **Camera shake** — sphere shatter without camera reaction feels
   weightless. Add a brief 0.3s shake via gsap on the camera target.
4. **Audio sync** — the audio currently has a shatter SFX, but the
   particles often lead the audio by 50-100ms. Tighter sync needed.

## Three.js + WGSL port plan

Three has `THREE.Points` for point-particle systems and
`THREE.InstancedMesh` for geometric shards.

For point particles equivalent to Babylon's `ParticleSystem`:

```ts
const geometry = new BufferGeometry();
geometry.setAttribute('position', new BufferAttribute(positions, 3));
geometry.setAttribute('color', new BufferAttribute(colors, 3));
const material = new PointsMaterial({
  size: 0.05,
  vertexColors: true,
  transparent: true,
  blending: AdditiveBlending,
  map: circleTexture,
});
const points = new Points(geometry, material);
```

Per-frame: update position attributes (apply velocity + gravity), set
needsUpdate. ~80 LOC.

For the "real shard geometry" improvement, `InstancedMesh` of a flat
triangle (BufferGeometry with 3 vertices) gives you 1600 spinning shards
in a single draw call.

## Comparison axes

- **Visual fidelity**: identical for point particles. Shard variant
  requires custom work in either stack.
- **Code complexity**: ~50 LOC current; ~80 LOC in Three (more manual
  buffer management).
- **Bundle impact**: zero.
- **Performance**: Three's `Points` is slightly faster per-frame than
  Babylon's `ParticleSystem` because there's less abstraction — but the
  difference for 1600 particles is sub-millisecond.
