# Visual Isolation Research

This directory contains the visual-piece-by-visual-piece comparison between
the **current Babylon.js + Reactylon** implementation and a **parallel
Three.js + WGSL** implementation.

The goal is **informed comparison material**, not a migration commitment.
We continue to ship the Babylon stack from `src/`. This directory adds an
isolated test harness for evaluating how each visual would look and feel
under the alternative stack.

## Layout

```
research/
├── README.md                     ← This file
├── INVENTORY.md                  ← Full catalog of visual pieces (master list)
├── visuals/                      ← One spec per visual piece
│   ├── 01-celestial-nebula.md
│   ├── 02-crystalline-cube.md
│   ├── 03-neon-raymarcher.md
│   ├── 04-post-process-corruption.md
│   ├── 05-atc-scanner.md
│   ├── 06-glass-sphere.md
│   ├── 07-industrial-platter.md
│   ├── 08-coherence-ring.md
│   ├── 09-keycaps.md
│   ├── 10-pattern-particles.md
│   ├── 11-sps-enemies.md
│   └── 12-shatter-particles.md
├── shaders/                      ← Standalone Three.js shader implementations
│   ├── celestial-nebula.ts
│   ├── crystalline-cube.ts
│   └── ...
├── __tests__/                    ← Vitest browser tests with screenshot capture
│   ├── shaders.browser.test.ts   ← Renders each Three implementation
│   └── babylon-baselines.browser.test.ts  ← Renders each Babylon original
├── screenshots/
│   ├── babylon/                  ← Captured baselines from current Babylon stack
│   └── three/                    ← Captured outputs from Three+WGSL stack
└── COMPARISON.md                 ← Side-by-side review with screenshots embedded
```

## Methodology

1. **Spec each piece**: read the current Babylon code and the design intent
   from `STANDARDS.md`, `docs/DESIGN.md`. Capture both "what it IS today" and
   "what it SHOULD be" in `visuals/NN-name.md`.

2. **Author isolated Three.js shader**: pure Three (no React, no full app).
   Lives in `shaders/`. Each file exports a function that takes a Three.js
   scene + uniforms object and returns a Mesh / Material / Pass.

3. **Capture screenshots**: Vitest browser mode renders each piece in a
   headless Chromium with real WebGL, takes a 512x512 PNG via the canvas
   `toBlob()` API, and saves to `screenshots/`. Both stacks render the same
   composition at the same uniform values so the visual delta is the only
   variable.

4. **Generate comparison**: `COMPARISON.md` references the screenshots
   side-by-side, plus code complexity (LOC), runtime perf (frame time at
   60-frame burst), and notes on what each stack does better / worse.

## Decision criteria

The point of this exercise: if Three+WGSL+post-processing produces visuals
that match or exceed Babylon at lower bundle / lower complexity, that's
strong evidence for migration. If they match but the cost is high, no
migration. If Three+WGSL falls short on specific pieces, those pieces stay
on Babylon and others migrate.

The decision is informed by data, not vibes.
