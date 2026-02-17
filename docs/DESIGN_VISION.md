# Design Vision — Photorealistic Procedural Generation

## Goal

Every visual element in Cognitive Dissonance must be **photorealistic, fully procedural, and fully immersive**. No placeholders, no "low-poly charm," no flat-shaded primitives standing in for real objects. The player should feel like they are sitting directly behind someone whose head is about to explode.

All geometry is procedurally generated via Three.js — no external 3D model files, no image textures. Realism comes from **complex curves, detailed geometry, PBR materials, and sophisticated lighting** — not from imported assets.

## Composition — The Rear Bust View

The camera is positioned **behind and slightly above** the character, looking over their shoulder. The player sees:

```text
┌─────────────────────────────────────┐
│                                     │
│         (enemies descend            │
│          toward the head)           │
│                                     │
│        ┌───────────────┐            │
│        │  Back of Head │            │
│        │  (brown hair) │            │
│        └───────┬───────┘            │
│          ┌─────┴─────┐             │
│          │ Shoulders  │             │
│          │ (t-shirt)  │             │
│          └─────┬─────┘             │
│    ┌───┬───┬───┬───┐               │
│    │F1 │F2 │F3 │F4 │  keyboard    │
│    └───┴───┴───┴───┘               │
└─────────────────────────────────────┘
```

This composition is **far superior** to a full-body diorama view because:

1. **Fewer surfaces to get right** — back of head, hair, shoulders, t-shirt fabric, keyboard. No face, no hands, no legs, no room furniture.
2. **Every surface is achievable** — hair, fabric, and skin are well-solved procedural problems (noise-based shaders, PBR materials). This is the sweet spot for photorealistic procedural generation.
3. **Player identification** — looking over the character's shoulder puts you IN the scene, not observing a diorama.
4. **Tension is physical** — shoulder bunching, neck stiffening, head trembling are subtle, visceral, and unmistakable. No cartoon face expressions needed.

## Narrative Context

This is a **missile-command-style defense game**. Rogue AI hallucinations manifest as cognitive distortions (enemies) that rain down toward the player's head. If not countered, the hallucinations cause mounting **physical tension and cognitive overload**, ultimately causing the character's head to explode in a spectacular effects-driven finale.

The escalation is **continuous and physical**, communicated entirely through body language visible from behind:

- **0-25% panic (Calm)**: Relaxed posture. Shoulders low and loose. Hair settled. Slow, steady breathing visible as subtle shoulder rise/fall.
- **25-50% panic (Uneasy)**: Shoulders begin to rise. Neck muscles tighten (visible tendons on neck sides). Breathing quickens. Micro-fidgets — slight head tilts, shoulder rolls.
- **50-75% panic (Panicked)**: Shoulders hunched high and locked. Neck rigid. Head trembling — fine vibration that intensifies. Visible sweat on neck/shoulders. T-shirt fabric bunches at the shoulders from the tension. Breathing becomes rapid, shallow (fast shoulder movement).
- **75-99% panic (Meltdown)**: Shoulders up to ears, completely locked. Violent head trembling. Veins visible on neck (displacement mapping). Skin flushing red on neck. Steam/heat distortion rising from head. Hair stands on end. Crackling energy effects around skull. Head subtly swelling (vertex displacement).
- **100% panic (Game Over)**: **Head explodes.** Spectacular effects-driven explosion — particle burst, shockwave ring, screen flash, debris. Driven by anime.js for cinematic timing. NOT a transformation into anything — pure destruction. The shoulders slump forward, headless, as particles rain down.

## Quality Bar

Every 3D element must meet ALL of these criteria:

1. **Complex geometry** — Organic shapes use subdivision, smooth curves, bevels, and anatomical proportions. No raw sphere-for-head, box-for-shoulder primitives.
2. **PBR materials** — Every surface has appropriate roughness, metalness, normal perturbation (procedural or computed), and clearcoat where applicable. Skin looks like skin. Fabric looks like fabric. Metal looks like metal.
3. **Material variety** — Hair, skin (neck), t-shirt fabric, keyboard aluminum — each uses distinct material properties, not just different colors on the same material.
4. **Subsurface effects** — Skin on the neck uses subsurface scattering or sheen approximation (MeshPhysicalMaterial). Keycap legends use translucent backlighting.
5. **Specular highlights and reflections** — Keyboard plate shows brushed aluminum reflections. Keycaps have subtle glossy highlights.
6. **Procedural textures** — Hair strands/layers via noise, fabric weave via procedural pattern, skin pores via fine noise, keyboard brushed metal via anisotropic noise. No flat hex colors.
7. **Ambient occlusion** — Contact shadows between keyboard keys, under the chin, where hair meets scalp, where shirt meets shoulders.
8. **Physically correct lighting** — Monitor glow from in front illuminates the keyboard and catches the edges of the shoulders. Rim light from behind defines the head silhouette. Color temperature shifts with panic.

## Element-by-Element Requirements

### Character Bust (Back of Head + Shoulders)

**Current state**: NS-5 android rear bust with procedural head, shoulders, and keyboard row — placeholder primitives with discrete normal/panic/overload state swaps.

**Target state — Rear bust view with continuous tension escalation**:

The character is a **single parameterized mesh group** viewed from behind. No face geometry needed. The panic level (0-100) continuously drives deformation, material, and effects.

**Head (back view)**:
- **Shape**: Anatomically proportioned skull from behind — occipital curve, temporal ridges, slight ear suggestion at the sides. NOT a sphere. Use parametric geometry or subdivision surface with proper cranial proportions.
- **Hair**: Brown, volumetric. Multiple layered shells or cards with procedural color variation (Perlin noise for subtle highlight/lowlight streaks). At rest: neatly settled, natural fall direction. Strands respond to panic — progressively disheveled, rising, standing on end at high panic. Hair material: anisotropic highlights (like real hair catching light).
- **Neck**: Visible between head and t-shirt collar. Skin material with subsurface scattering approximation. At low panic: smooth, relaxed. At high panic: tendons emerge (normal map displacement), veins pulse (animated displacement), skin flushes red (material color lerp), sweat beads appear (small glossy instances).
- **Ears**: Suggested geometry at the sides — just enough to break the silhouette. Not detailed inner ear.

**Shoulders + T-shirt**:
- **Shape**: Broad shoulders tapering to upper arms (cut off just below the deltoid). Realistic shoulder anatomy — trapezius slope from neck, deltoid curve, scapula suggestion in the back.
- **T-shirt fabric**: Procedural weave texture (fine noise-based normal map). Material: cotton-like roughness (~0.85), no metalness. Subtle wrinkles at rest via procedural displacement. Color: a muted solid (dark blue, charcoal, or similar).
- **Tension animation**: The primary tension indicator. Shoulders continuously lerp upward with panic. At 0%: dropped, relaxed, natural slope. At 50%: noticeably risen, trapezius engaged. At 75%+: hunched up toward ears, fabric bunching at the neck/shoulder junction (increased displacement amplitude). The rise should be smooth and continuous, not stepped.
- **Breathing**: Subtle rhythmic rise/fall of shoulders. Frequency increases with panic (calm: ~12 breaths/min, meltdown: ~30 breaths/min). Amplitude decreases at high panic (shallow, tight breathing).

**Tension escalation details (continuous, driven by panic 0-100)**:
- **0-25%**: Relaxed posture. Occasional subtle head tilt or shoulder roll (idle animation).
- **25-50%**: Shoulders rise ~15% of max travel. Neck muscles begin to show (subtle normal map intensity increase). Micro-jitter begins on head (very low amplitude, barely perceptible).
- **50-75%**: Shoulders at ~50% rise. Head trembles visibly (increasing amplitude sine wave displacement). Sweat beads appear on neck (instanced glossy spheres, count scales with panic). T-shirt wrinkles deepen at shoulder bunch points. Breathing rapid.
- **75-99%**: Shoulders at ~90% rise, locked against ears. Violent head shake. Neck veins prominent. Skin flushed red. Steam/heat distortion VFX rising from head (animated noise shader on transparent planes). Hair fully on end. Crackling energy arcs around skull (animated line geometry with emissive glow). Head geometry subtly inflates (vertex scale, +5-10%).
- **100%**: Head explosion sequence (see Game Over section).

### Game Over — Head Explosion

**Current state**: Head explosion effect with aura rings.

**Target state — Cinematic head explosion driven by anime.js**:

This is NOT a transformation into another character. It is a **pure destruction effect** — the tension was too much, the head couldn't take it.

**Sequence** (total ~2.5 seconds):
1. **Flash** (0-100ms): Screen flashes white. Head emissive material spikes to full brightness.
2. **Burst** (100-400ms): Head geometry shatters into particle debris (instanced mesh fragments with velocity). Central shockwave ring expands outward (torus with emissive material, scaling up rapidly with fading opacity). Particle colors: warm orange/red/yellow energy + darker debris chunks.
3. **Shockwave** (200-600ms): Expanding distortion ring (screen-space or geometry-based). Camera shake at maximum intensity.
4. **Rain** (400-2000ms): Debris particles arc downward with gravity. Energy sparks linger and fade. Embers float.
5. **Settle** (1500-2500ms): Shoulders slump forward. Smoke/steam wisps rise from the neck stump (subtle, not gory — stylized energy dissipation, not anatomical). Screen dims. Game over UI fades in.

**Implementation**: anime.js timeline orchestrates the timing. Three.js handles the 3D particle burst, shockwave geometry, and camera shake. The effect should feel **powerful and cathartic** — a release of all the built-up tension.

### Mechanical Keyboard (F1-F4 Row)

**Current state**: Flat box keycaps on a flat box plate. No sculpted profile, no visible switches, no light bleed.

**Target state — A single photorealistic mechanical keyboard row**:

This is the player's primary input device and occupies the **bottom third** of the bust composition. It must feel deeply satisfying to interact with.

**Geometry**:
- **Keycaps**: Sculpted Cherry/OEM profile with concave top dish, rounded edges, and slight draft angle on sides. Each keycap is a proper 3D shape, not a box. Legend text (F1, F2, F3, F4) is inset/recessed into the keycap surface, not a billboard floating above.
- **Switches**: Cherry MX-style switch housing visible through the gap between keycap and plate. Cross-stem visible on keycap underside.
- **Plate**: Brushed aluminum with anisotropic highlights. Screw holes or mounting detail visible.
- **Case**: Surrounding keyboard case with rounded corners, chamfered edges. Material: dark anodized aluminum with subtle texture.

**Depress animation**:
- Authentic mechanical key travel: ~4mm with proper spring-back curve (not linear lerp).
- Two-stage feel: initial resistance, tactile bump, bottoming out, spring return.
- Keycap tilts very slightly on off-center presses (micro-rotation).
- Adjacent keycaps show micro-vibration on a hard press (sympathetic movement).

**Sound design**:
- **Keydown**: Satisfying tactile "thock" — the deep, resonant sound of a quality mechanical switch. Not a thin click. Synthesized via Web Audio with attack transient + resonant body + dampened release.
- **Key return**: Softer upstroke sound as spring returns keycap to rest.
- **Bottoming out**: Subtle impact sound with per-key pitch variation for realism.
- Sound characteristics shift with panic: calm = crisp clean thocks; high panic = slightly more aggressive/reverberant.

**Haptics** (mobile/gamepad):
- Keydown: Short, sharp haptic pulse (10ms). Matches the mechanical switch feel.

**RGB backlighting**:
- Per-key RGB LED visible through translucent keycap legends and through gaps around each keycap.
- **Light bleed**: Soft glow spills from under each keycap onto the plate surface.
- **Color escalation with panic**:
  - Low panic (0-25%): Cool breathing cyan/blue — slow sinusoidal pulse, calming
  - Medium panic (25-50%): Shifts to amber/warm white — faster pulse rate
  - High panic (50-75%): Orange to red transition — rapid pulsing, occasional flicker
  - Critical panic (75-100%): Angry red with stroboscopic flashing, desynchronized per-key chaos
- **Cooldown visualization**: Key LED dims to near-off, fills back to full brightness as cooldown expires.
- **Ready flash**: Key flashes bright white once when ability comes off cooldown.

### Enemies (Cognitive Distortions)

**Current state**: Colored spheres with emoji text overlaid.

**Target state**:
- **Bubble**: Glass-like material with refraction, internal color glow (emissive core with transparent shell). Iridescent surface (thin-film interference via MeshPhysicalMaterial iridescence). Subtle surface distortion animation.
- **Interior**: Visible swirling thought pattern inside (animated procedural noise texture).
- **Icon**: 3D extruded icon geometry, not flat emoji text. Floats inside the bubble.
- **Glow**: Volumetric glow approximation (multiple transparent shells with falloff).
- **Descent path**: Enemies float down from above toward the character's head. The composition naturally frames this as a threat raining down on you.

### Boss

**Current state**: Red sphere with emoji.

**Target state**:
- **Core**: Crystalline or mechanical-organic form — faceted geometry with emissive veins/cracks. Pulsing internal energy visible through semi-transparent shell.
- **Orbs**: Glass orbs with internal color swirl, not solid colored spheres.
- **Presence**: Distortion field around boss (vertex displacement on nearby geometry). Heat-haze effect.
- **HP visualization**: 3D segmented health ring, not text overlay.

### Particles and Effects

**Current state**: Solid color spheres and flat planes.

**Target state**:
- **Counter burst**: Sparks with trail (instanced mesh with velocity-stretched geometry). Ember glow with proper falloff.
- **Trail rings**: Energy rings with procedural lightning/plasma texture.
- **Confetti**: Thin rectangular planes with metallic foil material (angle-dependent color shift).
- **Head explosion debris**: See Game Over section. Mix of energy particles (emissive, bright, fading) and solid debris fragments (dark, tumbling, gravity-affected).

### Lighting

**Current state**: 7 lights with dynamic color — this is the strongest element.

**Target composition-specific lighting**:
- **Monitor glow** (from in front of the character): RectAreaLight casting cool blue-white light onto the keyboard, catching the underside of the chin and front of the shoulders. This is the primary fill light. Color shifts warmer with panic.
- **Rim light** (from behind/above): Defines the silhouette of the head, hair edges, and shoulder contour against the darker background. Cool blue tone.
- **Keyboard RGB**: Per-key emissive glow provides localized colored light on the plate surface and subtly illuminates the character's shirt from below.
- **Ambient**: Very low, dark blue-purple. Just enough to prevent pure black shadows.
- **Shadow maps**: On the rim light for hair/shoulder shadows on the keyboard area.
- **Bloom post-processing**: For keyboard LEDs, enemy glow, boss energy, and the head explosion sequence.
- **Ambient occlusion** (SSAO or baked): Under chin, between keys, hair-scalp junction.

### Background

Behind the character bust, the background should be **dark and atmospheric**, not a detailed room:

- **Monitor glow**: A soft, diffuse glow suggesting a screen in front of the character. Not a modeled monitor — just the light it casts. Color shifts with panic.
- **Ambient darkness**: Deep dark blue-purple (#0a0a18 to #1a1a2e). The focus is entirely on the bust and keyboard.
- **Optional depth cues**: Subtle particles floating in the air (dust in monitor light). Faint window light from one side. These are atmospheric, not detailed geometry.

## Implementation Strategy

**Hybrid approach: Spline for photorealistic base + Three.js for dynamic effects.**

### Spline (Character Bust Base)

The character bust (back of head, shoulders, t-shirt) uses a **Spline 3D scene** (`@splinetool/react-spline`) for photorealistic quality that pure procedural Three.js can't match. The Spline scene is:
- Lazy-loaded (only when `SPLINE_BUST_URL` is configured in `SplineCharacter.tsx`)
- Rendered in a separate canvas layer BEHIND the main R3F canvas
- Static geometry with Spline's high-quality materials and lighting
- Create in spline.design: model a rear bust, publish, set the URL

When no Spline scene is configured, the procedural Three.js bust (`CharacterBust.tsx`) is used as a fallback — functional but less photorealistic.

### Three.js / R3F (Dynamic Effects + Game Elements)

All dynamic and game-logic-driven elements use Three.js:

- `MeshPhysicalMaterial` for PBR with clearcoat, sheen, iridescence, transmission
- `ShaderMaterial` / `onBeforeCompile` for custom procedural textures (noise-based normals, displacement, anisotropic hair highlights)
- `BufferGeometry` with computed vertices for organic shapes (skull, shoulders)
- `InstancedMesh` for particle systems, sweat beads, hair strands
- `RectAreaLight` for monitor glow (area lighting)
- `EffectComposer` (from postprocessing or three/examples) for bloom, SSAO
- `PMREMGenerator` for environment map approximation
- `DataTexture` for procedurally generated normal/roughness maps
- **anime.js** for the game-over head explosion timeline (keyframe orchestration, screen effects)

### Layered Canvas Architecture

```text
Layer 0 (bottom): Dark background
Layer 1:          Spline canvas (photorealistic bust model)
Layer 2 (top):    R3F canvas (transparent bg) — keyboard, enemies, effects, particles
```

The R3F canvas uses `alpha: true` when a Spline scene is active, allowing the Spline bust to show through. All game interactions happen in the R3F layer.

## Performance Budget

- Target: 60 FPS on mid-range GPU (GTX 1060 / M1 MacBook Air)
- Max draw calls: 150 (tighter budget — fewer objects in the bust composition)
- Max triangles: 300K (head + shoulders + keyboard + enemies)
- Use `InstancedMesh` for repeated geometry (particles, hair shells, sweat beads)
- Hair LOD: reduce shell count at lower settings

## Non-Goals

- External 3D model files (`.glb`, `.gltf`, `.obj`) — everything is procedural code
- External image textures (`.png`, `.jpg`) — all textures are procedural
- Stylized/cartoon aesthetic — the target is photorealism within procedural constraints
- Full character body — only head (back) and shoulders are visible
- Face rendering — the character faces away from the camera
- Character morph on game over — game over is a head explosion effect, pure destruction
- Detailed room geometry — background is atmospheric lighting, not a modeled room
