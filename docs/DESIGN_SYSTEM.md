# Design System — Cognitive Dissonance v2

## Brand Identity

- **Cold Industrial**: Heavy black metal, machined surfaces, cool blue RGB
- **Haunting**: Glass fragility, celestial degradation, inevitable shatter
- **Mechanical**: GSAP garage-door animations, gear resistance, dust particles
- **Diegetic**: No HUD — all feedback through the machine itself

## Color Palette

### Calm State (tension 0.0 - 0.3)
- Sphere: `#082f49` → `#7dd3fc` (dark blue → light blue)
- Platter RGB: Cool blue (`#0088ff`) with soft pulse
- Background: Near-black (`#0a0a0e`)

### Uneasy State (tension 0.3 - 0.6)
- Sphere: Blues transition to yellows/greens
- Platter RGB: Drift toward amber
- Post-process: Light chromatic aberration begins

### Panic State (tension 0.6 - 0.9)
- Sphere: Violent reds dominate (`#9f1239` → `#ef4444`)
- Platter RGB: Blood red pulse
- Post-process: Heavy distortion, noise, vignette

### Shatter (tension 1.0)
- Sphere: Explodes in particle burst
- Screen: Static fills, "COGNITION SHATTERED" fades in
- Audio: Massive reverb tail into silence

## Typography

- **System monospace**: `'Courier New', Courier, monospace`
- No external font dependencies (CSP-safe)
- Title text: 92px, tracking 12px
- Game over text: Same style, red/white inverted

## Materials

### Glass (PBR)
- `albedoColor`: `#020409`
- `roughness`: 0.02 + tension * 0.45
- `metallic`: 0.05
- `IOR`: 1.52
- `alpha`: 0.3 - tension * 0.15

### Industrial Metal (PBR)
- `albedoColor`: `#080810`
- `metallic`: 0.92
- `roughness`: 0.28

### Keycap (PBR)
- `albedoColor`: `#0a0a0c`
- `metallic`: 0.8
- `roughness`: 0.3
- `emissiveColor`: RGB driven by tension

## Animations

All mechanical animations use GSAP with custom easing:
- `heavyMechanical`: Slow start, strong acceleration
- `mechSettle`: Overshoot + gentle settle
- `gearWobble`: Subtle rotation during slide
