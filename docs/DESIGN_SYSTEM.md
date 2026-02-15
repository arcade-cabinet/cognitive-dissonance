# Design System Documentation

## Overview

Psyduck Panic uses a comprehensive design system built on design tokens to ensure visual consistency, maintainability, and scalability across all platforms.

## Brand Identity

### Personality
- **Retro Gaming Aesthetic**: Inspired by 8-bit and 16-bit era games
- **Playful**: Humorous take on AI hype and tech culture
- **Satirical**: Commentary on tech industry trends
- **Accessible**: Easy to understand, hard to master

### Core Values
1. **Consistency**: Unified visual language across all screens
2. **Responsiveness**: Adapts to any device seamlessly
3. **Performance**: 60 FPS gameplay on all platforms
4. **Clarity**: Clear visual hierarchy and feedback

## Design Tokens

Design tokens are centralized in `src/design/tokens.ts` and applied via CSS variables.

### Color Palette

#### Primary Colors
```css
--color-primary-main: #f1c40f    /* Golden yellow (Psyduck) */
--color-primary-light: #f9e79f   /* Light yellow */
--color-primary-dark: #d4ac0d    /* Dark yellow */
```

**Usage**: Primary actions, accents, Psyduck character, highlights

#### Secondary Colors
```css
--color-secondary-main: #9b59b6   /* Purple (AI/tech theme) */
--color-secondary-light: #d7bde2  /* Light purple */
--color-secondary-dark: #8e44ad   /* Dark purple */
```

**Usage**: Secondary actions, logic enemies, tech elements

#### Accent Colors
```css
--color-accent-reality: #e67e22   /* Orange (hype) */
--color-accent-history: #2ecc71   /* Green (growth charts) */
--color-accent-logic: #9b59b6     /* Purple (demos) */
```

**Usage**: Enemy type identification, ability buttons

#### Semantic Colors
```css
--color-semantic-success: #2ecc71
--color-semantic-warning: #f39c12
--color-semantic-error: #e74c3c
--color-semantic-info: #3498db
```

**Usage**: Status indicators, feedback messages

#### UI Colors
```css
--color-bg-primary: #0a0a18       /* Deep dark blue */
--color-bg-secondary: #1a1a2e     /* Slightly lighter */
--color-bg-overlay: rgba(5, 5, 15, 0.97)

--color-text-primary: #ffffff
--color-text-secondary: #ecf0f1
--color-text-muted: #7f8c8d

--color-border-default: #1a1a3a
--color-border-accent: rgba(241, 196, 15, 0.3)
```

### Typography

#### Font Families
```css
--font-primary: 'Press Start 2P', monospace
--font-emoji: Arial
```

**Press Start 2P** provides the retro gaming aesthetic and is used for all text elements.

#### Font Sizes
```css
--font-size-tiny: 5px     /* Micro text */
--font-size-xs: 7px       /* Very small labels */
--font-size-sm: 8px       /* Small UI text */
--font-size-base: 9px     /* Body text */
--font-size-md: 10px      /* Medium headers */
--font-size-lg: 13px      /* Large headers */
--font-size-xl: 22px      /* Display text */
--font-size-3xl: 28px     /* Hero text */
--font-size-4xl: 48px     /* Titles */
```

#### Text Shadows
```css
--shadow-text-sm: 1px 1px 0 rgba(0, 0, 0, 0.5)
--shadow-text-base: 2px 2px 0 #000
--shadow-text-lg: 4px 4px 0 #c0392b
--shadow-glow-yellow: 0 0 10px rgba(241, 196, 15, 0.5)
```

### Spacing

Based on 4px unit system:

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
```

**Usage Guide**:
- Padding/margin between elements: `--space-2` to `--space-4`
- Section gaps: `--space-6` to `--space-8`
- Large separations: `--space-10`

### Animations

#### Durations
```css
--duration-fast: 150ms      /* Quick transitions */
--duration-normal: 200ms    /* Standard transitions */
--duration-medium: 300ms    /* Noticeable transitions */
--duration-slow: 400ms      /* Deliberate transitions */
```

#### Easings
```css
--easing-in: cubic-bezier(0.4, 0, 1, 1)
--easing-out: cubic-bezier(0, 0, 0.2, 1)
--easing-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

### Shadows & Effects

#### Box Shadows
```css
--shadow-box-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-box-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
--shadow-inset: inset 0 2px 4px rgba(0, 0, 0, 0.8)
--shadow-vignette: inset 0 0 120px rgba(0, 0, 0, 0.7)
```

#### Glows
```css
--shadow-glow-yellow: 0 0 10px rgba(241, 196, 15, 0.5)
--shadow-glow-cyan: 0 0 15px rgba(0, 255, 255, 0.5)
--shadow-glow-red: 0 0 30px rgba(231, 76, 60, 0.3)
```

### Borders

```css
--radius-sm: 2px
--radius-base: 3px
--radius-md: 4px
--radius-lg: 6px

--border-width-thin: 1px
--border-width-base: 2px
--border-width-thick: 3px
```

## Component Patterns

### Buttons

#### Primary Button (Action)
```css
background: var(--color-primary-main);
color: var(--color-bg-primary);
padding: var(--space-3) var(--space-6);
border: var(--border-width-base) solid var(--color-primary-dark);
border-radius: var(--radius-base);
text-shadow: var(--shadow-text-base);
```

**States**:
- Hover: Brightness +10%
- Active: Scale 0.95
- Disabled: Opacity 0.5

#### Ability Button
```css
width: 60px;
height: 60px;
border-radius: var(--radius-md);
border: var(--border-width-thick) solid currentColor;
background: var(--color-bg-secondary);
box-shadow: var(--shadow-inset);
```

**States**:
- Available: Full opacity, glow effect
- Cooldown: Reduced opacity, cooldown bar overlay
- Disabled: Grayscale filter

### Cards

#### Enemy Card
```css
background: transparent;
border: var(--border-width-base) solid transparent;
padding: var(--space-4);
border-radius: var(--radius-lg);
```

**States**:
- Normal: Standard appearance
- Hover: Glow effect
- Targeted: Border highlight

### HUD Elements

#### Panic Bar
```css
background: var(--color-bg-secondary);
border: var(--border-width-base) solid var(--color-border-default);
height: 20px;
```

**Fill Colors** (based on level):
- 0-33%: Green (#2ecc71)
- 34-66%: Yellow (#f1c40f)
- 67-100%: Red (#e74c3c)

#### Score Display
```css
font-size: var(--font-size-xl);
color: var(--color-primary-main);
text-shadow: var(--shadow-text-base);
```

## Responsive Breakpoints

```typescript
mobile: '480px'
tablet: '768px'
desktop: '1024px'
wide: '1280px'
```

### Device-Specific Adjustments

#### Phones (< 600px)
- Font sizes: 90% of base
- Button sizes: Minimum 44px touch target
- Reduced padding: `--space-2` instead of `--space-4`

#### Tablets (600px - 900px)
- Font sizes: 100% of base
- Standard spacing
- Larger touch targets: 48px minimum

#### Desktop (> 900px)
- Font sizes: 110% of base
- Generous spacing
- Hover states enabled

## Animation Patterns

### Page Transitions
```css
transition: opacity var(--duration-medium) var(--easing-out);
```

### Button Interactions
```css
transition: transform var(--duration-fast) var(--easing-out);
```

### Modal Overlays
```css
animation: fadeIn var(--duration-medium) var(--easing-out);
```

### Character Transformations
Gradual interpolation between states over 500ms with elastic easing.

## Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 minimum)
- Interactive elements: 3:1 minimum

### Touch Targets
- Mobile: 44x44px minimum (iOS guideline)
- Tablet: 48x48px minimum (Material Design)

### Focus States
All interactive elements have visible focus indicators:
```css
outline: 2px solid var(--color-primary-main);
outline-offset: 2px;
```

### Screen Reader Support
- Semantic HTML elements
- ARIA labels on canvas and interactive elements
- Skip links for navigation

## Icon System

Using emoji for icons to maintain retro aesthetic and ensure cross-platform consistency:

- 🦠 Reality (virus, hype)
- 📈 History (growth charts)
- 🤖 Logic (AI/robots)
- ⏳ Time Warp power-up
- 🛡️ Clarity (shield) power-up
- ⭐ 2X Score power-up
- 🚂 Boss: Hype Train
- 🧠 Boss: The Singularity

## Visual Effects

### Particles
- Hit effects: Small burst (5-10 particles)
- Explosions: Large burst (20-30 particles)
- Trail effects: Continuous spawn

### Screen Effects
- **Shake**: Intensity based on event severity
- **Flash**: Quick white overlay (100ms)
- **Glow**: Radial gradient pulses

### CRT Effect
- Scanlines: 2px repeating pattern
- Vignette: Inset shadow
- RGB border animation: Cycles cyan → magenta → yellow

## Best Practices

### Using Design Tokens

✅ **Do**:
```css
.button {
  padding: var(--space-4);
  color: var(--color-text-primary);
  transition: transform var(--duration-fast) var(--easing-out);
}
```

❌ **Don't**:
```css
.button {
  padding: 16px;
  color: #ffffff;
  transition: transform 150ms ease;
}
```

### Responsive Design

✅ **Do**: Use relative units and design tokens
```css
font-size: var(--font-size-base);
padding: var(--space-4);
```

❌ **Don't**: Use fixed pixel values
```css
font-size: 9px;
padding: 16px;
```

### Animations

✅ **Do**: Use design token durations and easings
```css
transition: opacity var(--duration-normal) var(--easing-out);
```

❌ **Don't**: Use arbitrary timing functions
```css
transition: opacity 0.2s ease-out;
```

## Maintenance

### Adding New Tokens

1. Add to `src/design/tokens.ts`
2. Update TypeScript types
3. Add to CSS variables in stylesheet
4. Document in this file
5. Update Storybook examples (if applicable)

### Token Naming Convention

```
--{category}-{property}-{variant}
```

Examples:
- `--color-primary-main`
- `--font-size-lg`
- `--space-4`
- `--shadow-text-base`

## Resources

- [Design Tokens Spec](https://design-tokens.github.io/community-group/)
- [Press Start 2P Font](https://fonts.google.com/specimen/Press+Start+2P)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
