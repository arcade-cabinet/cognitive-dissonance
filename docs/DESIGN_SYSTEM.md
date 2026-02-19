# Design System — Cognitive Dissonance v3.0

## Brand Identity

- **Cold Industrial**: Heavy near-black metal, machined surfaces, cool blue emissives
- **Haunting**: Glass fragility, celestial degradation, inevitable shatter
- **Mechanical**: GSAP garage-door animations, gear resistance, dust particles, lever inertia
- **Diegetic**: No HUD — all feedback through the machine itself, in-world 3D surfaces
- **Cross-Platform**: Identical visual language on web (WebGPU/WebGL2), Android (Vulkan), iOS (Metal)

## Color System

All color values are tension-driven. Tension is a float from 0.0 to 0.999.

### Calm State (tension 0.0 -- 0.3)

- Sphere nebula: `#082f49` to `#7dd3fc` (dark blue to light blue)
- Coherence ring: Cool blue emissive (`#0088ff`) with soft pulse
- Background: Near-black (`#0a0a0e`)
- Corruption tendrils: Faint, slow-moving, matching keycap colors

### Uneasy State (tension 0.3 -- 0.6)

- Sphere nebula: Blues transition to yellows/greens
- Coherence ring: Drift toward amber
- Post-processing: Light chromatic aberration begins, subtle bloom increase
- Enemy morphs: More aggressive trait expression

### Panic State (tension 0.6 -- 0.9)

- Sphere nebula: Violent reds dominate (`#9f1239` to `#ef4444`)
- Coherence ring: Blood-red pulse
- Post-processing: Heavy chromatic aberration, noise, vignette, bloom intensity peaks
- Corruption tendrils: Dense, fast, multiple simultaneous

### Shatter (tension >= 0.999)

- Sphere: 64-shard fracture via procedural geometry
- Enemy fade: All enemies dissolve
- Platter: Rotation stops
- Text: "COGNITION SHATTERED" fades in on a diegetic plane
- Audio: Massive reverb tail into silence

## Materials

### Glass Sphere (PBR)

- `albedoColor`: `#020409`
- `roughness`: `0.02 + tension * 0.45`
- `metallic`: `0.05`
- `IOR`: `1.52`
- `alpha`: `0.3 - tension * 0.15`
- Custom nebula shader layered via `Effect.ShadersStore`

### Industrial Platter (PBR)

- `albedoColor`: `#080810`
- `metallic`: `0.92`
- `roughness`: `0.28`
- Near-black metal with machined surface appearance

### Keycap (PBR)

- `albedoColor`: `#0a0a0c`
- `metallic`: `0.8`
- `roughness`: `0.3`
- `emissiveColor`: RGB driven by tension state and pattern assignment

### Coherence Ring (Emissive PBR)

- Torus mesh on platter surface
- `emissiveColor`: Interpolated blue (`#0088ff`) to red (`#ef4444`) by tension
- `emissiveIntensity`: Scales with coherence level

### AR Occlusion Material

- Environment-depth based occlusion on supported devices
- Stencil fallback for devices without depth API
- Ensures virtual objects are properly occluded by real-world surfaces

## Shaders

All shaders follow a GLSL-first strategy for maximum platform compatibility:
- Web (WebGPU): GLSL auto-converted to WGSL by Babylon.js WASM transpiler
- Web (WebGL2): GLSL used directly
- Native (Babylon Native / bgfx): GLSL compiled to Metal MSL / Vulkan SPIR-V

All shaders stored as static string literals in `Effect.ShadersStore` (CSP-safe, no eval).

### Celestial Nebula

- fbm noise + fresnel glow
- Tension-driven color interpolation (blue to red)
- Pulse rate increases with tension
- Applied to glass sphere interior

### Corruption Tendrils

- SPS (Solid Particle System) with 24 tendrils
- Per-tendril color matching target keycap
- Spawn rate proportional to tension
- Retraction animation when keycap is held

### AR Occlusion

- Environment-depth sampling on WebXR-capable devices
- Stencil buffer fallback for unsupported devices
- Ensures platter and sphere appear grounded in real space

### Crystalline Cube Boss

- IQ palette + sine displacement
- 5-phase visual progression matching boss timeline
- World distortion effects during boss encounter

### Neon Raymarcher

- SDF (Signed Distance Field) boxes for standard enemies
- Holographic green/neon aesthetic
- Billboard quad rendering for performance
- Morph target influence on SDF parameters

## Typography

- **Diegetic only**: All text rendered on `DynamicTexture` applied to in-world mesh surfaces
- **System monospace**: `'Courier New', Courier, monospace` — no external font dependencies (CSP-safe)
- **Title text**: "COGNITIVE DISSONANCE" engraved/projected on platter surface
- **Game over text**: "COGNITION SHATTERED" on a fading diegetic plane
- Zero HTML text overlays during gameplay

## Post-Processing

All post-processing effects scale with tension via the `PostProcessCorruption` system:

- **Bloom**: Soft glow at calm, intense at panic. Applied to sphere, coherence ring, keycap emissives
- **Vignette**: Subtle darkening at edges, intensifies with tension
- **Chromatic Aberration**: Absent at calm, heavy RGB split at panic
- Intensity parameters driven by tension float

### Device Quality Tiers

Post-processing is scaled by detected device capability:

| Tier | Particles | Morph Targets | Post-Process |
|------|-----------|---------------|--------------|
| Low  | 800       | 4             | Bloom only   |
| Mid  | 2500      | 8             | Bloom + vignette |
| High | 5000      | 12            | Full pipeline |

## Audio

All audio through **Tone.js** exclusively (Babylon audio engine disabled). Native platforms use `expo-audio` bridge.

### Procedural SFX

- Keycap emerge: Metallic slide + gear grind (synthesized)
- Tendril retraction: Tonal sweep downward
- Enemy spawn: Distorted ping with spatial positioning
- Sphere shatter: Layered glass break + massive reverb tail
- Boss phases: Progressive distortion layers

### Spatial Positioning

- All SFX positioned in 3D space relative to their source mesh
- Panner node tracks mesh world position per frame
- AR mode: Spatial audio matches real-world anchor position

### Tension-Driven Music

- Calm: Low drone, slow LFO modulation
- Uneasy: Percussive layers emerge, swing increases
- Panic: Frantic glitch percussion, pitch-shifted drones
- Seed-derived parameters: BPM, swing amount, root note

### Reverb

- Convolver reverb with tension-driven decay time
- Calm: Long cathedral reverb (warm)
- Panic: Short metallic reverb (harsh)

## Haptics

Cross-platform haptic feedback synced to tension and game events:

- **Native (iOS/Android)**: `expo-haptics` — impact, notification, and selection feedback
- **Web**: `navigator.vibrate()` — pattern-based vibration
- **Audio haptics (all platforms)**: Tone.js brown noise rumble at low frequencies for sub-bass "feel"

### Haptic Events

- Keycap press: Light impact
- Tendril retraction: Medium impact
- Pattern failure: Heavy notification
- Enemy spawn: Selection feedback
- Sphere shatter: Long heavy vibration pattern
- All intensities scale with tension

## Animations

All mechanical animations use **GSAP 3.13+** with CustomEase, MotionPath, and all plugins (Webflow-sponsored, now free):

- `heavyMechanical`: Slow start, strong acceleration — keycap emergence
- `mechSettle`: Overshoot + gentle settle — lever release
- `gearWobble`: Subtle rotation during slide — keycap lateral motion
- Boss timelines: 5-phase GSAP timeline for crystalline cube encounter
- Platter rotation: Continuous timeline with tension-driven speed

GSAP operates directly on Babylon.js `Vector3` properties (`mesh.position`, `mesh.rotation`, `mesh.scaling`).
