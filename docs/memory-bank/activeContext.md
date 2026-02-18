# Active Context — Cognitive Dissonance

## Current State (2026-02-18)

### Branch: `cursor/handoff-documentation-content-4fd6`

### Status: v2.0 COMPLETE

All 15 items from the Turn 164 "deep audit" are implemented. The game is feature-complete.

### What's Done

#### Foundation

- Next.js 16.1.6 + Turbopack + Babylon.js 8 + Reactylon 3.5.4
- React 19, TypeScript 5.9, Tailwind 4, Biome 2.4.1 (0 errors, 0 warnings)
- `pnpm build` passes (~14s), `pnpm dev` starts in 440ms

#### Core Gameplay

- **Per-color keycap matching**: 12 keycaps with unique HSL colors, seeded colorIndex matching
- **Pattern stabilization**: Escaping tendrils, per-color matching, coherence boost on success
- **Enemy spawner**: Yuka AI (seek, wander, zigzag, split), split children on death
- **Moment of clarity**: Coherence 100 → blue pulse, "COHERENCE MAINTAINED", entropy resumes
- **Glass sphere**: Celestial nebula shader, tension degradation, shatter particles
- **Restart ritual**: GSAP sphere recreation with emergence + emissive pulse

#### Visual Polish

- **Heavy industrial platter**: PBR metal, garage-door GSAP, dust particles, recess glow
- **"MAINTAIN COHERENCE" rim text**: DynamicTexture, emissive scales with tension
- **Diegetic coherence arc**: Two-layer tube display fills proportionally
- **Post-process corruption**: Chromatic aberration + noise + vignette + scanlines
- **SPS enemies**: SolidParticleSystem for dense wave visuals
- **Symmetric overlays**: Loading → Title → Gameplay → Game Over

#### Audio

- **Tone.js ambient score**: 4 seed-driven layers (drone, pads, glitch, chimes) evolving with tension
- **Spatial audio**: 3 procedural synth effects — pattern escape whoosh, stabilization chime, glass shatter

#### UI/UX

- **Loading screen**: "INITIALIZING CORE" with pulsing text
- **High score**: localStorage persistence, peak coherence + levels on game-over
- **Seed sharing**: "Share this dream" clipboard copy button
- **Accessibility**: ARIA live region, screen reader announcements, viewport meta
- **Mobile/touch**: 1.8x invisible touch targets, touch-action: none

#### Physics

- **Havok Physics V2**: @babylonjs/havok on keycaps (mass, restitution, damping)

#### Platform Scaffolds

- **Web**: Full Next.js app
- **Android/iOS**: native/App.tsx for Metro
- **XR**: xr-session.tsx stub with hand tracking

#### Testing

- **55 Vitest unit tests** — all passing
- **18 Playwright E2E tests** — all passing under xvfb-run
- **Governor**: 30s survival + 3 restart cycles stable

### What's Left (Future Work)

- Visual quality human eye-test in desktop browser
- XR hand tracking → keycap interaction wiring
- Accessibility: prefers-reduced-motion behavior in 3D components
### Release Planning

- Comprehensive production alignment plan: `docs/memory-bank/release-2.0-alignment-plan.md`

